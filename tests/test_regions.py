"""Tests for region-based comparison and measurement (pixelproof_image.regions)."""

from __future__ import annotations

import copy
import json
import math
from pathlib import Path
import subprocess
import sys

import jsonschema
import numpy as np
from PIL import Image
import pytest

from pixelproof_image.regions import (
    WeightsGridMismatchError,
    apply_weights,
    compute_regions,
    parse_grid,
    rank_regions,
    validate_region_weights,
)
from pixelproof_image.report import run_comparison

REPO_ROOT = Path(__file__).resolve().parent.parent
COMPARISON_REPORT_SCHEMA_PATH = REPO_ROOT / "schemas" / "comparison-report.schema.json"


@pytest.fixture(scope="module")
def report_schema() -> dict:
    with open(COMPARISON_REPORT_SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def test_tiles_exactly_property():
    """Verify that regions tile images exactly without gaps or overlaps."""
    cases = [
        (200, 160, 4, 4),    # evenly divisible
        (101, 77, 4, 4),     # non-divisible width and height
        (3, 3, 4, 4),        # image smaller than requested grid (clamps to 3x3)
        (2, 2, 4, 4),        # image smaller than requested grid (clamps to 2x2)
        (150, 100, 3, 5),    # rectangular grid
        (7, 13, 2, 3),       # prime dimensions
    ]

    for width, height, req_rows, req_cols in cases:
        ref = np.zeros((height, width, 3), dtype=np.uint8)
        act = np.zeros((height, width, 3), dtype=np.uint8)

        regions = compute_regions(ref, act, rows=req_rows, cols=req_cols)

        # Expected clamped rows/cols
        expected_rows = min(req_rows, height)
        expected_cols = min(req_cols, width)
        assert len(regions) == expected_rows * expected_cols

        # 1. Total area sum must match W * H exactly
        area_sum = sum(r["width"] * r["height"] for r in regions)
        assert area_sum == width * height, f"Area mismatch for {width}x{height} with {req_rows}x{req_cols}"

        # 2. Area fraction sum must equal 1.0 within float tolerance
        fraction_sum = sum(r["areaFraction"] for r in regions)
        assert math.isclose(fraction_sum, 1.0, rel_tol=1e-6)

        # 3. Exact coverage without gaps or overlaps
        coverage = np.zeros((height, width), dtype=np.int32)
        for r in regions:
            x, y, w, h = r["x"], r["y"], r["width"], r["height"]
            assert x >= 0 and y >= 0
            assert x + w <= width
            assert y + h <= height
            coverage[y : y + h, x : x + w] += 1

        assert np.all(coverage == 1), f"Coverage gap or overlap detected for {width}x{height}"


def test_differing_pixels_sum_equals_global_count():
    """Sum of region differingPixels must equal the global whole-image count."""
    height, width = 120, 160
    rng = np.random.default_rng(42)

    ref = rng.integers(0, 256, size=(height, width, 3), dtype=np.uint8)
    act = ref.copy()

    # Introduce differences in several places
    act[10:30, 20:50] = rng.integers(0, 256, size=(20, 30, 3), dtype=np.uint8)
    act[70:100, 80:140] = rng.integers(0, 256, size=(30, 60, 3), dtype=np.uint8)
    act[55, 55] = (act[55, 55].astype(np.int32) + 50) % 256

    global_diff_mask = np.any(ref != act, axis=-1)
    global_differing = int(np.sum(global_diff_mask))

    regions = compute_regions(ref, act, rows=4, cols=4)
    region_diff_sum = sum(r["differingPixels"] for r in regions)

    assert region_diff_sum == global_differing


def test_known_case_single_cell():
    """200x160 on 4x4 grid with one 10x10 block in cell (row 2, col 2)."""
    height, width = 160, 200
    ref = np.full((height, width, 3), 128, dtype=np.uint8)
    act = ref.copy()

    # Place 10x10 white block at x=130..139, y=90..99
    # On 4x4 grid: cells are 50x40.
    # x in [100, 149] -> col 2; y in [80, 119] -> row 2.
    act[90:100, 130:140] = 255

    regions = compute_regions(ref, act, rows=4, cols=4)
    assert len(regions) == 16

    target_region = None
    for r in regions:
        if r["row"] == 2 and r["col"] == 2:
            target_region = r
            assert r["differingPixels"] == 100
            assert r["width"] == 50
            assert r["height"] == 40
            assert math.isclose(r["diffRatio"], 100 / (50 * 40))
            # Channel difference per changed pixel is |255 - 128| = 127
            # MAE = 100 * (3 * 127) / (50 * 40 * 3) = 12700 / 2000 = 6.35
            assert math.isclose(r["mae"], 6.35, rel_tol=1e-5)
        else:
            assert r["differingPixels"] == 0
            assert r["diffRatio"] == 0.0
            assert r["mae"] == 0.0

    assert target_region is not None
    assert target_region["index"] == 2 * 4 + 2  # 10


def test_identical_images_all_zero():
    """Identical images must yield 0 differingPixels, 0.0 diffRatio, and 0.0 mae across all regions."""
    arr = np.full((80, 100, 3), 75, dtype=np.uint8)
    regions = compute_regions(arr, arr, rows=4, cols=4)
    assert len(regions) == 16
    for r in regions:
        assert r["differingPixels"] == 0
        assert r["diffRatio"] == 0.0
        assert r["mae"] == 0.0


def test_regions_absent_by_default(tmp_path: Path):
    """run_comparison without regions must not include 'regions' key."""
    p_ref = tmp_path / "ref.png"
    p_act = tmp_path / "act.png"
    out_dir = tmp_path / "out"

    Image.new("RGB", (50, 40), "blue").save(p_ref)
    Image.new("RGB", (50, 40), "blue").save(p_act)

    # 1. Default (regions=False)
    rep_default = run_comparison(
        reference_id="test_def",
        reference_path=p_ref,
        actual_path=p_act,
        output_dir=out_dir / "def",
        regions=False,
    )
    assert rep_default["status"] == "compared"
    assert "regions" not in rep_default

    # 2. Enabled (regions=True)
    rep_regions = run_comparison(
        reference_id="test_reg",
        reference_path=p_ref,
        actual_path=p_act,
        output_dir=out_dir / "reg",
        regions=True,
    )
    assert rep_regions["status"] == "compared"
    assert "regions" in rep_regions
    assert rep_regions["regions"]["grid"] == {"rows": 4, "cols": 4}
    assert len(rep_regions["regions"]["items"]) == 16


def test_invalid_grid_values_rejected(tmp_path: Path):
    """Invalid grid values like '0x4', 'abc', '4' must be rejected with invalid_grid."""
    invalid_grids = ["0x4", "abc", "4", "-1x4", "4x0", "4x", "x4", "0x0"]

    for bad_grid in invalid_grids:
        with pytest.raises(ValueError):
            parse_grid(bad_grid)

        # Python CLI invocation
        p_ref = tmp_path / "ref.png"
        p_act = tmp_path / "act.png"
        if not p_ref.exists():
            Image.new("RGB", (20, 20), "red").save(p_ref)
            Image.new("RGB", (20, 20), "red").save(p_act)

        res = subprocess.run(
            [
                sys.executable,
                "-m",
                "pixelproof_image.cli",
                "compare",
                "--id",
                "test-bad-grid",
                "--reference",
                str(p_ref),
                "--actual",
                str(p_act),
                "--out",
                str(tmp_path / "out_bad"),
                "--grid",
                bad_grid,
            ],
            capture_output=True,
            text=True,
        )
        assert res.returncode == 1
        output = json.loads(res.stdout)
        assert output["status"] == "failed"
        assert output["error"]["code"] == "invalid_grid"


def test_schema_accepts_regions_and_rejects_failed_with_regions(
    report_schema: dict, tmp_path: Path
):
    """Schema must accept valid report with regions, and reject failed report containing regions."""
    p_ref = tmp_path / "ref_schema.png"
    p_act = tmp_path / "act_schema.png"
    Image.new("RGB", (40, 40), "green").save(p_ref)
    Image.new("RGB", (40, 40), "red").save(p_act)

    rep = run_comparison(
        reference_id="schema_reg_test",
        reference_path=p_ref,
        actual_path=p_act,
        output_dir=tmp_path / "out_schema",
        regions=True,
        grid="2x2",
    )
    assert rep["status"] == "compared"
    assert "regions" in rep
    # Must validate against comparison-report schema
    jsonschema.validate(rep, report_schema)

    # Negative test: failed report with regions must be rejected
    bad_failed_report = {
        "referenceId": "fail_test",
        "status": "failed",
        "error": {"code": "some_error", "message": "Failed"},
        "regions": rep["regions"],
    }
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad_failed_report, report_schema)


def test_ranking_known_case():
    """(a) known case from Step 20 gives exactly one ranked entry, rank 1, index 10, score == 100 / (200*160) exactly as float."""
    height, width = 160, 200
    ref = np.full((height, width, 3), 128, dtype=np.uint8)
    act = ref.copy()
    act[90:100, 130:140] = 255  # 10x10 block in cell (row 2, col 2) -> index 10

    regions = compute_regions(ref, act, rows=4, cols=4)
    ranking = rank_regions(regions)

    assert len(ranking) == 1
    assert ranking[0] == {
        "rank": 1,
        "index": 10,
        "score": 100 / (200 * 160),
    }
    assert ranking[0]["score"] == 100 / (200 * 160)


def test_ranking_two_blocks_different_size():
    """(b) two blocks of different size in different cells rank the bigger-difference cell first."""
    height, width = 160, 200
    ref = np.full((height, width, 3), 128, dtype=np.uint8)
    act = ref.copy()

    # Cell 0 (row 0, col 0, [0:40, 0:50]): 10x10 block -> 100 differing pixels
    act[10:20, 10:20] = 255
    # Cell 5 (row 1, col 1, [40:80, 50:100]): 20x20 block -> 400 differing pixels
    act[45:65, 55:75] = 255

    regions = compute_regions(ref, act, rows=4, cols=4)
    ranking = rank_regions(regions)

    assert len(ranking) == 2
    # Cell 5 has bigger difference (score 400 / (200*160)) -> rank 1
    assert ranking[0]["rank"] == 1
    assert ranking[0]["index"] == 5
    assert ranking[0]["score"] == 400 / (200 * 160)

    # Cell 0 has smaller difference (score 100 / (200*160)) -> rank 2
    assert ranking[1]["rank"] == 2
    assert ranking[1]["index"] == 0
    assert ranking[1]["score"] == 100 / (200 * 160)


def test_ranking_tie_breaks_by_lower_index():
    """(c) tie case (two identical blocks in two cells) breaks by lower index."""
    height, width = 160, 200
    ref = np.full((height, width, 3), 128, dtype=np.uint8)
    act = ref.copy()

    # Cell 1 (row 0, col 1): 10x10 block -> 100 pixels
    act[10:20, 60:70] = 255
    # Cell 7 (row 1, col 3): 10x10 block -> 100 pixels
    act[50:60, 160:170] = 255

    regions = compute_regions(ref, act, rows=4, cols=4)
    ranking = rank_regions(regions)

    assert len(ranking) == 2
    assert ranking[0]["score"] == ranking[1]["score"]
    # Lower index breaks tie
    assert ranking[0]["rank"] == 1
    assert ranking[0]["index"] == 1
    assert ranking[1]["rank"] == 2
    assert ranking[1]["index"] == 7


def test_ranking_identical_images_empty():
    """(d) identical images give an empty ranking."""
    arr = np.full((80, 100, 3), 75, dtype=np.uint8)
    regions = compute_regions(arr, arr, rows=4, cols=4)
    ranking = rank_regions(regions)
    assert ranking == []


def test_ranking_scores_sum_equals_global_differing_ratio():
    """(e) scores sum equals globalDifferingPixels / (W*H) within 1e-12."""
    height, width = 160, 200
    rng = np.random.default_rng(999)
    ref = rng.integers(0, 256, size=(height, width, 3), dtype=np.uint8)
    act = ref.copy()

    act[10:30, 20:50] = rng.integers(0, 256, size=(20, 30, 3), dtype=np.uint8)
    act[70:100, 80:140] = rng.integers(0, 256, size=(30, 60, 3), dtype=np.uint8)
    act[110:130, 10:40] = rng.integers(0, 256, size=(20, 30, 3), dtype=np.uint8)

    regions = compute_regions(ref, act, rows=4, cols=4)
    ranking = rank_regions(regions)

    global_diff = int(np.sum(np.any(ref != act, axis=-1)))
    expected_ratio = global_diff / (width * height)

    scores_sum = sum(entry["score"] for entry in ranking)
    assert math.isclose(scores_sum, expected_ratio, abs_tol=1e-12)


def test_ranking_schema_accepts_and_rejects_zero(report_schema: dict, tmp_path: Path):
    """(f) schema accepts a real ranking and rejects score 0 or rank 0."""
    p_ref = tmp_path / "ref_rank.png"
    p_act = tmp_path / "act_rank.png"
    Image.new("RGB", (40, 40), "green").save(p_ref)
    act_img = Image.new("RGB", (40, 40), "green")
    for y in range(10):
        for x in range(10):
            act_img.putpixel((x, y), (255, 0, 0))
    act_img.save(p_act)

    rep = run_comparison(
        reference_id="schema_rank_test",
        reference_path=p_ref,
        actual_path=p_act,
        output_dir=tmp_path / "out_schema_rank",
        regions=True,
        grid="2x2",
    )
    assert rep["status"] == "compared"
    assert "regions" in rep
    assert "ranking" in rep["regions"]
    assert len(rep["regions"]["ranking"]) > 0

    # Real ranking accepted
    jsonschema.validate(rep, report_schema)

    # Reject score 0
    bad_score_rep = copy.deepcopy(rep)
    bad_score_rep["regions"]["ranking"][0]["score"] = 0
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad_score_rep, report_schema)

    # Reject rank 0
    bad_rank_rep = copy.deepcopy(rep)
    bad_rank_rep["regions"]["ranking"][0]["rank"] = 0
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad_rank_rep, report_schema)


def test_weights_all_ones_preserves_order(tmp_path: Path):
    """When all weights are 1.0, weighted ranking has the identical order as unweighted ranking."""
    p_ref = tmp_path / "ref.png"
    p_act = tmp_path / "act.png"
    # 200x160 with 4x4 grid (cells are 50x40)
    ref_img = Image.new("RGB", (200, 160), (128, 128, 128))
    act_img = Image.new("RGB", (200, 160), (128, 128, 128))
    # Cell 0 (x: 0..49, y: 0..39): 10x10 block -> 100 diff pixels
    for y in range(10):
        for x in range(10):
            act_img.putpixel((x, y), (255, 255, 255))
    # Cell 5 (x: 50..99, y: 40..79): 20x20 block -> 400 diff pixels
    for y in range(40, 60):
        for x in range(50, 70):
            act_img.putpixel((x, y), (255, 255, 255))
    ref_img.save(p_ref)
    act_img.save(p_act)

    all_ones_weights = {
        "grid": {"rows": 4, "cols": 4},
        "weights": [[1.0] * 4 for _ in range(4)],
    }

    rep = run_comparison(
        reference_id="test_all_ones",
        reference_path=p_ref,
        actual_path=p_act,
        output_dir=tmp_path / "out_all_ones",
        regions=True,
        grid="4x4",
        region_weights=all_ones_weights,
    )
    assert rep["status"] == "compared"
    unweighted = rep["regions"]["ranking"]
    weighted = rep["regions"]["weighted"]["ranking"]

    assert len(unweighted) == 2
    assert len(weighted) == 2
    assert [u["index"] for u in unweighted] == [w["index"] for w in weighted]
    for w in weighted:
        assert w["weight"] == 1.0


def test_weights_flip_ordering(tmp_path: Path):
    """Owner weights flip the order: small diff cell weighted 5.0 beats large diff cell weighted 1.0."""
    p_ref = tmp_path / "ref_flip.png"
    p_act = tmp_path / "act_flip.png"
    ref_img = Image.new("RGB", (200, 160), (128, 128, 128))
    act_img = Image.new("RGB", (200, 160), (128, 128, 128))
    # Cell 0 (index 0, row 0, col 0): 10x10 block = 100 pixels
    for y in range(10):
        for x in range(10):
            act_img.putpixel((x, y), (255, 255, 255))
    # Cell 5 (index 5, row 1, col 1): 20x20 block = 400 pixels
    for y in range(40, 60):
        for x in range(50, 70):
            act_img.putpixel((x, y), (255, 255, 255))
    ref_img.save(p_ref)
    act_img.save(p_act)

    weights_matrix = [[1.0] * 4 for _ in range(4)]
    weights_matrix[0][0] = 5.0  # cell 0 gets weight 5.0

    weights_data = {
        "grid": {"rows": 4, "cols": 4},
        "weights": weights_matrix,
    }

    rep = run_comparison(
        reference_id="test_flip",
        reference_path=p_ref,
        actual_path=p_act,
        output_dir=tmp_path / "out_flip",
        regions=True,
        grid="4x4",
        region_weights=weights_data,
    )
    assert rep["status"] == "compared"
    unweighted = rep["regions"]["ranking"]
    weighted = rep["regions"]["weighted"]["ranking"]

    # In unweighted ranking: cell 5 ranks 1st, cell 0 ranks 2nd
    assert unweighted[0]["index"] == 5
    assert math.isclose(unweighted[0]["score"], 0.0125)
    assert unweighted[1]["index"] == 0
    assert math.isclose(unweighted[1]["score"], 0.003125)

    # In weighted ranking: cell 0 ranks 1st (0.015625), cell 5 ranks 2nd (0.0125)
    assert weighted[0]["rank"] == 1
    assert weighted[0]["index"] == 0
    assert weighted[0]["weight"] == 5.0
    assert math.isclose(weighted[0]["weightedScore"], 0.015625)

    assert weighted[1]["rank"] == 2
    assert weighted[1]["index"] == 5
    assert weighted[1]["weight"] == 1.0
    assert math.isclose(weighted[1]["weightedScore"], 0.0125)


def test_weights_grid_mismatch(tmp_path: Path):
    """Weights grid mismatch causes WeightsGridMismatchError / weights_grid_mismatch error code."""
    p_ref = tmp_path / "ref_mismatch.png"
    p_act = tmp_path / "act_mismatch.png"
    Image.new("RGB", (200, 160), "black").save(p_ref)
    act = Image.new("RGB", (200, 160), "black")
    act.putpixel((0, 0), (255, 255, 255))
    act.save(p_act)

    # Comparison grid is 4x4, but weights grid is 3x4
    mismatched_weights = {
        "grid": {"rows": 3, "cols": 4},
        "weights": [[1.0] * 4 for _ in range(3)],
    }

    # Direct function call raises WeightsGridMismatchError
    with pytest.raises(WeightsGridMismatchError):
        items = compute_regions(np.zeros((160, 200, 3)), np.zeros((160, 200, 3)), rows=4, cols=4)
        items[0]["differingPixels"] = 1
        apply_weights(items, mismatched_weights, grid=(4, 4))

    # run_comparison returns failed report with weights_grid_mismatch
    rep = run_comparison(
        reference_id="mismatch_test",
        reference_path=p_ref,
        actual_path=p_act,
        output_dir=tmp_path / "out_mismatch",
        regions=True,
        grid="4x4",
        region_weights=mismatched_weights,
    )
    assert rep["status"] == "failed"
    assert rep["error"]["code"] == "weights_grid_mismatch"


def test_no_weights_no_weighted_key(tmp_path: Path):
    """Without weights provided, 'weighted' key is absent from regions output."""
    p_ref = tmp_path / "ref_noweights.png"
    p_act = tmp_path / "act_noweights.png"
    Image.new("RGB", (40, 40), "white").save(p_ref)
    Image.new("RGB", (40, 40), "black").save(p_act)

    rep = run_comparison(
        reference_id="no_weights",
        reference_path=p_ref,
        actual_path=p_act,
        output_dir=tmp_path / "out_noweights",
        regions=True,
        grid="2x2",
        region_weights=None,
    )
    assert rep["status"] == "compared"
    assert "regions" in rep
    assert "grid" in rep["regions"]
    assert "items" in rep["regions"]
    assert "ranking" in rep["regions"]
    assert "weighted" not in rep["regions"]


def test_weights_without_regions_fails(tmp_path: Path):
    """Providing weights without enabling --regions produces weights_require_regions error."""
    p_ref = tmp_path / "ref_noregon.png"
    p_act = tmp_path / "act_noregon.png"
    Image.new("RGB", (40, 40), "white").save(p_ref)
    Image.new("RGB", (40, 40), "black").save(p_act)

    weights_file = tmp_path / "weights.json"
    weights_data = {
        "grid": {"rows": 2, "cols": 2},
        "weights": [[1.0, 1.0], [1.0, 1.0]],
    }
    weights_file.write_text(json.dumps(weights_data), encoding="utf-8")

    # API call
    rep = run_comparison(
        reference_id="no_regions_api",
        reference_path=p_ref,
        actual_path=p_act,
        output_dir=tmp_path / "out_no_reg_api",
        regions=False,
        region_weights=weights_data,
    )
    assert rep["status"] == "failed"
    assert rep["error"]["code"] == "weights_require_regions"

    # CLI call
    cmd = [
        sys.executable,
        "-m",
        "pixelproof_image.cli",
        "compare",
        "--id",
        "no_regions_cli",
        "--reference",
        str(p_ref),
        "--actual",
        str(p_act),
        "--out",
        str(tmp_path / "out_no_reg_cli"),
        "--weights",
        str(weights_file),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    assert proc.returncode == 1
    cli_out = json.loads(proc.stdout)
    assert cli_out["status"] == "failed"
    assert cli_out["error"]["code"] == "weights_require_regions"


def test_invalid_weights_cli_cases(tmp_path: Path):
    """CLI exits 1 with invalid_weights_file for missing, unparseable, or invalid structure weights."""
    p_ref = tmp_path / "ref_inv.png"
    p_act = tmp_path / "act_inv.png"
    Image.new("RGB", (40, 40), "white").save(p_ref)
    Image.new("RGB", (40, 40), "black").save(p_act)

    # 1. Nonexistent file
    cmd_missing = [
        sys.executable,
        "-m",
        "pixelproof_image.cli",
        "compare",
        "--id",
        "inv_missing",
        "--reference",
        str(p_ref),
        "--actual",
        str(p_act),
        "--out",
        str(tmp_path / "out_missing"),
        "--regions",
        "--weights",
        str(tmp_path / "nonexistent.json"),
    ]
    proc = subprocess.run(cmd_missing, capture_output=True, text=True)
    assert proc.returncode == 1
    out = json.loads(proc.stdout)
    assert out["status"] == "failed"
    assert out["error"]["code"] == "invalid_weights_file"

    # 2. Corrupted JSON file
    bad_json = tmp_path / "bad.json"
    bad_json.write_text("{invalid json", encoding="utf-8")
    cmd_bad = [
        sys.executable,
        "-m",
        "pixelproof_image.cli",
        "compare",
        "--id",
        "inv_bad",
        "--reference",
        str(p_ref),
        "--actual",
        str(p_act),
        "--out",
        str(tmp_path / "out_bad"),
        "--regions",
        "--weights",
        str(bad_json),
    ]
    proc = subprocess.run(cmd_bad, capture_output=True, text=True)
    assert proc.returncode == 1
    out = json.loads(proc.stdout)
    assert out["status"] == "failed"
    assert out["error"]["code"] == "invalid_weights_file"

    # 3. Invalid weight value (> 10)
    bad_val = tmp_path / "bad_val.json"
    bad_val.write_text(json.dumps({"grid": {"rows": 2, "cols": 2}, "weights": [[11.0, 1.0], [1.0, 1.0]]}))
    cmd_val = [
        sys.executable,
        "-m",
        "pixelproof_image.cli",
        "compare",
        "--id",
        "inv_val",
        "--reference",
        str(p_ref),
        "--actual",
        str(p_act),
        "--out",
        str(tmp_path / "out_val"),
        "--regions",
        "--weights",
        str(bad_val),
    ]
    proc = subprocess.run(cmd_val, capture_output=True, text=True)
    assert proc.returncode == 1
    out = json.loads(proc.stdout)
    assert out["status"] == "failed"
    assert out["error"]["code"] == "invalid_weights_file"


def test_weights_schema_accepts_and_rejects(report_schema: dict, tmp_path: Path):
    """Schema accepts valid weighted ranking and rejects invalid weighted entries or failed reports with weighted."""
    p_ref = tmp_path / "ref_sch.png"
    p_act = tmp_path / "act_sch.png"
    Image.new("RGB", (40, 40), "green").save(p_ref)
    act_img = Image.new("RGB", (40, 40), "green")
    act_img.putpixel((5, 5), (255, 0, 0))
    act_img.save(p_act)

    weights_data = {
        "grid": {"rows": 2, "cols": 2},
        "weights": [[2.0, 1.0], [1.0, 1.0]],
    }

    rep = run_comparison(
        reference_id="schema_weighted_test",
        reference_path=p_ref,
        actual_path=p_act,
        output_dir=tmp_path / "out_schema_w",
        regions=True,
        grid="2x2",
        region_weights=weights_data,
    )
    assert rep["status"] == "compared"
    assert "weighted" in rep["regions"]

    # Valid weighted report passes
    jsonschema.validate(rep, report_schema)

    # Reject failed report keeping "regions" (and thus "weighted")
    failed_rep = copy.deepcopy(rep)
    failed_rep["status"] = "failed"
    failed_rep["error"] = {"code": "some_err", "message": "msg"}
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(failed_rep, report_schema)

    # Reject weight > 10 (e.g. 10.5)
    bad_w = copy.deepcopy(rep)
    bad_w["regions"]["weighted"]["ranking"][0]["weight"] = 10.5
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad_w, report_schema)

    # Reject weight <= 0
    bad_w0 = copy.deepcopy(rep)
    bad_w0["regions"]["weighted"]["ranking"][0]["weight"] = 0
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad_w0, report_schema)

    # Reject rank < 1
    bad_rk = copy.deepcopy(rep)
    bad_rk["regions"]["weighted"]["ranking"][0]["rank"] = 0
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad_rk, report_schema)

    # Reject R = 1.0 (R must be null)
    bad_r = copy.deepcopy(rep)
    bad_r["regions"]["weighted"]["ranking"][0]["factors"]["R"] = 1.0
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad_r, report_schema)

    # Reject priorityScore <= 0
    bad_p0 = copy.deepcopy(rep)
    bad_p0["regions"]["weighted"]["ranking"][0]["priorityScore"] = 0
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad_p0, report_schema)


def test_priority_score_and_factors(tmp_path: Path):
    """Verify priorityScore == weightedScore, priorityScore == A*S*V, R is None, and absent without weights."""
    p_ref, p_act = tmp_path / "ref_p.png", tmp_path / "act_p.png"
    Image.new("RGB", (20, 20), "red").save(p_ref)
    act = Image.new("RGB", (20, 20), "red")
    act.putpixel((0, 0), (0, 255, 0))
    act.save(p_act)
    w_data = {"grid": {"rows": 2, "cols": 2}, "weights": [[5.0, 1.0], [1.0, 1.0]]}
    rep_w = run_comparison("pw", p_ref, p_act, tmp_path / "ow", regions=True, grid="2x2", region_weights=w_data)
    assert rep_w["status"] == "compared"
    item = rep_w["regions"]["weighted"]["ranking"][0]
    assert item["priorityScore"] == item["weightedScore"]
    assert item["factors"]["R"] is None
    assert math.isclose(item["priorityScore"], item["factors"]["A"] * item["factors"]["S"] * item["factors"]["V"], abs_tol=1e-15)
    rep_u = run_comparison("pu", p_ref, p_act, tmp_path / "ou", regions=True, grid="2x2")
    assert "weighted" not in rep_u["regions"]
    assert "priorityScore" not in json.dumps(rep_u)
    assert "factors" not in json.dumps(rep_u)



