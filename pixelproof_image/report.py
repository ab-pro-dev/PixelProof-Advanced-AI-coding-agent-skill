"""PixelProof per-reference comparison reporting and artifact orchestration.

Consistent with spec §7.7, §11, §16, §17:
- Combines image comparison (MAE) and visual artifact generation (overlay, diff, side-by-side)
  into a single per-reference report.
- Report shape follows spec §7.7 (marked as illustrative in the specification).
- "status" values ("compared" / "failed") remain provisional pending resolution
  of open question Q5 (report status vocabulary).
- Artifact filenames (<id>-overlay.png, <id>-diff.png, <id>-side-by-side.png) under
  comparison/ are AGENT PROPOSALS.
- "issues" is always an empty list in this Phase 1 step (issue ranking is Phase 3).
"""

from __future__ import annotations

import os
from pathlib import Path
import re
from typing import Any, Union

from pixelproof_image.compare import compare_images, load_image
from pixelproof_image.hints import make_error
from pixelproof_image.overlay import make_diff, make_overlay, make_side_by_side
from pixelproof_image.regions import (
    compute_regions,
    parse_grid,
    rank_regions,
    apply_weights,
    WeightsGridMismatchError,
    validate_region_weights,
)

# Allowed reference IDs: alphanumeric, underscores, hyphens, 1 to 64 characters
REFERENCE_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


class ArtifactGenerationError(Exception):
    """Internal exception raised when an artifact cannot be written."""

    def __init__(self, error: dict[str, Any]):
        super().__init__(error.get("message", "Artifact generation failed"))
        self.error = error


def run_comparison(
    reference_id: str,
    reference_path: Union[str, os.PathLike],
    actual_path: Union[str, os.PathLike],
    output_dir: Union[str, os.PathLike],
    overwrite: bool = False,
    regions: bool = False,
    grid: tuple[int, int] | str = (4, 4),
    region_weights: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run visual comparison and generate artifacts for a single reference.

    Args:
        reference_id: Stable identifier for the reference (alphanumeric, hyphens, underscores).
        reference_path: Path to the reference image.
        actual_path: Path to the rendered implementation screenshot.
        output_dir: Base directory for output artifacts.
        overwrite: Whether to overwrite existing artifact files.

    Returns:
        JSON-serializable report dictionary:
        - On success:
          {
              "referenceId": <reference_id>,
              "status": "compared",
              "referenceSize": {"width": int, "height": int},
              "actualSize": {"width": int, "height": int},
              "metrics": {"mae": float},
              "artifacts": {
                  "overlay": "comparison/<id>-overlay.png",
                  "diff": "comparison/<id>-diff.png",
                  "sideBySide": "comparison/<id>-side-by-side.png"
              },
              "differingPixels": int,
              "issues": []
          }
        - On failure:
          {
              "referenceId": <reference_id>,
              "status": "failed",
              "error": {"code": str, "message": str},
              ["referenceSize": {"width": int, "height": int},]
              ["actualSize": {"width": int, "height": int}]
          }
    """
    # 1. SECURITY (§17): Validate reference_id format and length
    if not isinstance(reference_id, str) or not REFERENCE_ID_PATTERN.fullmatch(reference_id):
        return {
            "referenceId": reference_id,
            "status": "failed",
            "error": make_error(
                "invalid_reference_id",
                (
                    f"Invalid reference ID: {reference_id!r}. Must contain only "
                    "alphanumeric characters, underscores, and hyphens, and be 1 to 64 characters long."
                ),
            ),
        }

    # Validate region weights dependency
    if region_weights is not None and not regions:
        return {
            "referenceId": reference_id,
            "status": "failed",
            "error": make_error(
                "weights_require_regions",
                "--weights requires --regions to be enabled.",
            ),
        }

    # Validate grid specification if regions are requested or grid is customized
    parsed_rows, parsed_cols = 4, 4
    if regions or (grid != (4, 4) and grid != "4x4"):
        try:
            parsed_rows, parsed_cols = parse_grid(grid)
        except ValueError as err:
            return {
                "referenceId": reference_id,
                "status": "failed",
                "error": make_error(
                    "invalid_grid",
                    str(err),
                ),
            }

    # 2. SECURITY (§17): Validate file paths stay inside output_dir
    out_dir = Path(output_dir)
    comp_dir = out_dir / "comparison"
    overlay_file = comp_dir / f"{reference_id}-overlay.png"
    diff_file = comp_dir / f"{reference_id}-diff.png"
    sbs_file = comp_dir / f"{reference_id}-side-by-side.png"

    resolved_out_dir = out_dir.resolve()
    try:
        overlay_file.resolve().relative_to(resolved_out_dir)
        diff_file.resolve().relative_to(resolved_out_dir)
        sbs_file.resolve().relative_to(resolved_out_dir)
    except ValueError:
        return {
            "referenceId": reference_id,
            "status": "failed",
            "error": make_error(
                "invalid_reference_id",
                "Artifact path escapes output directory.",
            ),
        }

    # 3. Perform comparison (dimensions, pixel differences, MAE)
    comp_res = compare_images(reference_path, actual_path)
    if comp_res.get("status") != "compared":
        fail_report: dict[str, Any] = {
            "referenceId": reference_id,
            "status": "failed",
            "error": comp_res.get("error", make_error("unknown_error", "Comparison failed")),
        }
        if "referenceSize" in comp_res:
            fail_report["referenceSize"] = comp_res["referenceSize"]
        if "actualSize" in comp_res:
            fail_report["actualSize"] = comp_res["actualSize"]
        return fail_report

    # 4. Check if any artifact already exists when overwrite=False
    if not overwrite:
        for target in (overlay_file, diff_file, sbs_file):
            if target.exists():
                return {
                    "referenceId": reference_id,
                    "status": "failed",
                    "error": make_error(
                        "output_exists",
                        f"Output artifact already exists: {target}",
                    ),
                    "referenceSize": comp_res["referenceSize"],
                    "actualSize": comp_res["actualSize"],
                }

    # 5. Generate artifacts atomically; rollback if any write fails
    created_in_this_call: list[Path] = []
    try:
        # Overlay
        existed_overlay = overlay_file.exists()
        overlay_res = make_overlay(reference_path, actual_path, overlay_file, overwrite=overwrite)
        if overlay_res.get("status") != "written":
            raise ArtifactGenerationError(
                overlay_res.get("error", make_error("artifact_error", "Failed to create overlay"))
            )
        if not existed_overlay:
            created_in_this_call.append(overlay_file)

        # Diff
        existed_diff = diff_file.exists()
        diff_res = make_diff(reference_path, actual_path, diff_file, overwrite=overwrite)
        if diff_res.get("status") != "written":
            raise ArtifactGenerationError(
                diff_res.get("error", make_error("artifact_error", "Failed to create diff"))
            )
        if not existed_diff:
            created_in_this_call.append(diff_file)

        # Side-by-side
        existed_sbs = sbs_file.exists()
        sbs_res = make_side_by_side(reference_path, actual_path, sbs_file, overwrite=overwrite)
        if sbs_res.get("status") != "written":
            raise ArtifactGenerationError(
                sbs_res.get("error", make_error("artifact_error", "Failed to create side-by-side"))
            )
        if not existed_sbs:
            created_in_this_call.append(sbs_file)

    except ArtifactGenerationError as err:
        for f in created_in_this_call:
            f.unlink(missing_ok=True)
        return {
            "referenceId": reference_id,
            "status": "failed",
            "error": err.error,
            "referenceSize": comp_res["referenceSize"],
            "actualSize": comp_res["actualSize"],
        }
    except Exception as err:
        for f in created_in_this_call:
            f.unlink(missing_ok=True)
        return {
            "referenceId": reference_id,
            "status": "failed",
            "error": make_error(
                "artifact_error",
                f"Unexpected error generating artifacts: {err}",
            ),
            "referenceSize": comp_res["referenceSize"],
            "actualSize": comp_res["actualSize"],
        }

    # 6. Success: return formatted report matching spec §7.7
    report: dict[str, Any] = {
        "referenceId": reference_id,
        "status": "compared",
        "referenceSize": comp_res["referenceSize"],
        "actualSize": comp_res["actualSize"],
        "metrics": {
            "mae": comp_res["metrics"]["mae"],
        },
        "artifacts": {
            "overlay": f"comparison/{reference_id}-overlay.png",
            "diff": f"comparison/{reference_id}-diff.png",
            "sideBySide": f"comparison/{reference_id}-side-by-side.png",
        },
        "differingPixels": diff_res["differingPixels"],
        "issues": [],
    }

    if regions:
        ref_arr, ref_size, _ = load_image(reference_path)
        act_arr, act_size, _ = load_image(actual_path)
        region_items = compute_regions(ref_arr, act_arr, rows=parsed_rows, cols=parsed_cols)
        effective_rows = max(1, min(parsed_rows, ref_size.height))
        effective_cols = max(1, min(parsed_cols, ref_size.width))
        regions_doc: dict[str, Any] = {
            "grid": {
                "rows": effective_rows,
                "cols": effective_cols,
            },
            "items": region_items,
            "ranking": rank_regions(region_items),
        }
        if region_weights is not None:
            try:
                weighted_items = apply_weights(
                    region_items,
                    region_weights,
                    grid=(effective_rows, effective_cols),
                )
                regions_doc["weighted"] = {
                    "ranking": [
                        {
                            "rank": rank,
                            "index": w["index"],
                            "weight": w["weight"],
                            "weightedScore": w["weightedScore"],
                            "priorityScore": w["priorityScore"],
                            "factors": w["factors"],
                        }
                        for rank, w in enumerate(weighted_items, start=1)
                    ]
                }
            except WeightsGridMismatchError as err:
                return {
                    "referenceId": reference_id,
                    "status": "failed",
                    "error": make_error(
                        "weights_grid_mismatch",
                        str(err),
                    ),
                }
        report["regions"] = regions_doc

    return report
