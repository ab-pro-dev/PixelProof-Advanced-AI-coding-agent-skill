import json
from pathlib import Path
import subprocess
import sys
from PIL import Image

from pixelproof_image.report import run_comparison


def test_run_comparison_success(tmp_path: Path):
    """Successful comparison generates report, metrics, and all 3 artifact files."""
    ref_path = tmp_path / "ref_2x2.png"
    act_path = tmp_path / "act_2x2.png"
    out_dir = tmp_path / "out"

    Image.new("RGB", (2, 2), (0, 0, 0)).save(ref_path)
    act_img = Image.new("RGB", (2, 2), (0, 0, 0))
    act_img.putpixel((0, 0), (30, 60, 90))
    act_img.save(act_path)

    result = run_comparison("test-ref", ref_path, act_path, out_dir)

    assert result["status"] == "compared"
    assert result["referenceId"] == "test-ref"
    assert result["referenceSize"] == {"width": 2, "height": 2}
    assert result["actualSize"] == {"width": 2, "height": 2}
    assert result["metrics"]["mae"] == 15.0
    assert result["differingPixels"] == 1
    assert result["issues"] == []

    expected_artifacts = {
        "overlay": "comparison/test-ref-overlay.png",
        "diff": "comparison/test-ref-diff.png",
        "sideBySide": "comparison/test-ref-side-by-side.png",
    }
    assert result["artifacts"] == expected_artifacts

    comp_dir = out_dir / "comparison"
    assert (comp_dir / "test-ref-overlay.png").exists()
    assert (comp_dir / "test-ref-diff.png").exists()
    assert (comp_dir / "test-ref-side-by-side.png").exists()


def test_run_comparison_dimension_mismatch(tmp_path: Path):
    """Dimension mismatch returns failed status, sizes, no metrics/artifacts, and writes no files."""
    ref_path = tmp_path / "ref_4x4.png"
    act_path = tmp_path / "act_5x4.png"
    out_dir = tmp_path / "out_mismatch"

    Image.new("RGB", (4, 4), (0, 0, 0)).save(ref_path)
    Image.new("RGB", (5, 4), (0, 0, 0)).save(act_path)

    result = run_comparison("dim-mismatch", ref_path, act_path, out_dir)

    assert result["status"] == "failed"
    assert result["error"]["code"] == "dimension_mismatch"
    assert result["referenceSize"] == {"width": 4, "height": 4}
    assert result["actualSize"] == {"width": 5, "height": 4}
    assert "metrics" not in result
    assert "artifacts" not in result

    comp_dir = out_dir / "comparison"
    assert not comp_dir.exists() or len(list(comp_dir.iterdir())) == 0


def test_run_comparison_missing_reference_file(tmp_path: Path):
    """Missing reference file returns missing_file error with no metrics or artifacts."""
    nonexistent = tmp_path / "missing.png"
    act_path = tmp_path / "act.png"
    out_dir = tmp_path / "out_missing"
    Image.new("RGB", (2, 2), (0, 0, 0)).save(act_path)

    result = run_comparison("missing-ref", nonexistent, act_path, out_dir)

    assert result["status"] == "failed"
    assert result["error"]["code"] == "missing_file"
    assert "metrics" not in result
    assert "artifacts" not in result


def test_run_comparison_invalid_ids(tmp_path: Path):
    """Invalid reference IDs return invalid_reference_id and write nothing anywhere."""
    ref_path = tmp_path / "ref.png"
    act_path = tmp_path / "act.png"
    Image.new("RGB", (2, 2), (0, 0, 0)).save(ref_path)
    Image.new("RGB", (2, 2), (0, 0, 0)).save(act_path)

    invalid_ids = ["../evil", "a/b", "", "x" * 65]
    for idx, bad_id in enumerate(invalid_ids):
        out_dir = tmp_path / f"out_invalid_{idx}"
        result = run_comparison(bad_id, ref_path, act_path, out_dir)

        assert result["status"] == "failed"
        assert result["error"]["code"] == "invalid_reference_id"
        assert "metrics" not in result
        assert "artifacts" not in result
        assert not out_dir.exists() or len(list(out_dir.rglob("*"))) == 0


def test_run_comparison_existing_artifact_without_overwrite(tmp_path: Path):
    """Existing artifact without overwrite returns output_exists and leaves no partial files."""
    ref_path = tmp_path / "ref.png"
    act_path = tmp_path / "act.png"
    out_dir = tmp_path / "out_exists"

    Image.new("RGB", (2, 2), (0, 0, 0)).save(ref_path)
    Image.new("RGB", (2, 2), (0, 0, 0)).save(act_path)

    # Initial run with overwrite=False succeeds
    res1 = run_comparison("existing-test", ref_path, act_path, out_dir, overwrite=False)
    assert res1["status"] == "compared"

    # Second run with overwrite=False fails
    res2 = run_comparison("existing-test", ref_path, act_path, out_dir, overwrite=False)
    assert res2["status"] == "failed"
    assert res2["error"]["code"] == "output_exists"
    assert "metrics" not in res2
    assert "artifacts" not in res2

    # Test partial existing file cleanup
    comp_dir = out_dir / "comparison"
    # Pre-create only diff file for id 'partial-test'
    partial_diff = comp_dir / "partial-test-diff.png"
    partial_diff.write_bytes(b"EXISTING_DIFF_CONTENT")

    res_partial = run_comparison("partial-test", ref_path, act_path, out_dir, overwrite=False)
    assert res_partial["status"] == "failed"
    assert res_partial["error"]["code"] == "output_exists"

    # Overlay file must NOT have been left behind from this call
    partial_overlay = comp_dir / "partial-test-overlay.png"
    assert not partial_overlay.exists(), "Partial overlay should not exist after failed run"
    # The pre-existing file should remain intact
    assert partial_diff.read_bytes() == b"EXISTING_DIFF_CONTENT"


def test_cli_subprocess(tmp_path: Path):
    """CLI subprocess tests: exit 0 on success, exit 1 on failure, JSON-only stdout."""
    ref_path = tmp_path / "cli_ref.png"
    act_path = tmp_path / "cli_act.png"
    mismatch_act = tmp_path / "cli_mismatch.png"
    out_dir = tmp_path / "cli_out"

    Image.new("RGB", (4, 4), (0, 0, 0)).save(ref_path)
    Image.new("RGB", (4, 4), (10, 20, 30)).save(act_path)
    Image.new("RGB", (5, 4), (10, 20, 30)).save(mismatch_act)

    # 1. Success case: exit code 0
    cmd_success = [
        sys.executable,
        "-m",
        "pixelproof_image.cli",
        "compare",
        "--id",
        "cli-test",
        "--reference",
        str(ref_path),
        "--actual",
        str(act_path),
        "--out",
        str(out_dir),
    ]
    proc_success = subprocess.run(cmd_success, capture_output=True, text=True)
    assert proc_success.returncode == 0
    data_success = json.loads(proc_success.stdout)
    assert data_success["status"] == "compared"
    assert data_success["referenceId"] == "cli-test"
    assert "metrics" in data_success
    assert "artifacts" in data_success

    # 2. Dimension mismatch case: exit code 1
    cmd_mismatch = [
        sys.executable,
        "-m",
        "pixelproof_image.cli",
        "compare",
        "--id",
        "cli-mismatch",
        "--reference",
        str(ref_path),
        "--actual",
        str(mismatch_act),
        "--out",
        str(out_dir),
    ]
    proc_mismatch = subprocess.run(cmd_mismatch, capture_output=True, text=True)
    assert proc_mismatch.returncode == 1
    data_mismatch = json.loads(proc_mismatch.stdout)
    assert data_mismatch["status"] == "failed"
    assert data_mismatch["error"]["code"] == "dimension_mismatch"
    assert "metrics" not in data_mismatch
    assert "artifacts" not in data_mismatch
