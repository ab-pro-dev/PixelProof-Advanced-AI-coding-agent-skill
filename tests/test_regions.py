"""Tests for region-based comparison and measurement (pixelproof_image.regions)."""

from __future__ import annotations

import json
import math
from pathlib import Path
import subprocess
import sys

import jsonschema
import numpy as np
from PIL import Image
import pytest

from pixelproof_image.regions import compute_regions, parse_grid
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
