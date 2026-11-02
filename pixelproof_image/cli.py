"""PixelProof image comparison, manifest validation, project inspection, and final reporting CLI.

Invocations:
    python -m pixelproof_image.cli compare --id ID --reference PATH --actual PATH --out DIR [--overwrite]
    python -m pixelproof_image.cli validate --manifest PATH
    python -m pixelproof_image.cli inspect --project DIR
    python -m pixelproof_image.cli report --summary PATH --out DIR [--overwrite]

Notes:
- Exit codes (0 for success, 1 for failure) are an AGENT PROPOSAL
  pending resolution of open question Q2 (how Phase 1 tools are invoked before the TypeScript CLI exists).
- Statuses, error codes, and report fields are AGENT PROPOSALS (Q5).
- Never prints anything except JSON on stdout.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from pixelproof_image.final_report import build_report, write_report
from pixelproof_image.inspect_project import inspect_project
from pixelproof_image.iteration import record_iteration
from pixelproof_image.manifest import validate_manifest
from pixelproof_image.regions import parse_grid, validate_region_weights
from pixelproof_image.report import run_comparison


def main(argv: list[str] | None = None) -> None:
    """CLI entry point for PixelProof commands."""
    parser = argparse.ArgumentParser(
        prog="pixelproof_image.cli",
        description="PixelProof image comparison, manifest validation, project inspection, and final reporting tool.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # 1. Compare subcommand
    compare_parser = subparsers.add_parser(
        "compare",
        help="Compare reference and actual images and output a JSON report.",
    )
    compare_parser.add_argument(
        "--id",
        required=True,
        dest="reference_id",
        help="Reference identifier (allowed: [A-Za-z0-9_-], max 64 chars).",
    )
    compare_parser.add_argument(
        "--reference",
        required=True,
        help="Path to reference image.",
    )
    compare_parser.add_argument(
        "--actual",
        required=True,
        help="Path to actual image.",
    )
    compare_parser.add_argument(
        "--out",
        required=True,
        dest="output_dir",
        help="Directory to store comparison artifacts.",
    )
    compare_parser.add_argument(
        "--overwrite",
        action="store_true",
        default=False,
        help="Overwrite existing comparison artifacts.",
    )
    compare_parser.add_argument(
        "--regions",
        action="store_true",
        default=False,
        help="Include region-based measurements in comparison report.",
    )
    compare_parser.add_argument(
        "--grid",
        default=None,
        help="Grid dimensions RxC for regions (default: 4x4).",
    )
    compare_parser.add_argument(
        "--weights",
        default=None,
        help="Path to JSON file containing regionWeights object.",
    )

    # 2. Validate subcommand
    validate_parser = subparsers.add_parser(
        "validate",
        help="Validate a reference manifest file and output a JSON report.",
    )
    validate_parser.add_argument(
        "--manifest",
        required=True,
        help="Path to reference manifest JSON file.",
    )

    # 3. Inspect subcommand
    inspect_parser = subparsers.add_parser(
        "inspect",
        help="Inspect a target frontend project and output a JSON report.",
    )
    inspect_parser.add_argument(
        "--project",
        required=True,
        dest="project_dir",
        help="Path to project directory to inspect.",
    )

    # 4. Report subcommand
    report_parser = subparsers.add_parser(
        "report",
        help="Build and write final report files (JSON and Markdown) under output directory.",
    )
    report_parser.add_argument(
        "--summary",
        required=True,
        dest="summary_path",
        help="Path to run summary JSON file.",
    )
    report_parser.add_argument(
        "--out",
        required=True,
        dest="output_dir",
        help="Base directory under which reports/ will be created.",
    )
    report_parser.add_argument(
        "--overwrite",
        action="store_true",
        default=False,
        help="Overwrite existing report files.",
    )

    # 5. Iterate subcommand
    iterate_parser = subparsers.add_parser(
        "iterate",
        help="Record one refinement iteration and report deltas vs the previous iteration.",
    )
    iterate_parser.add_argument(
        "--manifest",
        required=True,
        help="Path to reference manifest JSON file.",
    )
    iterate_parser.add_argument(
        "--actual-dir",
        required=True,
        help="Directory containing actual screenshots (<id>.png).",
    )
    iterate_parser.add_argument(
        "--out",
        required=True,
        dest="output_dir",
        help="Base output directory for comparison artifacts and state/.",
    )
    iterate_parser.add_argument(
        "--overwrite",
        action="store_true",
        default=False,
        help="Overwrite existing comparison artifacts.",
    )

    args = parser.parse_args(argv)

    if args.command == "compare":
        if args.weights and not args.regions:
            fail_report = {
                "referenceId": args.reference_id,
                "status": "failed",
                "error": {
                    "code": "weights_require_regions",
                    "message": "--weights requires --regions to be enabled.",
                },
            }
            sys.stdout.write(json.dumps(fail_report, indent=2) + "\n")
            sys.exit(1)

        region_weights_data = None
        if args.weights:
            weights_path = Path(args.weights)
            if not weights_path.is_file():
                fail_report = {
                    "referenceId": args.reference_id,
                    "status": "failed",
                    "error": {
                        "code": "invalid_weights_file",
                        "message": f"Weights file does not exist or is not a file: {args.weights}",
                    },
                }
                sys.stdout.write(json.dumps(fail_report, indent=2) + "\n")
                sys.exit(1)
            try:
                with open(weights_path, "r", encoding="utf-8") as f:
                    region_weights_data = json.load(f)
            except Exception as err:
                fail_report = {
                    "referenceId": args.reference_id,
                    "status": "failed",
                    "error": {
                        "code": "invalid_weights_file",
                        "message": f"Failed to parse weights JSON: {err}",
                    },
                }
                sys.stdout.write(json.dumps(fail_report, indent=2) + "\n")
                sys.exit(1)

            rw_errors = validate_region_weights(region_weights_data)
            if rw_errors:
                fail_report = {
                    "referenceId": args.reference_id,
                    "status": "failed",
                    "error": {
                        "code": "invalid_weights_file",
                        "message": rw_errors[0]["message"],
                    },
                }
                sys.stdout.write(json.dumps(fail_report, indent=2) + "\n")
                sys.exit(1)

        grid_arg = args.grid if args.grid is not None else "4x4"
        if args.regions or args.grid is not None:
            try:
                parse_grid(grid_arg)
            except ValueError as err:
                fail_report = {
                    "referenceId": args.reference_id,
                    "status": "failed",
                    "error": {
                        "code": "invalid_grid",
                        "message": str(err),
                    },
                }
                sys.stdout.write(json.dumps(fail_report, indent=2) + "\n")
                sys.exit(1)

        report = run_comparison(
            reference_id=args.reference_id,
            reference_path=args.reference,
            actual_path=args.actual,
            output_dir=args.output_dir,
            overwrite=args.overwrite,
            regions=args.regions,
            grid=grid_arg,
            region_weights=region_weights_data,
        )
        sys.stdout.write(json.dumps(report, indent=2) + "\n")
        sys.exit(0 if report.get("status") == "compared" else 1)
    elif args.command == "validate":
        report = validate_manifest(args.manifest)
        sys.stdout.write(json.dumps(report, indent=2) + "\n")
        sys.exit(0 if report.get("status") == "valid" else 1)
    elif args.command == "inspect":
        report = inspect_project(args.project_dir)
        sys.stdout.write(json.dumps(report, indent=2) + "\n")
        sys.exit(0 if report.get("status") == "inspected" else 1)
    elif args.command == "report":
        summary_file = Path(args.summary_path)
        if not summary_file.exists() or not summary_file.is_file():
            err_res = {
                "status": "failed",
                "error": {
                    "code": "summary_missing",
                    "message": f"Summary file not found: {args.summary_path}",
                },
            }
            sys.stdout.write(json.dumps(err_res, indent=2) + "\n")
            sys.exit(1)

        try:
            with open(summary_file, "r", encoding="utf-8") as f:
                summary_data = json.load(f)
        except Exception as e:
            err_res = {
                "status": "failed",
                "error": {
                    "code": "summary_unparseable",
                    "message": f"Cannot parse summary JSON: {e}",
                },
            }
            sys.stdout.write(json.dumps(err_res, indent=2) + "\n")
            sys.exit(1)

        try:
            report_data = build_report(summary_data)
            write_res = write_report(report_data, args.output_dir, overwrite=args.overwrite)
            sys.stdout.write(json.dumps(write_res, indent=2) + "\n")
            sys.exit(0)
        except FileExistsError as e:
            err_res = {
                "status": "failed",
                "error": {
                    "code": "output_exists",
                    "message": str(e).replace("overwrite=True", "--overwrite"),
                },
            }
            sys.stdout.write(json.dumps(err_res, indent=2) + "\n")
            sys.exit(1)
        except Exception as e:
            err_res = {
                "status": "failed",
                "error": {
                    "code": "report_failed",
                    "message": str(e),
                },
            }
            sys.stdout.write(json.dumps(err_res, indent=2) + "\n")
            sys.exit(1)

    if args.command == "iterate":
        manifest_res = validate_manifest(args.manifest)
        if manifest_res.get("status") != "valid":
            fail_report = {
                "status": "failed",
                "error": {
                    "code": "manifest_invalid",
                    "message": "Manifest validation failed",
                    "errors": manifest_res.get("errors", []),
                },
            }
            sys.stdout.write(json.dumps(fail_report, indent=2) + "\n")
            sys.exit(1)

        references = manifest_res.get("references", [])
        actual_dir = Path(args.actual_dir)
        out_dir = Path(args.output_dir)

        run_results = []
        for ref in references:
            ref_id = ref["id"]
            ref_path = ref["image"]
            actual_path = actual_dir / f"{ref_id}.png"
            res = run_comparison(
                reference_id=ref_id,
                reference_path=ref_path,
                actual_path=actual_path,
                output_dir=out_dir,
                overwrite=args.overwrite,
                regions=False,
            )
            run_results.append(res)

        state_dir = out_dir / "state"
        record_res = record_iteration(
            state_dir=state_dir,
            run_results=run_results,
            max_iterations=5,
            overwrite=args.overwrite,
        )

        if record_res.get("status") != "recorded":
            sys.stdout.write(json.dumps(record_res, indent=2) + "\n")
            sys.exit(1)

        compact_refs = []
        failed_count = 0
        for r in run_results:
            st = r.get("status")
            if st == "compared":
                compact_refs.append({
                    "id": r["referenceId"],
                    "status": "compared",
                    "mae": r["metrics"]["mae"],
                    "differingPixels": r["differingPixels"],
                })
            else:
                failed_count += 1
                err = r.get("error", {})
                code = err.get("code") if isinstance(err, dict) else str(err)
                compact_refs.append({
                    "id": r["referenceId"],
                    "status": "failed",
                    "errorCode": code or "unknown_error",
                })

        cli_doc: dict[str, Any] = {
            "status": "recorded",
            "iteration": record_res["iteration"],
            "iterationsRemaining": record_res["iterationsRemaining"],
            "overLimit": record_res.get("overLimit", False),
            "deltas": record_res["deltas"],
            "references": compact_refs,
        }
        if "maxIterationsIgnored" in record_res:
            cli_doc["maxIterationsIgnored"] = record_res["maxIterationsIgnored"]
        if failed_count > 0:
            cli_doc["failedReferences"] = failed_count

        sys.stdout.write(json.dumps(cli_doc, indent=2) + "\n")
        sys.exit(0 if failed_count == 0 else 1)


if __name__ == "__main__":
    main()
