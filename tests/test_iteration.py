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

import hashlib
import jsonschema
from PIL import Image
import pytest

from pixelproof_image.iteration import evaluate_progress, record_iteration
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


def _build_state(
    iterations_refs: list[dict[str, Any]],
    max_iterations: int = 5,
) -> dict[str, Any]:
    return {
        "version": 1,
        "maxIterations": max_iterations,
        "iterations": [
            {
                "number": i + 1,
                "timestamp": f"2026-11-02T12:0{i}:00Z",
                "references": refs,
            }
            for i, refs in enumerate(iterations_refs)
        ],
    }


def _ref_comp(diff_pixels: int, mae: float = 0.1) -> dict[str, Any]:
    return {"status": "compared", "mae": mae, "differingPixels": diff_pixels}


def _ref_fail(code: str = "dimension_mismatch") -> dict[str, Any]:
    return {"status": "failed", "errorCode": code}


def test_progress_totals_decreasing():
    """Decreasing differing pixels totals indicate progress: not stalled, reason null."""
    state = _build_state([
        {"ref": _ref_comp(400)},
        {"ref": _ref_comp(200)},
        {"ref": _ref_comp(100)},
    ])
    res = evaluate_progress(state, stall_window=2)
    assert res["totalDifferingPixels"] == [400, 200, 100]
    assert res["stalled"] is False
    assert res["stopReason"] is None
    assert res["stopIsSuccess"] is False


def test_progress_totals_400_400_400():
    """Constant differing pixels across 3 iterations trigger stall condition and reason stalled."""
    state = _build_state([
        {"ref": _ref_comp(400)},
        {"ref": _ref_comp(400)},
        {"ref": _ref_comp(400)},
    ])
    res = evaluate_progress(state, stall_window=2)
    assert res["totalDifferingPixels"] == [400, 400, 400]
    assert res["stalled"] is True
    assert res["stopReason"] == "stalled"
    assert res["stopIsSuccess"] is False


def test_progress_boundary_stall_window_2():
    """Boundary test for stall_window=2: needs stall_window+1 (3) iterations of history.

    400,100,100 has 2 comparisons: 400->100 decreased, 100->100 did not. Only 1 non-decreasing
    transition, so stall_window=2 is NOT stalled.
    400,100,100,100 has 3 comparisons: 400->100 decreased, 100->100 and 100->100 did not.
    The last 2 transitions did not decrease, so stall_window=2 IS stalled.
    """
    state_4 = _build_state([
        {"ref": _ref_comp(400)},
        {"ref": _ref_comp(100)},
        {"ref": _ref_comp(100)},
        {"ref": _ref_comp(100)},
    ])
    res_4 = evaluate_progress(state_4, stall_window=2)
    assert res_4["stalled"] is True
    assert res_4["stopReason"] == "stalled"

    state_3 = _build_state([
        {"ref": _ref_comp(400)},
        {"ref": _ref_comp(100)},
        {"ref": _ref_comp(100)},
    ])
    res_3 = evaluate_progress(state_3, stall_window=2)
    assert res_3["stalled"] is False
    assert res_3["stopReason"] is None

    # Boundary check with stall_window=1 on 3 iterations (only 1 non-decreasing transition needed)
    res_3_w1 = evaluate_progress(state_3, stall_window=1)
    assert res_3_w1["stalled"] is True
    assert res_3_w1["stopReason"] == "stalled"


def test_progress_all_zero_no_differences():
    """All-zero differing pixels evaluates to no_differences, stalled remains false."""
    state = _build_state([
        {"ref": _ref_comp(0)},
        {"ref": _ref_comp(0)},
        {"ref": _ref_comp(0)},
    ])
    res = evaluate_progress(state, stall_window=2)
    assert res["totalDifferingPixels"] == [0, 0, 0]
    assert res["stalled"] is False
    assert res["stopReason"] == "no_differences"
    assert res["stopIsSuccess"] is False


def test_progress_precedence_matrix():
    """Stop reason precedence matrix: blocked > no_differences > limit_reached > stalled > null."""
    # 1. blocked beats limit_reached (iter 5 of 5, one ref failed)
    s_blocked_limit = _build_state(
        [{"ref-1": _ref_comp(100)}] * 4 + [{"ref-1": _ref_fail("dimension_mismatch")}],
        max_iterations=5,
    )
    r1 = evaluate_progress(s_blocked_limit)
    assert r1["stopReason"] == "blocked"

    # 2. no_differences beats limit_reached (iter 5 of 5, all zero diffs)
    s_nodiff_limit = _build_state(
        [{"ref-1": _ref_comp(100)}] * 4 + [{"ref-1": _ref_comp(0)}],
        max_iterations=5,
    )
    r2 = evaluate_progress(s_nodiff_limit)
    assert r2["stopReason"] == "no_differences"

    # 3. limit_reached beats stalled (iter 5 of 5, totals constant 400)
    s_limit_stalled = _build_state(
        [{"ref-1": _ref_comp(400)}] * 5,
        max_iterations=5,
    )
    r3 = evaluate_progress(s_limit_stalled)
    assert r3["stalled"] is True
    assert r3["stopReason"] == "limit_reached"

    # 4. blocked beats stalled
    s_blocked_stalled = _build_state(
        [{"ref-1": _ref_comp(400)}, {"ref-1": _ref_comp(400)}, {"ref-1": _ref_fail()}],
        max_iterations=5,
    )
    r4 = evaluate_progress(s_blocked_stalled)
    assert r4["stopReason"] == "blocked"

    # 5. limit_reached alone (iter 5 of 5, decreasing totals)
    s_limit_alone = _build_state(
        [{"ref-1": _ref_comp(500 - i * 50)} for i in range(5)],
        max_iterations=5,
    )
    r5 = evaluate_progress(s_limit_alone)
    assert r5["stalled"] is False
    assert r5["stopReason"] == "limit_reached"

    # 6. stalled alone (iter 3 of 5, totals constant)
    s_stalled_alone = _build_state(
        [{"ref-1": _ref_comp(400)}] * 3,
        max_iterations=5,
    )
    r6 = evaluate_progress(s_stalled_alone)
    assert r6["stalled"] is True
    assert r6["stopReason"] == "stalled"

    # 7. no_differences alone (iter 2 of 5, zero diffs)
    s_nodiff_alone = _build_state(
        [{"ref-1": _ref_comp(400)}, {"ref-1": _ref_comp(0)}],
        max_iterations=5,
    )
    r7 = evaluate_progress(s_nodiff_alone)
    assert r7["stalled"] is False
    assert r7["stopReason"] == "no_differences"


def test_progress_regression_worse():
    """Increased differing pixels between previous and latest iteration is recorded as kind worse."""
    state = _build_state([
        {"ref-1": _ref_comp(100), "ref-2": _ref_comp(50)},
        {"ref-1": _ref_comp(150), "ref-2": _ref_comp(40)},
    ])
    res = evaluate_progress(state)
    assert res["regressions"] == [
        {"id": "ref-1", "kind": "worse", "pixelsDelta": 50}
    ]


def test_progress_regression_failed():
    """Reference compared previously but failed in latest iteration is recorded as kind failed."""
    state = _build_state([
        {"ref-1": _ref_comp(100)},
        {"ref-1": _ref_fail("dimension_mismatch")},
    ])
    res = evaluate_progress(state)
    assert res["regressions"] == [
        {"id": "ref-1", "kind": "failed"}
    ]


def test_progress_stop_is_success_always_false():
    """stopIsSuccess is ALWAYS false across all states and stop reasons (spec §8.4 contract)."""
    states = [
        _build_state([]),
        _build_state([{"ref": _ref_comp(100)}]),
        _build_state([{"ref": _ref_comp(400)}] * 3),
        _build_state([{"ref": _ref_comp(100)}] * 5, max_iterations=5),
        _build_state([{"ref": _ref_comp(100)}, {"ref": _ref_fail()}]),
        _build_state([{"ref": _ref_comp(100)}, {"ref": _ref_comp(0)}]),
    ]
    for s in states:
        res = evaluate_progress(s)
        assert res["stopIsSuccess"] is False


def test_progress_no_forbidden_words():
    """Ensure no string value in evaluate_progress output contains complete, success, or done."""
    states = [
        _build_state([]),
        _build_state([{"ref": _ref_comp(100)}]),
        _build_state([{"ref": _ref_comp(400)}] * 3),
        _build_state([{"ref": _ref_comp(100)}] * 5, max_iterations=5),
        _build_state([{"ref": _ref_comp(100)}, {"ref": _ref_fail()}]),
        _build_state([{"ref": _ref_comp(100)}, {"ref": _ref_comp(0)}]),
    ]

    def _extract_strings(obj: Any) -> list[str]:
        strs = []
        if isinstance(obj, str):
            strs.append(obj)
        elif isinstance(obj, dict):
            for v in obj.values():
                strs.extend(_extract_strings(v))
        elif isinstance(obj, list):
            for item in obj:
                strs.extend(_extract_strings(item))
        return strs

    forbidden = {"complete", "success", "done"}
    for s in states:
        res = evaluate_progress(s)
        for s_val in _extract_strings(res):
            for word in forbidden:
                assert word not in s_val.lower(), f"Forbidden word {word!r} found in {s_val!r}"


def test_progress_cli_read_only_sha256(tmp_path: Path):
    """CLI progress command is strictly read-only: state file sha256 is identical before and after."""
    state_file = tmp_path / "iterations.json"
    state_content = json.dumps(_build_state([{"ref": _ref_comp(400)}] * 3), indent=2) + "\n"
    state_file.write_text(state_content, encoding="utf-8")

    sha_before = hashlib.sha256(state_file.read_bytes()).hexdigest()

    proc = subprocess.run(
        [sys.executable, "-m", "pixelproof_image.cli", "progress", "--state", str(state_file)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0
    parsed = json.loads(proc.stdout)
    assert parsed["stalled"] is True
    assert parsed["stopReason"] == "stalled"

    sha_after = hashlib.sha256(state_file.read_bytes()).hexdigest()
    assert sha_before == sha_after


def test_progress_cli_invalid_stall_window(tmp_path: Path):
    """CLI progress rejects non-integer or < 1 stall-window values with invalid_stall_window."""
    state_file = tmp_path / "iterations.json"
    state_file.write_text(json.dumps(_build_state([{"ref": _ref_comp(100)}])), encoding="utf-8")

    for bad_win in ["0", "-1", "abc", "1.5"]:
        proc = subprocess.run(
            [
                sys.executable,
                "-m",
                "pixelproof_image.cli",
                "progress",
                "--state",
                str(state_file),
                "--stall-window",
                bad_win,
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        assert proc.returncode == 1
        parsed = json.loads(proc.stdout)
        assert parsed["status"] == "failed"
        assert parsed["error"]["code"] == "invalid_stall_window"


def test_progress_cli_missing_and_corrupt_state(tmp_path: Path):
    """CLI progress returns state_missing for nonexistent file, and state_corrupt for invalid content."""
    # 1. Missing state file
    proc_missing = subprocess.run(
        [
            sys.executable,
            "-m",
            "pixelproof_image.cli",
            "progress",
            "--state",
            str(tmp_path / "nonexistent.json"),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc_missing.returncode == 1
    p_miss = json.loads(proc_missing.stdout)
    assert p_miss["error"]["code"] == "state_missing"

    # 2. Corrupt JSON
    corrupt_file = tmp_path / "corrupt.json"
    corrupt_file.write_text("not json {{{", encoding="utf-8")
    proc_corrupt = subprocess.run(
        [
            sys.executable,
            "-m",
            "pixelproof_image.cli",
            "progress",
            "--state",
            str(corrupt_file),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc_corrupt.returncode == 1
    p_corr = json.loads(proc_corrupt.stdout)
    assert p_corr["error"]["code"] == "state_corrupt"

    # 3. Invalid state structure (version != 1)
    invalid_ver = tmp_path / "invalid_ver.json"
    invalid_ver.write_text(json.dumps({"version": 99, "iterations": []}), encoding="utf-8")
    proc_ver = subprocess.run(
        [
            sys.executable,
            "-m",
            "pixelproof_image.cli",
            "progress",
            "--state",
            str(invalid_ver),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc_ver.returncode == 1
    p_ver = json.loads(proc_ver.stdout)
    assert p_ver["error"]["code"] == "state_corrupt"


def test_iterate_includes_progress_object(iteration_schema: dict, tmp_path: Path):
    """iterate output includes valid progress object matching the schema contract."""
    state_dir = tmp_path / "state"
    res1 = record_iteration(
        state_dir,
        [_make_dummy_compared("ref-1", 0.05, 20)],
        max_iterations=5,
    )
    assert "progress" in res1
    assert res1["progress"]["totalDifferingPixels"] == [20]
    assert res1["progress"]["stopIsSuccess"] is False

    # Check that state file still validates with schema
    state_file = state_dir / "iterations.json"
    state_data = json.loads(state_file.read_text(encoding="utf-8"))
    jsonschema.validate(state_data, iteration_schema)

    # Check that state data with progress embedded also validates with schema
    state_data_with_prog = copy.deepcopy(state_data)
    state_data_with_prog["progress"] = res1["progress"]
    jsonschema.validate(state_data_with_prog, iteration_schema)
