"""PixelProof image comparison, manifest validation, and project inspection CLI.

Invocations:
    python -m pixelproof_image.cli compare --id ID --reference PATH --actual PATH --out DIR [--overwrite]
    python -m pixelproof_image.cli validate --manifest PATH
    python -m pixelproof_image.cli inspect --project DIR

Notes:
- Exit codes (0 for status 'compared' / 'valid' / 'inspected', 1 for 'failed' / 'invalid') are an AGENT PROPOSAL
  pending resolution of open question Q2 (how Phase 1 tools are invoked before the TypeScript CLI exists).
- Statuses and field names are AGENT PROPOSALS (Q5).
- Never prints anything except JSON on stdout.
"""

from __future__ import annotations

import argparse
import json
import sys

from pixelproof_image.inspect_project import inspect_project
from pixelproof_image.manifest import validate_manifest
from pixelproof_image.report import run_comparison


def main(argv: list[str] | None = None) -> None:
    """CLI entry point for PixelProof image comparison, manifest validation, and project inspection."""
    parser = argparse.ArgumentParser(
        prog="pixelproof_image.cli",
        description="PixelProof image comparison, manifest validation, and project inspection tool.",
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

    args = parser.parse_args(argv)

    if args.command == "compare":
        report = run_comparison(
            reference_id=args.reference_id,
            reference_path=args.reference,
            actual_path=args.actual,
            output_dir=args.output_dir,
            overwrite=args.overwrite,
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


if __name__ == "__main__":
    main()
