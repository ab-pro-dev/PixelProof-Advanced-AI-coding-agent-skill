from pathlib import Path
from PIL import Image
import pytest

from pixelproof_image.compare import ImageLoadError, compare_images, load_image


def test_identical_images(tmp_path: Path):
    """Identical images must yield an MAE of 0.0."""
    ref_path = tmp_path / "ref.png"
    act_path = tmp_path / "act.png"

    img = Image.new("RGB", (8, 8), (42, 84, 126))
    img.save(ref_path)
    img.save(act_path)

    result = compare_images(ref_path, act_path)
    assert result["status"] == "compared"
    assert result["referenceSize"] == {"width": 8, "height": 8}
    assert result["actualSize"] == {"width": 8, "height": 8}
    assert result["metrics"]["mae"] == 0.0


def test_all_black_vs_all_white_10x10(tmp_path: Path):
    """All-black vs all-white 10x10 images must yield an MAE of exactly 255.0."""
    ref_path = tmp_path / "black.png"
    act_path = tmp_path / "white.png"

    Image.new("RGB", (10, 10), (0, 0, 0)).save(ref_path)
    Image.new("RGB", (10, 10), (255, 255, 255)).save(act_path)

    result = compare_images(ref_path, act_path)
    assert result["status"] == "compared"
    assert result["referenceSize"] == {"width": 10, "height": 10}
    assert result["actualSize"] == {"width": 10, "height": 10}
    assert result["metrics"]["mae"] == 255.0


def test_2x2_single_pixel_difference(tmp_path: Path):
    """2x2 black reference vs actual with one (30,60,90) pixel must yield MAE of exactly 15.0."""
    ref_path = tmp_path / "ref_2x2.png"
    act_path = tmp_path / "act_2x2.png"

    Image.new("RGB", (2, 2), (0, 0, 0)).save(ref_path)

    act_img = Image.new("RGB", (2, 2), (0, 0, 0))
    act_img.putpixel((0, 0), (30, 60, 90))
    act_img.save(act_path)

    result = compare_images(ref_path, act_path)
    assert result["status"] == "compared"
    assert result["referenceSize"] == {"width": 2, "height": 2}
    assert result["actualSize"] == {"width": 2, "height": 2}
    # 4 pixels * 3 channels = 12 values. Sum of diffs = 30 + 60 + 90 = 180. 180 / 12 = 15.0
    assert result["metrics"]["mae"] == 15.0


def test_different_sizes_dimension_mismatch(tmp_path: Path):
    """Comparing images of different sizes must return dimension_mismatch failure with both sizes."""
    ref_path = tmp_path / "ref_4x4.png"
    act_path = tmp_path / "act_5x4.png"

    Image.new("RGB", (4, 4), (10, 10, 10)).save(ref_path)
    Image.new("RGB", (5, 4), (10, 10, 10)).save(act_path)

    result = compare_images(ref_path, act_path)
    assert result["status"] == "failed"
    assert result["error"]["code"] == "dimension_mismatch"
    assert "metrics" not in result
    assert result["referenceSize"] == {"width": 4, "height": 4}
    assert result["actualSize"] == {"width": 5, "height": 4}


def test_missing_file(tmp_path: Path):
    """Missing file must return missing_file failure with no metrics key."""
    nonexistent = tmp_path / "missing.png"
    valid = tmp_path / "valid.png"
    Image.new("RGB", (4, 4), (0, 0, 0)).save(valid)

    # Missing reference
    res_ref_missing = compare_images(nonexistent, valid)
    assert res_ref_missing["status"] == "failed"
    assert res_ref_missing["error"]["code"] == "missing_file"
    assert "metrics" not in res_ref_missing

    # Missing actual
    res_act_missing = compare_images(valid, nonexistent)
    assert res_act_missing["status"] == "failed"
    assert res_act_missing["error"]["code"] == "missing_file"
    assert "metrics" not in res_act_missing


def test_garbage_bytes(tmp_path: Path):
    """Garbage bytes saved as .png must return unreadable failure."""
    garbage_path = tmp_path / "garbage.png"
    garbage_path.write_bytes(b"garbage not a valid png binary data 1234567890")

    valid_path = tmp_path / "valid.png"
    Image.new("RGB", (4, 4), (0, 0, 0)).save(valid_path)

    result = compare_images(garbage_path, valid_path)
    assert result["status"] == "failed"
    assert result["error"]["code"] == "unreadable"
    assert "metrics" not in result


def test_truncated_valid_png(tmp_path: Path):
    """Truncated valid PNG (first half of bytes) must return unreadable failure."""
    valid_path = tmp_path / "valid.png"
    Image.new("RGB", (20, 20), (100, 150, 200)).save(valid_path, format="PNG")

    full_bytes = valid_path.read_bytes()
    truncated_path = tmp_path / "truncated.png"
    truncated_path.write_bytes(full_bytes[: len(full_bytes) // 2])

    result = compare_images(truncated_path, valid_path)
    assert result["status"] == "failed"
    assert result["error"]["code"] == "unreadable"
    assert "metrics" not in result


def test_transparent_rgba_vs_opaque_white(tmp_path: Path):
    """Fully transparent RGBA composited over white must match opaque white RGB with 0.0 MAE."""
    rgba_path = tmp_path / "transparent.png"
    rgb_path = tmp_path / "white.png"

    # Fully transparent black RGBA
    Image.new("RGBA", (10, 10), (0, 0, 0, 0)).save(rgba_path)
    # Opaque white RGB
    Image.new("RGB", (10, 10), (255, 255, 255)).save(rgb_path)

    result = compare_images(rgba_path, rgb_path)
    assert result["status"] == "compared"
    assert result["referenceSize"] == {"width": 10, "height": 10}
    assert result["actualSize"] == {"width": 10, "height": 10}
    assert result["metrics"]["mae"] == 0.0


def test_load_image_direct_exceptions(tmp_path: Path):
    """Direct load_image calls must raise ImageLoadError with appropriate codes."""
    nonexistent = tmp_path / "nonexistent.png"
    with pytest.raises(ImageLoadError) as exc_missing:
        load_image(nonexistent)
    assert exc_missing.value.code == "missing_file"

    garbage = tmp_path / "garbage.png"
    garbage.write_bytes(b"bad bytes")
    with pytest.raises(ImageLoadError) as exc_unreadable:
        load_image(garbage)
    assert exc_unreadable.value.code == "unreadable"
