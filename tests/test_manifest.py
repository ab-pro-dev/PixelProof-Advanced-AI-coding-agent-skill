import json
import os
from pathlib import Path
import subprocess
import sys
from PIL import Image

from pixelproof_image.manifest import validate_manifest


def _create_image(path: Path, size: tuple[int, int] = (100, 100), color=(10, 20, 30)) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", size, color).save(path)


def test_valid_two_reference_manifest(tmp_path: Path):
    """A valid 2-reference manifest returns status 'valid' with normalized entries and absolute image paths."""
    manifest_path = tmp_path / "references.json"
    img1 = tmp_path / "ref1.png"
    img2 = tmp_path / "sub" / "ref2.png"
    _create_image(img1, (100, 80))
    _create_image(img2, (200, 160))

    manifest_data = {
        "version": 1,
        "project": {
            "name": "Test Project",
            "baseUrl": "http://localhost:3000",
        },
        "references": [
            {
                "id": "page-home",
                "image": "ref1.png",
                "route": "/",
                "viewport": {"width": 100, "height": 80},
                "captureType": "viewport",
            },
            {
                "id": "page-about",
                "image": "sub/ref2.png",
                "route": "/about",
                "viewport": {"width": 200, "height": 160},
                "captureType": "viewport",
                "deviceScaleFactor": 1,
            },
        ],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "valid"
    assert result["referenceCount"] == 2
    assert len(result["references"]) == 2

    ref0 = result["references"][0]
    assert ref0["id"] == "page-home"
    assert ref0["image"] == str(img1.resolve())
    assert ref0["route"] == "/"
    assert ref0["viewport"] == {"width": 100, "height": 80}
    assert ref0["deviceScaleFactor"] == 1
    assert ref0["captureType"] == "viewport"

    ref1 = result["references"][1]
    assert ref1["id"] == "page-about"
    assert ref1["image"] == str(img2.resolve())
    assert ref1["route"] == "/about"
    assert ref1["viewport"] == {"width": 200, "height": 160}
    assert ref1["deviceScaleFactor"] == 1


def test_missing_manifest(tmp_path: Path):
    """Missing manifest file returns manifest_missing error."""
    nonexistent = tmp_path / "missing.json"
    result = validate_manifest(nonexistent)

    assert result["status"] == "invalid"
    assert len(result["errors"]) == 1
    assert result["errors"][0]["code"] == "manifest_missing"


def test_bad_json(tmp_path: Path):
    """Malformed JSON returns manifest_unparseable error."""
    manifest_path = tmp_path / "references.json"
    manifest_path.write_text("{ unparseable json content : true ", encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "invalid"
    assert any(err["code"] == "manifest_unparseable" for err in result["errors"])


def test_wrong_version(tmp_path: Path):
    """Version other than 1 returns invalid_version error."""
    manifest_path = tmp_path / "references.json"
    img = tmp_path / "ref.png"
    _create_image(img, (10, 10))

    manifest_data = {
        "version": 2,
        "references": [
            {
                "id": "home",
                "image": "ref.png",
                "route": "/",
                "viewport": {"width": 10, "height": 10},
                "captureType": "viewport",
            }
        ],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "invalid"
    assert any(err["code"] == "invalid_version" and err["path"] == "version" for err in result["errors"])


def test_empty_references(tmp_path: Path):
    """Empty references list returns empty_references error."""
    manifest_path = tmp_path / "references.json"
    manifest_data = {
        "version": 1,
        "references": [],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "invalid"
    assert any(err["code"] == "empty_references" and err["path"] == "references" for err in result["errors"])


def test_bool_as_width(tmp_path: Path):
    """Boolean value for viewport width must NOT count as an integer."""
    manifest_path = tmp_path / "references.json"
    img = tmp_path / "ref.png"
    _create_image(img, (10, 10))

    manifest_data = {
        "version": 1,
        "references": [
            {
                "id": "home",
                "image": "ref.png",
                "route": "/",
                "viewport": {"width": True, "height": 10},
                "captureType": "viewport",
            }
        ],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "invalid"
    assert any(
        err["code"] == "invalid_viewport" and err["path"] == "references[0].viewport.width"
        for err in result["errors"]
    )


def test_duplicate_ids(tmp_path: Path):
    """Duplicate reference IDs are reported with code duplicate_id."""
    manifest_path = tmp_path / "references.json"
    img1 = tmp_path / "ref1.png"
    img2 = tmp_path / "ref2.png"
    _create_image(img1, (10, 10))
    _create_image(img2, (10, 10))

    manifest_data = {
        "version": 1,
        "references": [
            {
                "id": "dup-id",
                "image": "ref1.png",
                "route": "/",
                "viewport": {"width": 10, "height": 10},
                "captureType": "viewport",
            },
            {
                "id": "dup-id",
                "image": "ref2.png",
                "route": "/about",
                "viewport": {"width": 10, "height": 10},
                "captureType": "viewport",
            },
        ],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "invalid"
    assert any(
        err["code"] == "duplicate_id" and err["path"] == "references[1].id"
        for err in result["errors"]
    )


def test_dot_dot_path_escape(tmp_path: Path):
    """Image path with '..' escaping manifest folder returns path_escape."""
    manifest_dir = tmp_path / "manifests"
    manifest_dir.mkdir()
    manifest_path = manifest_dir / "references.json"

    manifest_data = {
        "version": 1,
        "references": [
            {
                "id": "escape",
                "image": "../escape.png",
                "route": "/",
                "viewport": {"width": 10, "height": 10},
                "captureType": "viewport",
            }
        ],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "invalid"
    assert any(
        err["code"] == "path_escape" and err["path"] == "references[0].image"
        for err in result["errors"]
    )


def test_absolute_path(tmp_path: Path):
    """Absolute image path returns path_escape."""
    manifest_path = tmp_path / "references.json"
    abs_path = "/tmp/abs.png"

    manifest_data = {
        "version": 1,
        "references": [
            {
                "id": "abs-image",
                "image": abs_path,
                "route": "/",
                "viewport": {"width": 10, "height": 10},
                "captureType": "viewport",
            }
        ],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "invalid"
    assert any(
        err["code"] == "path_escape" and err["path"] == "references[0].image"
        for err in result["errors"]
    )


def test_symlink_escape(tmp_path: Path):
    """Symlink pointing outside manifest folder is blocked with code path_escape."""
    manifest_dir = tmp_path / "project_manifest"
    manifest_dir.mkdir()
    manifest_path = manifest_dir / "references.json"

    outside_image = tmp_path / "outside.png"
    _create_image(outside_image, (10, 10))

    symlink_image = manifest_dir / "symlink.png"
    symlink_image.symlink_to(outside_image)

    manifest_data = {
        "version": 1,
        "references": [
            {
                "id": "symlink-ref",
                "image": "symlink.png",
                "route": "/",
                "viewport": {"width": 10, "height": 10},
                "captureType": "viewport",
            }
        ],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "invalid"
    assert any(
        err["code"] == "path_escape" and err["path"] == "references[0].image"
        for err in result["errors"]
    )


def test_missing_image(tmp_path: Path):
    """Image file that does not exist returns image_missing."""
    manifest_path = tmp_path / "references.json"

    manifest_data = {
        "version": 1,
        "references": [
            {
                "id": "missing-img",
                "image": "not_there.png",
                "route": "/",
                "viewport": {"width": 10, "height": 10},
                "captureType": "viewport",
            }
        ],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "invalid"
    assert any(
        err["code"] == "image_missing" and err["path"] == "references[0].image"
        for err in result["errors"]
    )


def test_corrupt_image(tmp_path: Path):
    """Corrupt image file returns image_unreadable."""
    manifest_path = tmp_path / "references.json"
    corrupt_file = tmp_path / "corrupt.png"
    corrupt_file.write_bytes(b"garbage not a png file 1234567890")

    manifest_data = {
        "version": 1,
        "references": [
            {
                "id": "corrupt-img",
                "image": "corrupt.png",
                "route": "/",
                "viewport": {"width": 10, "height": 10},
                "captureType": "viewport",
            }
        ],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "invalid"
    assert any(
        err["code"] == "image_unreadable" and err["path"] == "references[0].image"
        for err in result["errors"]
    )


def test_image_size_mismatch(tmp_path: Path):
    """Image dimensions not matching viewport returns image_size_mismatch with both sizes in message."""
    manifest_path = tmp_path / "references.json"
    img = tmp_path / "ref.png"
    _create_image(img, (100, 100))  # Actual is 100x100

    manifest_data = {
        "version": 1,
        "references": [
            {
                "id": "mismatch-size",
                "image": "ref.png",
                "route": "/",
                "viewport": {"width": 150, "height": 100},  # Expected is 150x100
                "captureType": "viewport",
            }
        ],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "invalid"
    mismatch_errors = [
        err for err in result["errors"]
        if err["code"] == "image_size_mismatch" and err["path"] == "references[0].image"
    ]
    assert len(mismatch_errors) == 1
    msg = mismatch_errors[0]["message"]
    assert "100x100" in msg
    assert "150x100" in msg


def test_device_scale_factor_2_with_2x_image(tmp_path: Path):
    """deviceScaleFactor 2 with 2x image dimensions succeeds as valid."""
    manifest_path = tmp_path / "references.json"
    img = tmp_path / "ref_retina.png"
    # Viewport is 100x80, scale 2 -> expected 200x160
    _create_image(img, (200, 160))

    manifest_data = {
        "version": 1,
        "references": [
            {
                "id": "retina-ref",
                "image": "ref_retina.png",
                "route": "/retina",
                "viewport": {"width": 100, "height": 80},
                "deviceScaleFactor": 2,
                "captureType": "viewport",
            }
        ],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "valid"
    assert result["referenceCount"] == 1
    assert result["references"][0]["deviceScaleFactor"] == 2


def test_three_simultaneous_errors_reports_all_three(tmp_path: Path):
    """Manifest with 3 simultaneous errors reports all 3 errors."""
    manifest_path = tmp_path / "references.json"

    # 1. version error (version 99)
    # 2. path_escape error (image ../escape.png)
    # 3. invalid_route error (route without leading slash)
    manifest_data = {
        "version": 99,
        "references": [
            {
                "id": "test-three",
                "image": "../escape.png",
                "route": "invalid-route-no-slash",
                "viewport": {"width": 100, "height": 100},
                "captureType": "viewport",
            }
        ],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "invalid"
    assert len(result["errors"]) == 3

    error_codes = {err["code"] for err in result["errors"]}
    assert "invalid_version" in error_codes
    assert "path_escape" in error_codes
    assert "invalid_route" in error_codes


def test_unknown_extra_fields_ignored(tmp_path: Path):
    """Unknown extra fields at top-level and reference-level are ignored."""
    manifest_path = tmp_path / "references.json"
    img = tmp_path / "ref.png"
    _create_image(img, (50, 50))

    manifest_data = {
        "version": 1,
        "extraTopLevelField": "ignored_value",
        "customSettings": {"a": 1, "b": 2},
        "references": [
            {
                "id": "extra-ref",
                "image": "ref.png",
                "route": "/",
                "viewport": {"width": 50, "height": 50},
                "captureType": "viewport",
                "customAnnotation": "note for agent",
                "tags": ["hero", "desktop"],
            }
        ],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "valid"
    assert result["referenceCount"] == 1


def test_cli_validate_subprocess(tmp_path: Path):
    """CLI subcommand validate --manifest PATH works via subprocess."""
    manifest_path = tmp_path / "references.json"
    img = tmp_path / "cli_ref.png"
    _create_image(img, (40, 40))

    manifest_data = {
        "version": 1,
        "references": [
            {
                "id": "cli-valid",
                "image": "cli_ref.png",
                "route": "/test",
                "viewport": {"width": 40, "height": 40},
                "captureType": "viewport",
            }
        ],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    # Success: exit code 0
    cmd_valid = [
        sys.executable,
        "-m",
        "pixelproof_image.cli",
        "validate",
        "--manifest",
        str(manifest_path),
    ]
    proc_valid = subprocess.run(cmd_valid, capture_output=True, text=True)
    assert proc_valid.returncode == 0
    data_valid = json.loads(proc_valid.stdout)
    assert data_valid["status"] == "valid"
    assert data_valid["referenceCount"] == 1

    # Failure: exit code 1
    invalid_manifest = tmp_path / "invalid.json"
    invalid_manifest.write_text(json.dumps({"version": 99, "references": []}), encoding="utf-8")
    cmd_invalid = [
        sys.executable,
        "-m",
        "pixelproof_image.cli",
        "validate",
        "--manifest",
        str(invalid_manifest),
    ]
    proc_invalid = subprocess.run(cmd_invalid, capture_output=True, text=True)
    assert proc_invalid.returncode == 1
    data_invalid = json.loads(proc_invalid.stdout)
    assert data_invalid["status"] == "invalid"
    assert len(data_invalid["errors"]) > 0


def test_valid_region_weights_manifest(tmp_path: Path):
    """Manifest with valid regionWeights is accepted and preserves regionWeights."""
    manifest_path = tmp_path / "references.json"
    img = tmp_path / "ref.png"
    _create_image(img, (50, 50))

    region_weights = {
        "grid": {"rows": 2, "cols": 2},
        "weights": [
            [1.0, 2.5],
            [3.0, 10.0],
        ],
    }

    manifest_data = {
        "version": 1,
        "references": [
            {
                "id": "weighted-ref",
                "image": "ref.png",
                "route": "/weighted",
                "viewport": {"width": 50, "height": 50},
                "captureType": "viewport",
                "regionWeights": region_weights,
            }
        ],
    }
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    result = validate_manifest(manifest_path)
    assert result["status"] == "valid"
    assert result["referenceCount"] == 1
    ref = result["references"][0]
    assert "regionWeights" in ref
    assert ref["regionWeights"] == region_weights


def test_invalid_region_weights_manifest_shapes(tmp_path: Path):
    """Manifest rejects various invalid shapes of regionWeights with code invalid_region_weights."""
    img = tmp_path / "ref.png"
    _create_image(img, (50, 50))

    invalid_cases = [
        # (regionWeights dict, expected path substring)
        ({"grid": {"rows": 2, "cols": 2}, "weights": [[1.0, 2.0]]}, "weights"),  # wrong row count (1 instead of 2)
        ({"grid": {"rows": 2, "cols": 2}, "weights": [[1.0, 2.0, 3.0], [1.0, 2.0]]}, "weights[0]"),  # wrong col count in row 0
        ({"grid": {"rows": 2, "cols": 2}, "weights": [[0, 1.0], [2.0, 3.0]]}, "weights[0][0]"),  # zero
        ({"grid": {"rows": 2, "cols": 2}, "weights": [[-1.5, 1.0], [2.0, 3.0]]}, "weights[0][0]"),  # negative
        ({"grid": {"rows": 2, "cols": 2}, "weights": [[11, 1.0], [2.0, 3.0]]}, "weights[0][0]"),  # > 10 (11)
        ({"grid": {"rows": 2, "cols": 2}, "weights": [[True, 1.0], [2.0, 3.0]]}, "weights[0][0]"),  # bool in weight
        ({"grid": {"rows": 2, "cols": 2}, "weights": [["5", 1.0], [2.0, 3.0]]}, "weights[0][0]"),  # string in weight
        ({"grid": {"rows": True, "cols": 2}, "weights": [[1.0, 2.0]]}, "grid.rows"),  # bool in rows
        ({"grid": {"rows": 0, "cols": 2}, "weights": []}, "grid.rows"),  # 0 rows
        ({"grid": {"rows": 2, "cols": -1}, "weights": [[1.0], [1.0]]}, "grid.cols"),  # negative cols
    ]

    for idx, (rw, path_part) in enumerate(invalid_cases):
        mpath = tmp_path / f"ref_invalid_{idx}.json"
        manifest_data = {
            "version": 1,
            "references": [
                {
                    "id": f"invalid-rw-{idx}",
                    "image": "ref.png",
                    "route": f"/{idx}",
                    "viewport": {"width": 50, "height": 50},
                    "captureType": "viewport",
                    "regionWeights": rw,
                }
            ],
        }
        mpath.write_text(json.dumps(manifest_data), encoding="utf-8")
        res = validate_manifest(mpath)
        assert res["status"] == "invalid", f"Expected case {idx} to be invalid: {rw}"
        assert any(
            err["code"] == "invalid_region_weights" and path_part in err["path"]
            for err in res["errors"]
        ), f"Case {idx} did not have invalid_region_weights with {path_part}: {res['errors']}"

