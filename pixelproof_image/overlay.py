"""PixelProof visual artifact generation: overlay, diff, and side-by-side images.

Consistent with §7.4 of the PixelProof specification (overlay, difference image,
side-by-side).

Note on design proposals:
- The 25% dimming for unchanged pixels, the 10px gray separator, and the solid red
  color (255, 0, 0) for differing pixels are AGENT PROPOSALS, not from the spec.
- Blending uses a 50/50 ratio with floor/truncation rounding (every pixel of black
  blended with white is 127).
- The neutral gray separator uses RGB (128, 128, 128).
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Union

import numpy as np
from PIL import Image

from pixelproof_image.compare import ImageLoadError, ImageSize, load_image
from pixelproof_image.hints import make_error


def _prepare_and_validate(
    reference_path: Union[str, os.PathLike],
    actual_path: Union[str, os.PathLike],
    output_path: Union[str, os.PathLike],
    overwrite: bool,
) -> tuple[dict | None, Path, np.ndarray | None, np.ndarray | None, ImageSize | None]:
    """Validate paths, check overwrite, and load both images.

    Returns (failure_dict, out_path, ref_arr, act_arr, size) where failure_dict
    is None on success.
    """
    out_path = Path(output_path)
    if out_path.exists() and not overwrite:
        return (
            {
                "status": "failed",
                "error": make_error("output_exists", f"Output file already exists: {out_path}"),
            },
            out_path,
            None,
            None,
            None,
        )

    try:
        ref_arr, ref_size, _ = load_image(reference_path)
    except ImageLoadError as e:
        return (
            {"status": "failed", "error": make_error(e.code, e.message)},
            out_path,
            None,
            None,
            None,
        )

    try:
        act_arr, act_size, _ = load_image(actual_path)
    except ImageLoadError as e:
        return (
            {"status": "failed", "error": make_error(e.code, e.message)},
            out_path,
            None,
            None,
            None,
        )

    if ref_size != act_size:
        return (
            {
                "status": "failed",
                "error": make_error(
                    "dimension_mismatch",
                    (
                        f"Image dimensions do not match: reference is "
                        f"{ref_size.width}x{ref_size.height}, actual is "
                        f"{act_size.width}x{act_size.height}"
                    ),
                ),
                "referenceSize": {"width": ref_size.width, "height": ref_size.height},
                "actualSize": {"width": act_size.width, "height": act_size.height},
            },
            out_path,
            None,
            None,
            None,
        )

    return None, out_path, ref_arr, act_arr, ref_size


def make_overlay(
    reference_path: Union[str, os.PathLike],
    actual_path: Union[str, os.PathLike],
    output_path: Union[str, os.PathLike],
    overwrite: bool = False,
) -> dict:
    """Create a 50/50 blend overlay of reference and actual images, saved as PNG.

    Never resizes or crops. Fails on dimension mismatch without writing a file.

    Args:
        reference_path: Path to reference image.
        actual_path: Path to actual image.
        output_path: Path where the overlay PNG will be saved.
        overwrite: Whether to overwrite existing output files.

    Returns:
        JSON-serializable result dict:
        - Success: {"status": "written", "path": str, "width": int, "height": int}
        - Failure: {"status": "failed", "error": {"code": str, "message": str}}
    """
    error, out_path, ref_arr, act_arr, size = _prepare_and_validate(
        reference_path, actual_path, output_path, overwrite
    )
    if error is not None:
        return error

    assert ref_arr is not None and act_arr is not None and size is not None

    ref_img = Image.fromarray(ref_arr)
    act_img = Image.fromarray(act_arr)
    # 50/50 blend with integer floor rounding (0.5 * 0 + 0.5 * 255 = 127)
    blend_img = Image.blend(ref_img, act_img, 0.5)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    blend_img.save(out_path, format="PNG")

    return {
        "status": "written",
        "path": str(out_path),
        "width": size.width,
        "height": size.height,
    }


def make_diff(
    reference_path: Union[str, os.PathLike],
    actual_path: Union[str, os.PathLike],
    output_path: Union[str, os.PathLike],
    overwrite: bool = False,
) -> dict:
    """Generate a difference image highlighting pixel mismatches.

    Pixels differing in ANY channel are shown in solid red (255, 0, 0);
    identical pixels are shown as a dimmed (about 25% brightness) copy of reference.

    Args:
        reference_path: Path to reference image.
        actual_path: Path to actual image.
        output_path: Path where the diff PNG will be saved.
        overwrite: Whether to overwrite existing output files.

    Returns:
        JSON-serializable result dict:
        - Success: {"status": "written", "path": str, "width": int, "height": int,
                    "differingPixels": int}
        - Failure: {"status": "failed", "error": {"code": str, "message": str}}
    """
    error, out_path, ref_arr, act_arr, size = _prepare_and_validate(
        reference_path, actual_path, output_path, overwrite
    )
    if error is not None:
        return error

    assert ref_arr is not None and act_arr is not None and size is not None

    # Detect pixels differing in any channel (R, G, or B)
    diff_mask = np.any(ref_arr != act_arr, axis=-1)
    differing_pixels = int(np.sum(diff_mask))

    # Dim identical pixels to 25% brightness of reference
    dimmed_ref = (ref_arr.astype(np.float32) * 0.25).astype(np.uint8)

    # Differing pixels in solid red (255, 0, 0)
    red_pixel = np.array([255, 0, 0], dtype=np.uint8)
    diff_arr = np.where(diff_mask[:, :, None], red_pixel, dimmed_ref)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    diff_img = Image.fromarray(diff_arr)
    diff_img.save(out_path, format="PNG")

    return {
        "status": "written",
        "path": str(out_path),
        "width": size.width,
        "height": size.height,
        "differingPixels": differing_pixels,
    }


def make_side_by_side(
    reference_path: Union[str, os.PathLike],
    actual_path: Union[str, os.PathLike],
    output_path: Union[str, os.PathLike],
    overwrite: bool = False,
) -> dict:
    """Create a side-by-side comparison image: reference on left, actual on right.

    Includes a 10px neutral gray (128, 128, 128) separator between them.
    Output dimensions: width = 2 * W + 10, height = H.

    Args:
        reference_path: Path to reference image.
        actual_path: Path to actual image.
        output_path: Path where the side-by-side PNG will be saved.
        overwrite: Whether to overwrite existing output files.

    Returns:
        JSON-serializable result dict:
        - Success: {"status": "written", "path": str, "width": int, "height": int}
        - Failure: {"status": "failed", "error": {"code": str, "message": str}}
    """
    error, out_path, ref_arr, act_arr, size = _prepare_and_validate(
        reference_path, actual_path, output_path, overwrite
    )
    if error is not None:
        return error

    assert ref_arr is not None and act_arr is not None and size is not None

    # Neutral gray separator of 10px width
    sep_width = 10
    separator = np.full((size.height, sep_width, 3), 128, dtype=np.uint8)

    # Concatenate: [reference, separator, actual] horizontally
    sbs_arr = np.concatenate([ref_arr, separator, act_arr], axis=1)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    sbs_img = Image.fromarray(sbs_arr)
    sbs_img.save(out_path, format="PNG")

    return {
        "status": "written",
        "path": str(out_path),
        "width": 2 * size.width + sep_width,
        "height": size.height,
    }
