"""PixelProof image comparison, reporting, and manifest validation package."""

from pixelproof_image.compare import ImageLoadError, ImageSize, compare_images, load_image
from pixelproof_image.manifest import validate_manifest
from pixelproof_image.overlay import make_diff, make_overlay, make_side_by_side
from pixelproof_image.report import run_comparison

__all__ = [
    "ImageLoadError",
    "ImageSize",
    "compare_images",
    "load_image",
    "make_diff",
    "make_overlay",
    "make_side_by_side",
    "run_comparison",
    "validate_manifest",
]
