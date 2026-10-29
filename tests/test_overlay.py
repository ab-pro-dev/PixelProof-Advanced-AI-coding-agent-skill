from pathlib import Path
import numpy as np
from PIL import Image

from pixelproof_image.overlay import make_diff, make_overlay, make_side_by_side


def test_overlay_black_and_white(tmp_path: Path):
    """50/50 blend of black and white: every pixel is 127 using floor/truncation rounding."""
    ref_path = tmp_path / "black.png"
    act_path = tmp_path / "white.png"
    out_path = tmp_path / "overlay.png"

    Image.new("RGB", (4, 4), (0, 0, 0)).save(ref_path)
    Image.new("RGB", (4, 4), (255, 255, 255)).save(act_path)

    result = make_overlay(ref_path, act_path, out_path)
    assert result["status"] == "written"
    assert result["path"] == str(out_path)
    assert result["width"] == 4
    assert result["height"] == 4

    # Verification: reading back pixels, rounding choice is floor/integer truncation (127)
    with Image.open(out_path) as img:
        arr = np.array(img)
    assert np.all(arr == 127), f"Expected all pixels to be 127, got unique values: {np.unique(arr)}"


def test_diff_identical_images(tmp_path: Path):
    """Diff of identical images must yield differingPixels == 0 and no red pixels."""
    ref_path = tmp_path / "ref.png"
    out_path = tmp_path / "diff_identical.png"

    Image.new("RGB", (4, 4), (100, 150, 200)).save(ref_path)

    result = make_diff(ref_path, ref_path, out_path)
    assert result["status"] == "written"
    assert result["differingPixels"] == 0
    assert result["width"] == 4
    assert result["height"] == 4

    with Image.open(out_path) as img:
        arr = np.array(img)
    # Ensure no pixel is solid red (255, 0, 0)
    has_red = np.any(np.all(arr == [255, 0, 0], axis=-1))
    assert not has_red, "No red pixel should be present for identical images"


def test_diff_2x2_single_pixel_difference(tmp_path: Path):
    """Diff of 2x2 with one changed pixel: differingPixels == 1 and that pixel is (255, 0, 0)."""
    ref_path = tmp_path / "ref_2x2.png"
    act_path = tmp_path / "act_2x2.png"
    out_path = tmp_path / "diff_2x2.png"

    Image.new("RGB", (2, 2), (0, 0, 0)).save(ref_path)

    act_img = Image.new("RGB", (2, 2), (0, 0, 0))
    act_img.putpixel((0, 0), (30, 60, 90))
    act_img.save(act_path)

    result = make_diff(ref_path, act_path, out_path)
    assert result["status"] == "written"
    assert result["differingPixels"] == 1
    assert result["width"] == 2
    assert result["height"] == 2

    with Image.open(out_path) as img:
        arr = np.array(img)

    # Pixel (0, 0) changed -> solid red (255, 0, 0)
    assert list(arr[0, 0]) == [255, 0, 0]
    # Identical pixels -> dimmed black (0, 0, 0)
    assert list(arr[0, 1]) == [0, 0, 0]
    assert list(arr[1, 0]) == [0, 0, 0]
    assert list(arr[1, 1]) == [0, 0, 0]


def test_side_by_side_3x2(tmp_path: Path):
    """Side-by-side of 3x2 images: output is 16x2 and separator columns are neutral gray (128, 128, 128)."""
    ref_path = tmp_path / "ref_3x2.png"
    act_path = tmp_path / "act_3x2.png"
    out_path = tmp_path / "sbs_3x2.png"

    Image.new("RGB", (3, 2), (10, 20, 30)).save(ref_path)
    Image.new("RGB", (3, 2), (200, 210, 220)).save(act_path)

    result = make_side_by_side(ref_path, act_path, out_path)
    assert result["status"] == "written"
    # Output width = 2 * 3 + 10 = 16, height = 2
    assert result["width"] == 16
    assert result["height"] == 2

    with Image.open(out_path) as img:
        assert img.size == (16, 2)
        arr = np.array(img)

    # Check reference columns: 0, 1, 2
    assert np.all(arr[:, 0:3] == [10, 20, 30])
    # Check 10 separator columns: 3 through 12 are neutral gray (128, 128, 128)
    assert np.all(arr[:, 3:13] == [128, 128, 128])
    # Check actual columns: 13, 14, 15
    assert np.all(arr[:, 13:16] == [200, 210, 220])


def test_dimension_mismatch_no_file_written(tmp_path: Path):
    """Refuse to run on dimension mismatch; return failed dict format; no output file written."""
    ref_path = tmp_path / "ref_4x4.png"
    act_path = tmp_path / "act_5x4.png"

    Image.new("RGB", (4, 4), (0, 0, 0)).save(ref_path)
    Image.new("RGB", (5, 4), (0, 0, 0)).save(act_path)

    funcs = [make_overlay, make_diff, make_side_by_side]
    for idx, fn in enumerate(funcs):
        out_path = tmp_path / f"should_not_exist_{idx}.png"
        result = fn(ref_path, act_path, out_path)

        assert result["status"] == "failed"
        assert result["error"]["code"] == "dimension_mismatch"
        assert result["referenceSize"] == {"width": 4, "height": 4}
        assert result["actualSize"] == {"width": 5, "height": 4}
        assert not out_path.exists(), f"File should not have been created: {out_path}"


def test_existing_output_file_without_overwrite(tmp_path: Path):
    """Existing output file without overwrite returns output_exists and preserves file."""
    ref_path = tmp_path / "ref.png"
    act_path = tmp_path / "act.png"
    out_path = tmp_path / "existing.png"

    Image.new("RGB", (4, 4), (0, 0, 0)).save(ref_path)
    Image.new("RGB", (4, 4), (255, 255, 255)).save(act_path)

    # Create existing file with known sentinel content
    sentinel_bytes = b"ORIGINAL_SENTINEL_CONTENT_DO_NOT_TOUCH"
    out_path.write_bytes(sentinel_bytes)

    # Attempt to write without overwrite=True
    result = make_overlay(ref_path, act_path, out_path, overwrite=False)
    assert result["status"] == "failed"
    assert result["error"]["code"] == "output_exists"
    assert out_path.read_bytes() == sentinel_bytes, "Original file was modified without overwrite"

    # Attempt with overwrite=True
    result_overwrite = make_overlay(ref_path, act_path, out_path, overwrite=True)
    assert result_overwrite["status"] == "written"
    assert out_path.read_bytes() != sentinel_bytes, "File should have been overwritten"


def test_nonexistent_nested_folder_created(tmp_path: Path):
    """Parent directories are automatically created if output_path is in a nested folder."""
    ref_path = tmp_path / "ref.png"
    act_path = tmp_path / "act.png"
    nested_out = tmp_path / "deeply" / "nested" / "artifacts" / "output.png"

    Image.new("RGB", (4, 4), (50, 50, 50)).save(ref_path)
    Image.new("RGB", (4, 4), (100, 100, 100)).save(act_path)

    assert not nested_out.parent.exists()

    result = make_overlay(ref_path, act_path, nested_out)
    assert result["status"] == "written"
    assert nested_out.exists()
