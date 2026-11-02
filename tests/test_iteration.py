"""Tests for refinement iteration recording and delta calculation (pixelproof_image.iteration)."""

from __future__ import annotations

import copy
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import subprocess
import sys
import time
from typing import Any

import jsonschema
from PIL import Image
import pytest

from pixelproof_image.iteration import record_iteration
from pixelproof_image.report import run_comparison

REPO_ROOT = Path(__file__).resolve().parent.parent
ITERATION_SCHEMA_PATH = REPO_ROOT / "schemas" / "iteration-state.schema.json"


@pytest.fixture(scope="module")
def iteration_schema() -> dict[str, Any]:
    with open(ITERATION_SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _make_dummy_compared(ref_id: str, mae: float, diff_pixels: int) -> dict[str, Any]:
    return {
        "referenceId": ref_id,
        "status": "compared",
        "referenceSize": {"width": 100, "height": 80},
        "actualSize": {"width": 100, "height": 80},
        "metrics": {"mae": mae},
        "artifacts": {
            "overlay": f"comparison/{ref_id}-overlay.png",
            "diff": f"comparison/{ref_id}-diff.png",
            "sideBySide": f"comparison/{ref_id}-side-by-side.png",
        },
        "differingPixels": diff_pixels,
        "issues": [],
    }


def _make_dummy_failed(ref_id: str, error_code: str) -> dict[str, Any]:
    return {
        "referenceId": ref_id,
        "status": "failed",
        "error": {
            "code": error_code,
            "message": f"Error {error_code}",
        },
    }


def test_first_iteration_all_new(tmp_path: Path):
    """First iteration marks all references as new with remaining iterations computed."""
    state_dir = tmp_path / "state"
    run_results = [
        _make_dummy_compared("ref-1", 0.05, 50),
        _make_dummy_compared("ref-2", 0.12, 120),
    ]

    res = record_iteration(state_dir, run_results, max_iterations=5)
    assert res["status"] == "recorded"
    assert res["iteration"] == 1
    assert res["maxIterations"] == 5
    assert res["iterationsRemaining"] == 4
    assert res["overLimit"] is False
    assert res["deltas"] == {
        "ref-1": {"state": "new"},
        "ref-2": {"state": "new"},
    }

    state_file = state_dir / "iterations.json"
    assert state_file.exists()
    state_data = json.loads(state_file.read_text(encoding="utf-8"))
    assert state_data["version"] == 1
    assert state_data["maxIterations"] == 5
    assert len(state_data["iterations"]) == 1
    assert state_data["iterations"][0]["number"] == 1
    assert state_data["iterations"][0]["references"]["ref-1"]["status"] == "compared"
    assert state_data["iterations"][0]["references"]["ref-1"]["differingPixels"] == 50


def test_deltas_improved_worse_same(tmp_path: Path):
    """Subsequent iteration computes improved, worse, and same based on differingPixels."""
    state_dir = tmp_path / "state"

    # Iteration 1
    it1_results = [
        _make_dummy_compared("ref-imp", 0.10, 100),
        _make_dummy_compared("ref-worse", 0.05, 50),
        _make_dummy_compared("ref-same", 0.08, 80),
    ]
    res1 = record_iteration(state_dir, it1_results, max_iterations=5)
    assert res1["iteration"] == 1

    # Iteration 2
    it2_results = [
        _make_dummy_compared("ref-imp", 0.04, 40),      # 40 - 100 = -60 (< 0 -> improved)
        _make_dummy_compared("ref-worse", 0.15, 150),   # 150 - 50 = +100 (> 0 -> worse)
        _make_dummy_compared("ref-same", 0.08, 80),     # 80 - 80 = 0 (== 0 -> same)
    ]
    res2 = record_iteration(state_dir, it2_results, max_iterations=5)
    assert res2["status"] == "recorded"
    assert res2["iteration"] == 2
    assert res2["iterationsRemaining"] == 3

    deltas = res2["deltas"]
    assert deltas["ref-imp"]["state"] == "improved"
    assert deltas["ref-imp"]["pixelsDelta"] == -60
    assert math.isclose(deltas["ref-imp"]["maeDelta"], -0.06)

    assert deltas["ref-worse"]["state"] == "worse"
    assert deltas["ref-worse"]["pixelsDelta"] == 100
    assert math.isclose(deltas["ref-worse"]["maeDelta"], 0.10)

    assert deltas["ref-same"]["state"] == "same"
    assert deltas["ref-same"]["pixelsDelta"] == 0
    assert math.isclose(deltas["ref-same"]["maeDelta"], 0.0)


def test_deltas_compared_to_failed_and_recovered(tmp_path: Path):
    """Reference transitions between compared and failed produce 'failed' and 'recovered'."""
    state_dir = tmp_path / "state"

    # Iteration 1: ref-a compared, ref-b failed
    it1 = [
        _make_dummy_compared("ref-a", 0.05, 20),
        _make_dummy_failed("ref-b", "dimension_mismatch"),
    ]
    record_iteration(state_dir, it1, max_iterations=5)

    # Iteration 2: ref-a failed, ref-b compared
    it2 = [
        _make_dummy_failed("ref-a", "image_missing"),
        _make_dummy_compared("ref-b", 0.10, 50),
    ]
    res2 = record_iteration(state_dir, it2, max_iterations=5)

    assert res2["deltas"]["ref-a"] == {"state": "failed"}
    assert res2["deltas"]["ref-b"] == {"state": "recovered"}
    assert "pixelsDelta" not in res2["deltas"]["ref-a"]
    assert "pixelsDelta" not in res2["deltas"]["ref-b"]

    # Verify state file stores failed errorCode without fabricated metrics
    state_file = state_dir / "iterations.json"
    state_data = json.loads(state_file.read_text(encoding="utf-8"))
    ref_a_it2 = state_data["iterations"][1]["references"]["ref-a"]
    assert ref_a_it2["status"] == "failed"
    assert ref_a_it2["errorCode"] == "image_missing"
    assert "mae" not in ref_a_it2
    assert "differingPixels" not in ref_a_it2


def test_earlier_entries_byte_unchanged_after_append(tmp_path: Path):
    """Appending an iteration does not modify earlier iteration objects."""
    state_dir = tmp_path / "state"

    it1 = [_make_dummy_compared("ref-1", 0.1, 10)]
    record_iteration(state_dir, it1, max_iterations=5)

    state_file = state_dir / "iterations.json"
    data_after_1 = json.loads(state_file.read_text(encoding="utf-8"))
    it1_snapshot = copy.deepcopy(data_after_1["iterations"][0])

    time.sleep(0.01)

    it2 = [_make_dummy_compared("ref-1", 0.05, 5)]
    record_iteration(state_dir, it2, max_iterations=5)

    data_after_2 = json.loads(state_file.read_text(encoding="utf-8"))
    assert len(data_after_2["iterations"]) == 2
    assert data_after_2["iterations"][0] == it1_snapshot


def test_corrupt_state_returns_state_corrupt_and_file_unchanged(tmp_path: Path):
    """Corrupt state file returns state_corrupt and leaves file content untouched."""
    state_dir = tmp_path / "state"
    state_dir.mkdir(parents=True)
    state_file = state_dir / "iterations.json"
    corrupt_content = '{"version": 1, "iterations": [unparseable'
    state_file.write_text(corrupt_content, encoding="utf-8")

    res = record_iteration(state_dir, [_make_dummy_compared("ref-1", 0.1, 10)])
    assert res["status"] == "failed"
    assert res["error"]["code"] == "state_corrupt"
    assert state_file.read_text(encoding="utf-8") == corrupt_content


def test_invalid_manifest_leaves_state_untouched(tmp_path: Path):
    """CLI iterate on invalid manifest exits 1 and touches no state file."""
    manifest_path = tmp_path / "invalid_manifest.json"
    manifest_path.write_text(json.dumps({"version": 99, "references": []}), encoding="utf-8")

    out_dir = tmp_path / "out"
    cmd = [
        sys.executable,
        "-m",
        "pixelproof_image.cli",
        "iterate",
        "--manifest",
        str(manifest_path),
        "--actual-dir",
        str(tmp_path / "actuals"),
        "--out",
        str(out_dir),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    assert proc.returncode == 1
    output = json.loads(proc.stdout)
    assert output["status"] == "failed"
    assert output["error"]["code"] == "manifest_invalid"
    assert not (out_dir / "state" / "iterations.json").exists()


def test_max_iterations_mismatch_keeps_stored_value(tmp_path: Path):
    """Passing a different maxIterations to existing state preserves stored value and reports flag."""
    state_dir = tmp_path / "state"
    record_iteration(state_dir, [_make_dummy_compared("ref-1", 0.1, 10)], max_iterations=5)

    res = record_iteration(state_dir, [_make_dummy_compared("ref-1", 0.05, 5)], max_iterations=10)
    assert res["status"] == "recorded"
    assert res["maxIterations"] == 5
    assert res["maxIterationsIgnored"] is True

    state_file = state_dir / "iterations.json"
    data = json.loads(state_file.read_text(encoding="utf-8"))
    assert data["maxIterations"] == 5


def test_iteration_over_limit_reported_and_recorded(tmp_path: Path):
    """Iteration 6 on maxIterations 5 reports overLimit true and iterationsRemaining 0."""
    state_dir = tmp_path / "state"
    for i in range(1, 6):
        res = record_iteration(state_dir, [_make_dummy_compared("ref-1", 0.1, 10)], max_iterations=5)
        assert res["iteration"] == i
        assert res["overLimit"] is False

    res6 = record_iteration(state_dir, [_make_dummy_compared("ref-1", 0.1, 10)], max_iterations=5)
    assert res6["status"] == "recorded"
    assert res6["iteration"] == 6
    assert res6["iterationsRemaining"] == 0
    assert res6["overLimit"] is True

    state_file = state_dir / "iterations.json"
    data = json.loads(state_file.read_text(encoding="utf-8"))
    assert len(data["iterations"]) == 6


def test_state_file_validates_against_schema(iteration_schema: dict, tmp_path: Path):
    """State file with multiple iterations and mixed compared/failed references validates against schema."""
    state_dir = tmp_path / "state"
    record_iteration(
        state_dir,
        [
            _make_dummy_compared("ref-1", 0.05, 20),
            _make_dummy_failed("ref-2", "dimension_mismatch"),
        ],
        max_iterations=5,
    )
    record_iteration(
        state_dir,
        [
            _make_dummy_compared("ref-1", 0.02, 5),
            _make_dummy_compared("ref-2", 0.08, 30),
        ],
        max_iterations=5,
    )

    state_file = state_dir / "iterations.json"
    state_data = json.loads(state_file.read_text(encoding="utf-8"))
    jsonschema.validate(state_data, iteration_schema)


def test_timestamps_are_real_and_distinct(tmp_path: Path):
    """Timestamps are distinct, real clock ISO datetimes, not hardcoded constants."""
    state_dir = tmp_path / "state"
    for i in range(3):
        record_iteration(state_dir, [_make_dummy_compared("ref-1", 0.1, 10)], max_iterations=5)
        time.sleep(0.01)

    state_file = state_dir / "iterations.json"
    data = json.loads(state_file.read_text(encoding="utf-8"))
    timestamps = [it["timestamp"] for it in data["iterations"]]
    assert len(timestamps) == 3
    assert len(set(timestamps)) == 3

    for ts in timestamps:
        dt = datetime.fromisoformat(ts)
        assert dt.tzinfo is not None
        assert dt.year >= 2026
