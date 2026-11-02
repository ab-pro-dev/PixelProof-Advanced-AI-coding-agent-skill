"""PixelProof iteration tracking and delta calculation.

AGENT PROPOSAL: Proposed iteration state schema, delta calculation rules,
and status names ("recorded", "improved", "same", "worse", "recovered", "failed", "new")
pending open architectural questions Q1 and Q8.

Tracks refinement iterations (§8.1, §8.3, §19 Phase 3) by appending iteration evidence
to an atomic state file (iterations.json) and measuring progress (MAE and differing pixels)
relative to the previous iteration.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile
from typing import Any, Union


def record_iteration(
    state_dir: Union[str, os.PathLike],
    run_results: list[dict[str, Any]],
    max_iterations: int = 5,
    overwrite: bool = False,
) -> dict[str, Any]:
    """Record one refinement iteration and compute deltas vs the previous iteration.

    Args:
        state_dir: Directory where iterations.json is stored.
        run_results: List of run_comparison outputs (compared or failed), one per reference.
        max_iterations: Maximum allowed iterations (stored in state; not enforced as a stop here).
        overwrite: Unused flag matching CLI conventions; earlier iterations are never overwritten.

    Returns:
        Result dictionary containing:
        - "status": "recorded" (or "failed" on error)
        - "iteration": Current iteration number (1-based)
        - "maxIterations": Configured maximum iterations
        - "iterationsRemaining": Remaining iterations (max(0, maxIterations - iteration))
        - "overLimit": Boolean indicating whether iteration > maxIterations
        - "deltas": Dictionary of per-reference delta metrics vs previous iteration
        - Optionally "maxIterationsIgnored": True if passed max_iterations differed from stored state.
    """
    state_dir_path = Path(state_dir)
    state_file = state_dir_path / "iterations.json"

    stored_max = max_iterations
    max_iterations_ignored = False
    iterations_list: list[dict[str, Any]] = []

    if state_file.exists():
        try:
            with open(state_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as err:
            return {
                "status": "failed",
                "error": {
                    "code": "state_corrupt",
                    "message": f"State file {state_file} is corrupt or unparseable: {err}",
                },
            }

        if (
            not isinstance(data, dict)
            or data.get("version") != 1
            or not isinstance(data.get("iterations"), list)
        ):
            return {
                "status": "failed",
                "error": {
                    "code": "state_corrupt",
                    "message": f"State file {state_file} has invalid structure or unsupported version",
                },
            }

        stored_max = data.get("maxIterations", max_iterations)
        if max_iterations != stored_max:
            max_iterations_ignored = True

        iterations_list = data["iterations"]

    number = len(iterations_list) + 1
    timestamp = datetime.now(timezone.utc).isoformat()

    # Parse run_results into per-reference status and metrics
    curr_refs: dict[str, Any] = {}
    for res in run_results:
        ref_id = res.get("referenceId", "unknown")
        status = res.get("status")
        if status == "compared":
            curr_refs[ref_id] = {
                "status": "compared",
                "mae": float(res["metrics"]["mae"]),
                "differingPixels": int(res["differingPixels"]),
            }
        else:
            err = res.get("error", {})
            code = err.get("code") if isinstance(err, dict) else str(err)
            curr_refs[ref_id] = {
                "status": "failed",
                "errorCode": code or "unknown_error",
            }

    new_iteration_entry = {
        "number": number,
        "timestamp": timestamp,
        "references": curr_refs,
    }

    # Compute deltas vs previous iteration only
    deltas: dict[str, Any] = {}
    prev_refs: dict[str, Any] | None = (
        iterations_list[-1].get("references") if iterations_list else None
    )

    for ref_id, curr_info in curr_refs.items():
        if prev_refs is None or ref_id not in prev_refs:
            deltas[ref_id] = {"state": "new"}
        else:
            prev_info = prev_refs[ref_id]
            prev_status = prev_info.get("status")
            curr_status = curr_info.get("status")

            if prev_status == "compared" and curr_status == "failed":
                deltas[ref_id] = {"state": "failed"}
            elif prev_status == "failed" and curr_status == "compared":
                deltas[ref_id] = {"state": "recovered"}
            elif prev_status == "failed" and curr_status == "failed":
                deltas[ref_id] = {"state": "failed"}
            else:
                curr_pixels = curr_info["differingPixels"]
                prev_pixels = prev_info["differingPixels"]
                pixels_delta = curr_pixels - prev_pixels
                mae_delta = float(curr_info["mae"] - prev_info["mae"])

                if pixels_delta < 0:
                    delta_state = "improved"
                elif pixels_delta > 0:
                    delta_state = "worse"
                else:
                    delta_state = "same"

                deltas[ref_id] = {
                    "state": delta_state,
                    "maeDelta": mae_delta,
                    "pixelsDelta": pixels_delta,
                }

    # Atomic write to state file
    state_dir_path.mkdir(parents=True, exist_ok=True)
    state_doc = {
        "version": 1,
        "maxIterations": stored_max,
        "iterations": iterations_list + [new_iteration_entry],
    }

    tmp_fd, tmp_file = tempfile.mkstemp(
        dir=state_dir_path,
        prefix="iterations_",
        suffix=".tmp",
    )
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
            json.dump(state_doc, f, indent=2)
            f.write("\n")
        os.replace(tmp_file, state_file)
    except Exception:
        if os.path.exists(tmp_file):
            try:
                os.unlink(tmp_file)
            except OSError:
                pass
        raise

    remaining = max(0, stored_max - number)
    over_limit = number > stored_max

    result: dict[str, Any] = {
        "status": "recorded",
        "iteration": number,
        "maxIterations": stored_max,
        "iterationsRemaining": remaining,
        "overLimit": over_limit,
        "deltas": deltas,
    }
    if max_iterations_ignored:
        result["maxIterationsIgnored"] = True

    return result
