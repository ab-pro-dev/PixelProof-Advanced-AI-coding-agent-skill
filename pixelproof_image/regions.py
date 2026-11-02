"""PixelProof region-based image comparison and measurement.

AGENT PROPOSAL: Grid layout (uniform integer tiling with remainder absorption)
and region metric field names ("areaFraction", "diffRatio", "mae") are provisional
pending resolution of open architectural question Q8 (severity scale, priority factors).
"""

from __future__ import annotations

import re
from typing import Any
import numpy as np

GRID_PATTERN = re.compile(r"^([1-9]\d*)[xX]([1-9]\d*)$")


def parse_grid(grid_spec: str | tuple[int, int]) -> tuple[int, int]:
    """Parse and validate grid specification RxC.

    Args:
        grid_spec: String like "4x4", "2x3" or tuple of (rows, cols).

    Returns:
        Tuple of (rows, cols) as positive integers.

    Raises:
        ValueError: If grid_spec is invalid or contains non-positive dimensions.
    """
    if isinstance(grid_spec, (tuple, list)):
        if len(grid_spec) != 2:
            raise ValueError(f"Invalid grid tuple: expected length 2, got {grid_spec!r}")
        rows, cols = grid_spec
        if not isinstance(rows, int) or not isinstance(cols, int) or rows <= 0 or cols <= 0:
            raise ValueError(f"Invalid grid dimensions: rows and cols must be positive integers, got {grid_spec!r}")
        return rows, cols

    if not isinstance(grid_spec, str):
        raise ValueError(f"Invalid grid type: expected string RxC, got {type(grid_spec).__name__}")

    match = GRID_PATTERN.fullmatch(grid_spec.strip())
    if not match:
        raise ValueError(f"Invalid grid format: expected RxC (e.g. 4x4), got {grid_spec!r}")

    rows = int(match.group(1))
    cols = int(match.group(2))
    return rows, cols


def compute_regions(
    reference_array: np.ndarray,
    actual_array: np.ndarray,
    rows: int = 4,
    cols: int = 4,
) -> list[dict[str, Any]]:
    """Compute region-based comparison metrics across a grid tiling the image.

    Args:
        reference_array: Reference image RGB array of shape (height, width, 3).
        actual_array: Actual image RGB array of shape (height, width, 3).
        rows: Requested number of grid rows (clamped to image height).
        cols: Requested number of grid columns (clamped to image width).

    Returns:
        List of region dictionaries in row-major order:
        [
            {
                "index": int,
                "row": int,
                "col": int,
                "x": int,
                "y": int,
                "width": int,
                "height": int,
                "areaFraction": float,
                "differingPixels": int,
                "diffRatio": float,
                "mae": float,
            },
            ...
        ]
    """
    if reference_array.shape != actual_array.shape:
        raise ValueError(
            f"Array shapes must match: reference {reference_array.shape} vs actual {actual_array.shape}"
        )

    height = reference_array.shape[0]
    width = reference_array.shape[1]

    if height == 0 or width == 0:
        return []

    # Clamp rows and cols to image dimensions (never fabricate cells)
    effective_rows = max(1, min(rows, height))
    effective_cols = max(1, min(cols, width))

    base_h = height // effective_rows
    base_w = width // effective_cols

    total_pixels = height * width
    regions: list[dict[str, Any]] = []

    for r in range(effective_rows):
        y = r * base_h
        if r == effective_rows - 1:
            h = height - y
        else:
            h = base_h

        for c in range(effective_cols):
            x = c * base_w
            if c == effective_cols - 1:
                w = width - x
            else:
                w = base_w

            ref_slice = reference_array[y : y + h, x : x + w]
            act_slice = actual_array[y : y + h, x : x + w]

            region_pixels = w * h
            diff_mask = np.any(ref_slice != act_slice, axis=-1)
            differing_count = int(np.sum(diff_mask))

            diff_ratio = float(differing_count / region_pixels)
            channel_diff = np.abs(ref_slice.astype(np.float64) - act_slice.astype(np.float64))
            region_mae = float(np.mean(channel_diff))
            area_fraction = float(region_pixels / total_pixels)

            index = r * effective_cols + c
            regions.append({
                "index": index,
                "row": r,
                "col": c,
                "x": x,
                "y": y,
                "width": w,
                "height": h,
                "areaFraction": area_fraction,
                "differingPixels": differing_count,
                "diffRatio": diff_ratio,
                "mae": region_mae,
            })

    return regions


def rank_regions(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Rank regions with differingPixels > 0 by score descending, ties broken by lower index.

    AGENT PROPOSAL: Proposed ranking score formula (score = areaFraction * diffRatio)
    pending open question Q8 (priority factors and calibration).

    Args:
        items: List of region dictionaries produced by compute_regions.

    Returns:
        List of dictionaries with {"rank": int, "index": int, "score": float}
        for regions with differingPixels > 0, sorted by score descending,
        breaking ties by lower index. Regions with zero differences never appear.
    """
    candidates = []
    for item in items:
        if item.get("differingPixels", 0) > 0:
            score = float(item["areaFraction"] * item["diffRatio"])
            candidates.append((score, item["index"]))

    # Sort descending by score (-score), ties broken by lower index (+idx)
    candidates.sort(key=lambda x: (-x[0], x[1]))

    return [
        {"rank": rank, "index": idx, "score": score}
        for rank, (score, idx) in enumerate(candidates, start=1)
    ]


class WeightsGridMismatchError(ValueError):
    """Raised when region weights grid does not match the comparison grid."""
    pass


def validate_region_weights(data: Any, path_prefix: str = "regionWeights") -> list[dict[str, str]]:
    """Validate a regionWeights dictionary against specification rules.

    AGENT PROPOSAL: Proposed region weights validation schema pending open question Q8.

    Args:
        data: Object to validate.
        path_prefix: Property path prefix for error reporting.

    Returns:
        List of error dicts [{"code": "invalid_region_weights", "path": str, "message": str}].
    """
    errors: list[dict[str, str]] = []
    if not isinstance(data, dict):
        errors.append({
            "code": "invalid_region_weights",
            "path": path_prefix,
            "message": f"'{path_prefix}' must be an object, got {type(data).__name__}",
        })
        return errors

    grid_valid = False
    rows, cols = None, None
    if "grid" not in data:
        errors.append({
            "code": "invalid_region_weights",
            "path": f"{path_prefix}.grid",
            "message": f"Field '{path_prefix}.grid' is required",
        })
    else:
        grid = data["grid"]
        if not isinstance(grid, dict):
            errors.append({
                "code": "invalid_region_weights",
                "path": f"{path_prefix}.grid",
                "message": f"Field '{path_prefix}.grid' must be an object",
            })
        else:
            rows = grid.get("rows")
            cols = grid.get("cols")
            rows_valid = True
            cols_valid = True
            if isinstance(rows, bool) or not isinstance(rows, int) or rows <= 0:
                errors.append({
                    "code": "invalid_region_weights",
                    "path": f"{path_prefix}.grid.rows",
                    "message": f"Grid rows must be a positive integer, got {rows!r}",
                })
                rows_valid = False
            if isinstance(cols, bool) or not isinstance(cols, int) or cols <= 0:
                errors.append({
                    "code": "invalid_region_weights",
                    "path": f"{path_prefix}.grid.cols",
                    "message": f"Grid cols must be a positive integer, got {cols!r}",
                })
                cols_valid = False
            grid_valid = rows_valid and cols_valid

    if "weights" not in data:
        errors.append({
            "code": "invalid_region_weights",
            "path": f"{path_prefix}.weights",
            "message": f"Field '{path_prefix}.weights' is required",
        })
    else:
        weights = data["weights"]
        if not isinstance(weights, list):
            errors.append({
                "code": "invalid_region_weights",
                "path": f"{path_prefix}.weights",
                "message": f"Field '{path_prefix}.weights' must be a list",
            })
        else:
            if grid_valid and rows is not None and len(weights) != rows:
                errors.append({
                    "code": "invalid_region_weights",
                    "path": f"{path_prefix}.weights",
                    "message": f"Expected {rows} rows of weights, got {len(weights)}",
                })
            for r_idx, row in enumerate(weights):
                row_path = f"{path_prefix}.weights[{r_idx}]"
                if not isinstance(row, list):
                    errors.append({
                        "code": "invalid_region_weights",
                        "path": row_path,
                        "message": f"Row {r_idx} must be a list, got {type(row).__name__}",
                    })
                else:
                    if grid_valid and cols is not None and len(row) != cols:
                        errors.append({
                            "code": "invalid_region_weights",
                            "path": row_path,
                            "message": f"Row {r_idx} expected {cols} columns, got {len(row)}",
                        })
                    for c_idx, val in enumerate(row):
                        col_path = f"{row_path}[{c_idx}]"
                        if isinstance(val, bool) or not isinstance(val, (int, float)) or val <= 0 or val > 10:
                            errors.append({
                                "code": "invalid_region_weights",
                                "path": col_path,
                                "message": f"Weight at [{r_idx}][{c_idx}] must be a number > 0 and <= 10 (bool rejected), got {val!r}",
                            })

    return errors


def apply_weights(
    items: list[dict[str, Any]],
    weights: dict[str, Any] | list[list[float | int]],
    grid: tuple[int, int] | dict[str, int] | str,
) -> list[dict[str, Any]]:
    """Apply owner-supplied visual importance weights (V) to region scores.

    AGENT PROPOSAL: Proposed weighting structure and weightedScore formula
    (weightedScore = score * weight) pending open architectural question Q8.

    Args:
        items: List of region dictionaries produced by compute_regions.
        weights: Dictionary containing "grid" and "weights", or 2D list of weights.
        grid: Comparison grid dimensions as (rows, cols), {"rows": R, "cols": C}, or "RxC".

    Returns:
        List of dictionaries {"index": int, "weight": float, "weightedScore": float}
        for regions with differingPixels > 0, sorted by weightedScore descending,
        breaking ties by lower index. Regions with zero differences are omitted.

    Raises:
        WeightsGridMismatchError: If the weights grid dimensions do not match the comparison grid.
        ValueError: If weights structure is invalid.
    """
    if isinstance(grid, dict):
        comp_rows = grid.get("rows")
        comp_cols = grid.get("cols")
    elif isinstance(grid, (tuple, list)) and len(grid) == 2:
        comp_rows, comp_cols = grid
    elif isinstance(grid, str):
        comp_rows, comp_cols = parse_grid(grid)
    else:
        raise ValueError(f"Invalid grid parameter: {grid!r}")

    if isinstance(weights, dict):
        w_grid = weights.get("grid")
        matrix = weights.get("weights")
        if w_grid is not None:
            if isinstance(w_grid, dict):
                w_rows = w_grid.get("rows")
                w_cols = w_grid.get("cols")
            elif isinstance(w_grid, (tuple, list)) and len(w_grid) == 2:
                w_rows, w_cols = w_grid
            else:
                raise WeightsGridMismatchError(f"Invalid weights grid: {w_grid!r}")
            if w_rows != comp_rows or w_cols != comp_cols:
                raise WeightsGridMismatchError(
                    f"Weights grid {w_rows}x{w_cols} does not match comparison grid {comp_rows}x{comp_cols}"
                )
    elif isinstance(weights, list):
        matrix = weights
    else:
        raise ValueError(f"Invalid weights parameter type: {type(weights).__name__}")

    if not isinstance(matrix, list) or len(matrix) != comp_rows:
        raise WeightsGridMismatchError(
            f"Weights row count {len(matrix) if isinstance(matrix, list) else 0} does not match comparison rows {comp_rows}"
        )

    for r_idx, row in enumerate(matrix):
        if not isinstance(row, list) or len(row) != comp_cols:
            raise WeightsGridMismatchError(
                f"Weights column count at row {r_idx} does not match comparison cols {comp_cols}"
            )

    candidates = []
    for item in items:
        if item.get("differingPixels", 0) > 0:
            r = item["row"]
            c = item["col"]
            w = float(matrix[r][c])
            score = float(item["areaFraction"] * item["diffRatio"])
            weighted_score = float(score * w)
            candidates.append({
                "index": item["index"],
                "weight": w,
                "weightedScore": weighted_score,
            })

    # Sort descending by weightedScore, ties broken by lower index
    candidates.sort(key=lambda x: (-x["weightedScore"], x["index"]))

    return candidates


