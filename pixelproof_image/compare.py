"""PixelProof image loading, validation, and Mean Absolute Error (MAE) comparison.

Note on provisional choices:
- Status values "compared" and "failed" returned by compare_images are provisional;
  the complete report status vocabulary is flagged as an open architectural question
  (spec Q5 in Appendix A of docs/pixelproof-project-documentation.md).
- Compositing images with transparency (RGBA, LA, P) over a solid white background
  before conversion to RGB is an explicit assumption until reference background handling
  is formally decided.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import NamedTuple, Union

import numpy as np
from PIL import Image, ImageFile

from pixelproof_image.hints import make_error

# Ensure truncated images trigger errors rather than partial loading
ImageFile.LOAD_TRUNCATED_IMAGES = False


class ImageSize(NamedTuple):
    """Image dimensions in pixels (width, height)."""

    width: int
    height: int


class ImageLoadError(Exception):
    """Raised when an image cannot be loaded or decoded."""

    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.message = message
        self.code = code


def load_image(
    path: Union[str, os.PathLike],
) -> tuple[np.ndarray, ImageSize, str]:
    """Fully decode an image from disk and return its RGB array, size, and mode.

    Args:
        path: Path to the image file.

    Returns:
        A tuple of (rgb_array, original_size, original_mode):
        - rgb_array: uint8 numpy array of shape (height, width, 3) in RGB order.
        - original_size: ImageSize namedtuple with (width, height).
        - original_mode: string mode of the original image (e.g. 'RGBA', 'RGB').

    Raises:
        ImageLoadError: with code 'missing_file' if path does not exist,
            or 'unreadable' if file is corrupted, truncated, or invalid.
    """
    path_obj = Path(path)
    if not path_obj.exists():
        raise ImageLoadError(f"File not found: {path}", code="missing_file")
    if path_obj.is_dir():
        raise ImageLoadError(f"Path is a directory: {path}", code="unreadable")

    try:
        with Image.open(path_obj) as img:
            original_size = ImageSize(width=img.size[0], height=img.size[1])
            original_mode = img.mode

            # Fully decode pixel data so truncated or corrupted files are caught
            img.load()

            # Handle transparency: composite over solid white, then convert to RGB
            if original_mode in ("RGBA", "LA", "P"):
                rgba_img = img.convert("RGBA")
                background = Image.new("RGBA", (original_size.width, original_size.height), (255, 255, 255, 255))
                composite = Image.alpha_composite(background, rgba_img)
                rgb_img = composite.convert("RGB")
            elif original_mode != "RGB":
                rgb_img = img.convert("RGB")
            else:
                rgb_img = img.copy()

            arr = np.array(rgb_img, dtype=np.uint8)
            return arr, original_size, original_mode
    except ImageLoadError:
        raise
    except FileNotFoundError as e:
        raise ImageLoadError(f"File not found: {path}", code="missing_file") from e
    except Exception as e:
        raise ImageLoadError(f"Unreadable image file {path}: {e}", code="unreadable") from e


def compare_images(
    reference_path: Union[str, os.PathLike],
    actual_path: Union[str, os.PathLike],
) -> dict:
    """Compare reference and actual images using Mean Absolute Error (MAE).

    Never resizes or crops to force a match.

    Args:
        reference_path: Path to the reference image.
        actual_path: Path to the actual implementation screenshot.

    Returns:
        A JSON-serializable dictionary with comparison results:
        - On success:
          {
              "status": "compared",
              "referenceSize": {"width": int, "height": int},
              "actualSize": {"width": int, "height": int},
              "metrics": {"mae": float}
          }
        - On failure:
          {
              "status": "failed",
              "error": {"code": str, "message": str},
              ["referenceSize": {"width": int, "height": int},]
              ["actualSize": {"width": int, "height": int}]
          }
    """
    try:
        ref_arr, ref_size, _ = load_image(reference_path)
    except ImageLoadError as e:
        return {
            "status": "failed",
            "error": make_error(e.code, e.message),
        }

    try:
        act_arr, act_size, _ = load_image(actual_path)
    except ImageLoadError as e:
        return {
            "status": "failed",
            "error": make_error(e.code, e.message),
        }

    ref_size_dict = {"width": ref_size.width, "height": ref_size.height}
    act_size_dict = {"width": act_size.width, "height": act_size.height}

    # Dimensions must match exactly; never resize or crop to force a match
    if ref_size != act_size:
        return {
            "status": "failed",
            "error": make_error(
                "dimension_mismatch",
                (
                    f"Image dimensions do not match: reference is "
                    f"{ref_size.width}x{ref_size.height}, actual is "
                    f"{act_size.width}x{act_size.height}"
                ),
            ),
            "referenceSize": ref_size_dict,
            "actualSize": act_size_dict,
        }

    # Compute MAE over all channel values in float64 to avoid uint8 wraparound
    diff = np.abs(ref_arr.astype(np.float64) - act_arr.astype(np.float64))
    mae = float(np.mean(diff))

    return {
        "status": "compared",
        "referenceSize": ref_size_dict,
        "actualSize": act_size_dict,
        "metrics": {"mae": mae},
    }
