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

