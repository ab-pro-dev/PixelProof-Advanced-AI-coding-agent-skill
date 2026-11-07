"""PixelProof final report generation and Markdown rendering.

Consistent with spec §15, §16, §21:
- Generates human-readable Markdown report and machine-readable JSON report.
- Tracks checks strictly in 4 states: passed, failed, skipped, unavailable (§21).
- Never reports a check as passed unless it actually ran (§16).
- Honesty rule (§15, §16): "OVERALL: INCOMPLETE" if any reference failed or any check
  is not "passed". "OVERALL: COMPLETE (tool execution only, visual quality not judged)"
  only when every reference is compared and every check is passed.
- Report shape, fields, and OVERALL banner wording are AGENT PROPOSALS (pending Q5).
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from string import Template
from typing import Any, Union

from pixelproof_image.hints import make_error

VALID_CHECK_STATES = {"passed", "failed", "skipped", "unavailable"}
TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "templates" / "report.md"


def build_report(run_summary: dict[str, Any]) -> dict[str, Any]:
    """Build a structured report dictionary from run summary data.

    Args:
        run_summary: Dictionary containing project info, references, checks, iterations, limitations.

    Returns:
        JSON-serializable report dictionary following spec §16.

    Raises:
        ValueError: If any check has an invalid state.
    """
    project_info = run_summary.get("project", {})
    if not isinstance(project_info, dict):
        project_info = {"name": str(project_info)}
    project_name = project_info.get("name", "Unnamed Project")

    # 1. Validate checks
    raw_checks = run_summary.get("checks", [])
    if not isinstance(raw_checks, list):
        raise ValueError("Field 'checks' must be a list")

    validated_checks: list[dict[str, Any]] = []
    checks_by_state = {"passed": 0, "failed": 0, "skipped": 0, "unavailable": 0}

    for chk in raw_checks:
        if not isinstance(chk, dict):
            raise ValueError(f"Check item must be an object, got {chk!r}")
        name = chk.get("name", "unnamed_check")
        state = chk.get("state")
        if state not in VALID_CHECK_STATES:
            raise ValueError(
                f"Invalid check state: {state!r} for check {name!r}. "
                f"Allowed states: {sorted(VALID_CHECK_STATES)}"
            )
        detail = chk.get("detail", "")
        validated_checks.append({
            "name": name,
            "state": state,
            "detail": detail,
        })
        checks_by_state[state] += 1

    # 2. Process references
    raw_references = run_summary.get("references", [])
    if not isinstance(raw_references, list):
        raw_references = []

    total_refs = len(raw_references)
    compared_count = 0
    failed_count = 0
    differing_count = 0
    identical_count = 0
    processed_references: list[dict[str, Any]] = []

    for ref in raw_references:
        if not isinstance(ref, dict):
            ref = {"status": "failed", "error": make_error("invalid_reference_entry", "Not a dict")}

        ref_entry = dict(ref)
        status = ref_entry.get("status")
        if status == "compared":
            compared_count += 1
            diff_px = ref_entry.get("differingPixels")
            if diff_px is None and isinstance(ref_entry.get("metrics"), dict):
                diff_px = ref_entry["metrics"].get("differingPixels")
            try:
                diff_int = int(diff_px) if diff_px is not None else 0
            except (ValueError, TypeError):
                diff_int = 0
            if diff_int > 0:
                differing_count += 1
            else:
                identical_count += 1
        else:
            # References without status are counted as failed, not skipped silently
            if "status" not in ref_entry:
                ref_entry["status"] = "failed"
                ref_entry.setdefault(
                    "error",
                    make_error("missing_status", "Reference comparison record missing status"),
                )
            failed_count += 1

        processed_references.append(ref_entry)

    # 3. Determine Overall status and reasons (§15, §16 honesty rule)
    reasons_incomplete: list[str] = []
    if total_refs == 0:
        reasons_incomplete.append("No reference comparisons were recorded")

    for r in processed_references:
        if r.get("status") != "compared":
            ref_id = r.get("referenceId", "unknown")
            err = r.get("error", {})
            err_code = err.get("code", "unknown_error")
            err_msg = err.get("message", "Comparison failed")
            reasons_incomplete.append(f"Reference '{ref_id}' failed: {err_code} - {err_msg}")

    for c in validated_checks:
        if c["state"] != "passed":
            name = c["name"]
            state = c["state"]
            detail = c["detail"]
            reasons_incomplete.append(f"Check '{name}' is {state}: {detail}")

    if reasons_incomplete:
        overall_status = "OVERALL: INCOMPLETE"
    else:
        overall_status = "OVERALL: COMPLETE (tool execution only, visual quality not judged)"

    # 4. Separate measured data from agent observations (§16)
    measured_metrics: list[dict[str, Any]] = []
    for r in processed_references:
        if r.get("status") == "compared":
            metrics = r.get("metrics", {})
            measured_metrics.append({
                "referenceId": r.get("referenceId"),
                "mae": metrics.get("mae"),
                "differingPixels": r.get("differingPixels"),
                "referenceSize": r.get("referenceSize"),
                "actualSize": r.get("actualSize"),
            })

    measured = {
        "totalReferences": total_refs,
        "comparedReferences": compared_count,
        "failedReferences": failed_count,
        "checksByState": checks_by_state,
        "metrics": measured_metrics,
    }
    observations = run_summary.get("observations", [])
    if not isinstance(observations, list):
        observations = [str(observations)]

    iterations = run_summary.get("iterations", 1)
    if not isinstance(iterations, int) or iterations < 1:
        iterations = 1

    limitations = run_summary.get("limitations", [])
    if not isinstance(limitations, list):
        limitations = [str(limitations)]

    return {
        "overall": overall_status,
        "overallReasons": reasons_incomplete,
        "project": {"name": project_name},
        "summary": {
            "totalReferences": total_refs,
            "compared": compared_count,
            "failed": failed_count,
            "differingReferences": differing_count,
            "identicalReferences": identical_count,
        },
        "references": processed_references,
        "checks": validated_checks,
        "iterations": iterations,
        "limitations": limitations,
        "measuredVsObserved": {
            "measured": measured,
            "observations": observations,
        },
    }


def _render_markdown(report: dict[str, Any], template_text: str) -> str:
    """Render human-readable Markdown using string.Template."""
    overall = report["overall"]
    reasons = report.get("overallReasons", [])
    summary = report.get("summary", {})
    differing_refs = summary.get("differingReferences", 0)
    compared_refs_count = summary.get("compared", 0)

    if differing_refs > 0:
        note_line = (
            f"NOTE: {differing_refs} of {compared_refs_count} references compared but still "
            "differ from their references (see Visual Comparison Metrics)."
        )
    else:
        note_line = (
            "NOTE: All compared references have 0 differing pixels "
            "(this is a measurement, not proof of correctness)."
        )

    banner_lines = [f"# {overall}", "", note_line]
    if reasons:
        banner_lines.extend(["", "**Reasons Incomplete:**"])
        for r in reasons:
            banner_lines.append(f"- {r}")
    overall_banner = "\n".join(banner_lines)

    summary = report["summary"]
    checks = report["checks"]
    checks_by_state = {"passed": 0, "failed": 0, "skipped": 0, "unavailable": 0}
    for c in checks:
        checks_by_state[c["state"]] = checks_by_state.get(c["state"], 0) + 1

    # Section 2: Reference Coverage
    refs = report.get("references", [])
    if refs:
        cov_lines = ["| Reference ID | Status | Notes / Errors |", "| --- | --- | --- |"]
        for r in refs:
            ref_id = r.get("referenceId", "unknown")
            status = r.get("status", "unknown")
            if status == "compared":
                notes = "Compared successfully"
            else:
                err = r.get("error", {})
                code = err.get("code", "error")
                msg = err.get("message", "")
                notes = f"{code}: {msg}".strip(": ")
            cov_lines.append(f"| {ref_id} | {status} | {notes} |")
        reference_coverage = "\n".join(cov_lines)
    else:
        reference_coverage = "No references evaluated."

    # Section 3: Pages Implemented or Checked
    routes: set[str] = set()
    for r in refs:
        if "route" in r:
            routes.add(str(r["route"]))
    if routes:
        pages_checked = "\n".join(f"- `{rt}`" for rt in sorted(routes))
    else:
        pages_checked = "No explicit routes recorded in reference outputs."

    # Section 4: Screenshot Dimensions and Capture Status
    if refs:
        dim_lines = [
            "| Reference ID | Status | Reference Size | Actual Size |",
            "| --- | --- | --- | --- |",
        ]
        for r in refs:
            ref_id = r.get("referenceId", "unknown")
            status = r.get("status", "unknown")
            r_size = r.get("referenceSize")
            a_size = r.get("actualSize")
            r_str = f"{r_size['width']}x{r_size['height']}" if r_size else "N/A"
            a_str = f"{a_size['width']}x{a_size['height']}" if a_size else "N/A"
            dim_lines.append(f"| {ref_id} | {status} | {r_str} | {a_str} |")
        dimensions_and_capture = "\n".join(dim_lines)
    else:
        dimensions_and_capture = "No dimensions recorded."

    # Section 5: Visual Comparison Metrics
    compared_refs = [r for r in refs if r.get("status") == "compared"]
    if compared_refs:
        met_lines = [
            "| Reference ID | MAE | Differing Pixels | Overlay | Diff | Side-by-Side |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
        for r in compared_refs:
            ref_id = r.get("referenceId", "unknown")
            mae_val = r.get("metrics", {}).get("mae", "N/A")
            diff_pixels = r.get("differingPixels", "N/A")
            arts = r.get("artifacts", {})
            overlay = arts.get("overlay", "N/A")
            diff_art = arts.get("diff", "N/A")
            sbs = arts.get("sideBySide", "N/A")
            met_lines.append(f"| {ref_id} | {mae_val} | {diff_pixels} | `{overlay}` | `{diff_art}` | `{sbs}` |")
        comparison_metrics = "\n".join(met_lines)
    else:
        comparison_metrics = "No successful comparisons available to report metrics."

    obs_list = report.get("measuredVsObserved", {}).get("observations", [])
    if obs_list:
        observations = "\n".join(f"- {o}" for o in obs_list)
    else:
        observations = "No agent observations recorded."

    # Section 6: Highest-Priority Remaining Issues
    failed_refs = [r for r in refs if r.get("status") != "compared"]
    if failed_refs:
        issue_lines = []
        for r in failed_refs:
            ref_id = r.get("referenceId", "unknown")
            err = r.get("error", {})
            code = err.get("code", "unknown_error")
            msg = err.get("message", "Failure")
            issue_lines.append(f"- **{ref_id}**: {code} - {msg}")
        remaining_issues = "\n".join(issue_lines)
    else:
        remaining_issues = "None reported (Phase 1 visual defect ranking not active)."

    # Section 7: Build and Test Results
    passed_checks = [c for c in checks if c["state"] == "passed"]
    if passed_checks:
        build_and_test_results = "\n".join(
            f"- **{c['name']}** (passed): {c['detail']}".rstrip(": ") for c in passed_checks
        )
    else:
        build_and_test_results = "No checks passed."

    # Section 8: Failed or Skipped Checks
    non_passed_checks = [c for c in checks if c["state"] != "passed"]
    if non_passed_checks:
        failed_or_skipped_checks = "\n".join(
            f"- **{c['name']}** ({c['state']}): {c['detail']}".rstrip(": ") for c in non_passed_checks
        )
    else:
        failed_or_skipped_checks = "None."

    # Section 9: Final Iteration Count
    iteration_count = f"Completed iterations: {report.get('iterations', 1)}"

    # Section 10: Limitations and Suggested Next Actions
    limits = report.get("limitations", [])
    if limits:
        limit_text = "### Stated Limitations\n" + "\n".join(f"- {lim}" for lim in limits)
    else:
        limit_text = "### Stated Limitations\nNo limitations specified."

    actions = []
    if reasons:
        actions.append("Resolve incomplete references and rerun failed/skipped checks.")
    if summary["failed"] > 0:
        actions.append(f"Fix issues for {summary['failed']} failed reference(s).")
    if not actions:
        actions.append("Proceed to next workflow phase or verification review.")

    limitations_and_actions = f"{limit_text}\n\n### Suggested Next Actions\n" + "\n".join(f"- {a}" for a in actions)

    tmpl = Template(template_text)
    return tmpl.substitute(
        overall_banner=overall_banner,
        project_name=report.get("project", {}).get("name", "Unnamed Project"),
        overall_status=overall,
        total_references=summary["totalReferences"],
        compared_references=summary["compared"],
        failed_references=summary["failed"],
        total_checks=len(checks),
        passed_checks=checks_by_state["passed"],
        failed_checks=checks_by_state["failed"],
        skipped_checks=checks_by_state["skipped"],
        unavailable_checks=checks_by_state["unavailable"],
        iterations=report.get("iterations", 1),
        reference_coverage=reference_coverage,
        pages_checked=pages_checked,
        dimensions_and_capture=dimensions_and_capture,
        comparison_metrics=comparison_metrics,
        observations=observations,
        remaining_issues=remaining_issues,
        build_and_test_results=build_and_test_results,
        failed_or_skipped_checks=failed_or_skipped_checks,
        iteration_count=iteration_count,
        limitations_and_actions=limitations_and_actions,
    )


def write_report(
    report: dict[str, Any],
    output_dir: Union[str, os.PathLike],
    overwrite: bool = False,
) -> dict[str, Any]:
    """Write machine-readable JSON and human-readable Markdown reports to output_dir/reports/.

    Args:
        report: Report dictionary built by build_report().
        output_dir: Base directory under which reports/ will be placed.
        overwrite: Whether to overwrite existing report files.

    Returns:
        JSON-serializable status dictionary:
        {"status": "written", "paths": {"json": str, "markdown": str}}

    Raises:
        FileExistsError: If report files already exist and overwrite is False.
        Exception: If writing files fails; any partially written file is removed.
    """
    out_dir = Path(output_dir)
    reports_dir = out_dir / "reports"
    json_path = reports_dir / "report.json"
    md_path = reports_dir / "report.md"

    # Refuse to overwrite unless overwrite=True
    if not overwrite:
        if json_path.exists() or md_path.exists():
            raise FileExistsError(
                f"Report files already exist under {reports_dir}. Use overwrite=True to replace."
            )

    template_file = TEMPLATE_PATH
    if not template_file.exists():
        raise FileNotFoundError(f"Report template not found at {template_file}")

    template_text = template_file.read_text(encoding="utf-8")
    md_content = _render_markdown(report, template_text)
    json_content = json.dumps(report, indent=2)

    reports_dir.mkdir(parents=True, exist_ok=True)
    written_files: list[Path] = []
    try:
        json_path.write_text(json_content, encoding="utf-8")
        written_files.append(json_path)

        md_path.write_text(md_content, encoding="utf-8")
        written_files.append(md_path)
    except Exception as e:
        for f in written_files:
            f.unlink(missing_ok=True)
        raise e

    return {
        "status": "written",
        "paths": {
            "json": str(json_path),
            "markdown": str(md_path),
        },
    }
