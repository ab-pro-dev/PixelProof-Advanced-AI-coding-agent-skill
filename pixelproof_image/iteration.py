"""PixelProof iteration tracking, delta calculation, and progress evaluation.

AGENT PROPOSAL: Proposed iteration state schema, delta calculation rules,
stall detection window (default: 2), regression tracking rules, and stop reasons
("blocked", "no_differences", "limit_reached", "stalled") pending open architectural questions Q1 and Q8.

Tracks refinement iterations (§8.1, §8.3, §19 Phase 3) by appending iteration evidence
to an atomic state file (iterations.json), measuring progress (MAE and differing pixels)
relative to the previous iteration, and evaluating stop reasons (§8.4).
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
    progress_eval = evaluate_progress(state_doc, stall_window=2)

    result: dict[str, Any] = {
        "status": "recorded",
        "iteration": number,
        "maxIterations": stored_max,
        "iterationsRemaining": remaining,
        "overLimit": over_limit,
        "deltas": deltas,
        "progress": progress_eval,
    }
    if max_iterations_ignored:
        result["maxIterationsIgnored"] = True

    return result


def evaluate_progress(
    state: dict[str, Any],
    stall_window: int = 2,
) -> dict[str, Any]:
    """Evaluate refinement progress, regressions, stall condition, and stop reasons.

    AGENT PROPOSAL: Stall detection window (N=2), regression tracking rules,
    and stop reasons ("blocked", "no_differences", "limit_reached", "stalled")
    are proposals pending open questions Q1 and Q8.

    Args:
        state: Parsed dictionary from iterations.json.
        stall_window: Number of consecutive non-decreasing transitions required to trigger stalled (default: 2).

    Returns:
        Dictionary containing:
        - "totalDifferingPixels": List of per-iteration total differing pixels over COMPARED references only.
        - "regressions": List of regression entries for the latest iteration vs previous:
          [{"id": str, "kind": "worse" | "failed", ["pixelsDelta": int]}].
        - "stalled": Boolean indicating if total did not decrease for at least stall_window consecutive iterations.
        - "stallWindow": Configured stall window integer.
        - "stopReason": Precedence-evaluated reason string or None.
        - "stopIsSuccess": Always False (spec §8.4: stop condition is not a success condition).
    """
    if not isinstance(state, dict):
        raise ValueError("state must be a dictionary")
    if not isinstance(stall_window, int) or isinstance(stall_window, bool) or stall_window < 1:
        raise ValueError(f"stall_window must be an integer >= 1, got {stall_window!r}")

    iterations = state.get("iterations", [])
    max_iterations = state.get("maxIterations", 5)

    totals: list[int] = []
    for it in iterations:
        refs = it.get("references", {})
        tot = sum(
            r["differingPixels"]
            for r in refs.values()
            if r.get("status") == "compared" and "differingPixels" in r
        )
        totals.append(tot)

    regressions: list[dict[str, Any]] = []
    if len(iterations) >= 2:
        prev_refs = iterations[-2].get("references", {})
        curr_refs = iterations[-1].get("references", {})

        for ref_id in sorted(curr_refs.keys()):
            curr_info = curr_refs[ref_id]
            if ref_id in prev_refs:
                prev_info = prev_refs[ref_id]
                p_st = prev_info.get("status")
                c_st = curr_info.get("status")

                if p_st == "compared" and c_st == "failed":
                    regressions.append({"id": ref_id, "kind": "failed"})
                elif p_st == "compared" and c_st == "compared":
                    c_pix = curr_info.get("differingPixels", 0)
                    p_pix = prev_info.get("differingPixels", 0)
                    pix_delta = c_pix - p_pix
                    if pix_delta > 0:
                        regressions.append({
                            "id": ref_id,
                            "kind": "worse",
                            "pixelsDelta": pix_delta,
                        })

    stalled = False
    if len(totals) >= stall_window + 1:
        window_totals = totals[-(stall_window + 1):]
        if not all(t == 0 for t in window_totals):
            stalled = all(
                window_totals[i] >= window_totals[i - 1]
                for i in range(1, len(window_totals))
            )

    stop_reason: str | None = None
    if iterations:
        latest_it = iterations[-1]
        latest_refs = latest_it.get("references", {})
        latest_num = latest_it.get("number", len(iterations))
        latest_total = totals[-1]

        # Reason precedence: blocked > no_differences > limit_reached > stalled > null
        any_failed = any(r.get("status") != "compared" for r in latest_refs.values())
        if any_failed:
            stop_reason = "blocked"
        elif latest_refs and all(r.get("status") == "compared" for r in latest_refs.values()) and latest_total == 0:
            stop_reason = "no_differences"
        elif latest_num >= max_iterations:
            stop_reason = "limit_reached"
        elif stalled:
            stop_reason = "stalled"
        else:
            stop_reason = None

    return {
        "totalDifferingPixels": totals,
        "regressions": regressions,
        "stalled": stalled,
        "stallWindow": stall_window,
        "stopReason": stop_reason,
        "stopIsSuccess": False,
    }
