"""PixelProof image comparison, reporting, manifest validation, and project inspection package."""

from pixelproof_image.compare import ImageLoadError, ImageSize, compare_images, load_image
from pixelproof_image.final_report import build_report, write_report
from pixelproof_image.inspect_project import inspect_project
from pixelproof_image.manifest import validate_manifest
from pixelproof_image.overlay import make_diff, make_overlay, make_side_by_side
from pixelproof_image.report import run_comparison

__all__ = [
    "ImageLoadError",
    "ImageSize",
    "build_report",
    "compare_images",
    "inspect_project",
    "load_image",
    "make_diff",
    "make_overlay",
    "make_side_by_side",
    "run_comparison",
    "validate_manifest",
    "write_report",
]
