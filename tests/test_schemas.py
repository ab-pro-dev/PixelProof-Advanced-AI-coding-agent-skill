"""Tests for JSON Schemas contracts and validation consistency.

Validates:
1. Real output of Python validate CLI and sample-project manifest against references.schema.json.
2. Real output of Python compare CLI (success and dimension_mismatch) against comparison-report.schema.json.
3. config/default.json against config.schema.json.
4. Schema negative rejection cases (version, empty array, bad id, captureType, forbidden fields).
5. Drift check: Schema verdict equals Python validate verdict across 8+ test manifests.
"""

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys

import jsonschema
from PIL import Image
import pytest

from pixelproof_image.manifest import validate_manifest

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMAS_DIR = REPO_ROOT / "schemas"
REFERENCES_SCHEMA_PATH = SCHEMAS_DIR / "references.schema.json"
COMPARISON_REPORT_SCHEMA_PATH = SCHEMAS_DIR / "comparison-report.schema.json"
CONFIG_SCHEMA_PATH = SCHEMAS_DIR / "config.schema.json"
CONFIG_DEFAULT_PATH = REPO_ROOT / "config" / "default.json"
SAMPLE_MANIFEST_PATH = REPO_ROOT / "examples" / "sample-project" / "references" / "references.json"


@pytest.fixture(scope="module")
def references_schema() -> dict:
    with open(REFERENCES_SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def comparison_report_schema() -> dict:
    with open(COMPARISON_REPORT_SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def config_schema() -> dict:
    with open(CONFIG_SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def test_manifest_schema_real_output(references_schema: dict):
    """Part a: Validate real manifest file and real Python validate CLI output."""
    with open(SAMPLE_MANIFEST_PATH, "r", encoding="utf-8") as f:
        sample_manifest = json.load(f)

    # Validate manifest against references.schema.json
    jsonschema.validate(sample_manifest, references_schema)

    # Run real Python validate CLI
    res = subprocess.run(
        [sys.executable, "-m", "pixelproof_image.cli", "validate", "--manifest", str(SAMPLE_MANIFEST_PATH)],
        capture_output=True,
        text=True,
        check=True,
    )
    cli_output = json.loads(res.stdout)
    assert cli_output["status"] == "valid"
    assert cli_output["referenceCount"] == len(sample_manifest["references"])
    assert len(cli_output["references"]) == cli_output["referenceCount"]


def test_compare_cli_outputs_against_schema(comparison_report_schema: dict, tmp_path: Path):
    """Part b: Run real compare CLI (success and dimension_mismatch) and validate outputs."""
    p_ref = tmp_path / "ref.png"
    p_act = tmp_path / "act.png"
    p_mismatch = tmp_path / "mismatch.png"

    Image.new("RGB", (10, 10), "blue").save(p_ref)
    Image.new("RGB", (10, 10), "blue").save(p_act)
    Image.new("RGB", (10, 20), "blue").save(p_mismatch)

    # 1. Success comparison
    out_succ = tmp_path / "out_succ"
    res_succ = subprocess.run(
        [
            sys.executable,
            "-m",
            "pixelproof_image.cli",
            "compare",
            "--id",
            "test-success",
            "--reference",
            str(p_ref),
            "--actual",
            str(p_act),
            "--out",
            str(out_succ),
        ],
        capture_output=True,
        text=True,
    )
    assert res_succ.returncode == 0
    output_succ = json.loads(res_succ.stdout)
    assert output_succ["status"] == "compared"
    jsonschema.validate(output_succ, comparison_report_schema)

    # 2. Dimension mismatch comparison
    out_fail = tmp_path / "out_fail"
    res_fail = subprocess.run(
        [
            sys.executable,
            "-m",
            "pixelproof_image.cli",
            "compare",
            "--id",
            "test-mismatch",
            "--reference",
            str(p_ref),
            "--actual",
            str(p_mismatch),
            "--out",
            str(out_fail),
        ],
        capture_output=True,
        text=True,
    )
    assert res_fail.returncode == 1
    output_fail = json.loads(res_fail.stdout)
    assert output_fail["status"] == "failed"
    assert output_fail["error"]["code"] == "dimension_mismatch"
    jsonschema.validate(output_fail, comparison_report_schema)


def test_config_default_against_schema(config_schema: dict):
    """Part c: Validate config/default.json against config.schema.json."""
    with open(CONFIG_DEFAULT_PATH, "r", encoding="utf-8") as f:
        config_data = json.load(f)
    jsonschema.validate(config_data, config_schema)


def test_negative_cases_rejected_by_schemas(references_schema: dict, comparison_report_schema: dict):
    """Part d: Negative cases that schemas must reject."""
    base_ref = {
        "id": "ref-1",
        "route": "/",
        "captureType": "viewport",
        "viewport": {"width": 100, "height": 80},
        "image": "landing.png",
    }

    # 1. version 2
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate({"version": 2, "references": [base_ref]}, references_schema)

    # 2. empty references
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate({"version": 1, "references": []}, references_schema)

    # 3. bool width
    with pytest.raises(jsonschema.ValidationError):
        bad_viewport = dict(base_ref, viewport={"width": True, "height": 80})
        jsonschema.validate({"version": 1, "references": [bad_viewport]}, references_schema)

    # 4. captureType "fullpage"
    with pytest.raises(jsonschema.ValidationError):
        bad_type = dict(base_ref, captureType="fullpage")
        jsonschema.validate({"version": 1, "references": [bad_type]}, references_schema)

    # 5. absolute image path
    with pytest.raises(jsonschema.ValidationError):
        bad_img = dict(base_ref, image="/absolute/path.png")
        jsonschema.validate({"version": 1, "references": [bad_img]}, references_schema)

    # 6. bad id (contains spaces or illegal characters)
    with pytest.raises(jsonschema.ValidationError):
        bad_id = dict(base_ref, id="bad id with spaces")
        jsonschema.validate({"version": 1, "references": [bad_id]}, references_schema)

    # 7. failed report that contains "metrics" (forbidden)
    with pytest.raises(jsonschema.ValidationError):
        bad_failed_report = {
            "referenceId": "r1",
            "status": "failed",
            "error": {"code": "some_err", "message": "msg"},
            "metrics": {"mae": 0.0},
        }
        jsonschema.validate(bad_failed_report, comparison_report_schema)

    # 8. compared report missing "metrics"
    with pytest.raises(jsonschema.ValidationError):
        bad_compared_report = {
            "referenceId": "r1",
            "status": "compared",
            "referenceSize": {"width": 10, "height": 10},
            "actualSize": {"width": 10, "height": 10},
            "artifacts": {"overlay": "ov.png", "diff": "df.png", "sideBySide": "sb.png"},
            "differingPixels": 0,
            "issues": [],
        }
        jsonschema.validate(bad_compared_report, comparison_report_schema)


def test_drift_check_manifest_schema_vs_python(references_schema: dict, tmp_path: Path):
    """Part e: Drift check across 11 test manifests comparing schema verdict vs Python verdict."""
    validator = jsonschema.Draft202012Validator(references_schema)

    # Generate reference images to support valid tests
    img10 = tmp_path / "img10.png"
    img20 = tmp_path / "img20.png"
    Image.new("RGB", (10, 10), "red").save(img10)
    Image.new("RGB", (20, 20), "red").save(img20)

    test_cases = [
        # 1. Valid minimal
        (
            {
                "version": 1,
                "references": [
                    {
                        "id": "r1",
                        "route": "/",
                        "captureType": "viewport",
                        "viewport": {"width": 10, "height": 10},
                        "image": "img10.png",
                    }
                ],
            },
            True,
        ),
        # 2. Valid with optional fields
        (
            {
                "version": 1,
                "project": {"baseUrl": "http://localhost:3000", "name": "test-project"},
                "references": [
                    {
                        "id": "r1",
                        "route": "/",
                        "captureType": "viewport",
                        "viewport": {"width": 10, "height": 10},
                        "deviceScaleFactor": 2,
                        "image": "img20.png",
                    }
                ],
            },
            True,
        ),
        # 3. Valid multi-reference
        (
            {
                "version": 1,
                "references": [
                    {
                        "id": "r1",
                        "route": "/",
                        "captureType": "viewport",
                        "viewport": {"width": 10, "height": 10},
                        "image": "img10.png",
                    },
                    {
                        "id": "r2",
                        "route": "/dashboard",
                        "captureType": "viewport",
                        "viewport": {"width": 20, "height": 20},
                        "image": "img20.png",
                    },
                ],
            },
            True,
        ),
        # 4. Invalid version
        (
            {
                "version": 99,
                "references": [
                    {
                        "id": "r1",
                        "route": "/",
                        "captureType": "viewport",
                        "viewport": {"width": 10, "height": 10},
                        "image": "img10.png",
                    }
                ],
            },
            False,
        ),
        # 5. Invalid empty references
        ({"version": 1, "references": []}, False),
        # 6. Invalid bad id
        (
            {
                "version": 1,
                "references": [
                    {
                        "id": "@bad_id!",
                        "route": "/",
                        "captureType": "viewport",
                        "viewport": {"width": 10, "height": 10},
                        "image": "img10.png",
                    }
                ],
            },
            False,
        ),
        # 7. Invalid route (missing leading slash)
        (
            {
                "version": 1,
                "references": [
                    {
                        "id": "r1",
                        "route": "no-leading-slash",
                        "captureType": "viewport",
                        "viewport": {"width": 10, "height": 10},
                        "image": "img10.png",
                    }
                ],
            },
            False,
        ),
        # 8. Invalid captureType
        (
            {
                "version": 1,
                "references": [
                    {
                        "id": "r1",
                        "route": "/",
                        "captureType": "fullpage",
                        "viewport": {"width": 10, "height": 10},
                        "image": "img10.png",
                    }
                ],
            },
            False,
        ),
        # 9. Invalid viewport type (width string)
        (
            {
                "version": 1,
                "references": [
                    {
                        "id": "r1",
                        "route": "/",
                        "captureType": "viewport",
                        "viewport": {"width": "100", "height": 10},
                        "image": "img10.png",
                    }
                ],
            },
            False,
        ),
        # 10. Invalid viewport height (zero)
        (
            {
                "version": 1,
                "references": [
                    {
                        "id": "r1",
                        "route": "/",
                        "captureType": "viewport",
                        "viewport": {"width": 10, "height": 0},
                        "image": "img10.png",
                    }
                ],
            },
            False,
        ),
        # 11. Invalid image (absolute path)
        (
            {
                "version": 1,
                "references": [
                    {
                        "id": "r1",
                        "route": "/",
                        "captureType": "viewport",
                        "viewport": {"width": 10, "height": 10},
                        "image": "/img10.png",
                    }
                ],
            },
            False,
        ),
    ]

    for idx, (data, expected_valid) in enumerate(test_cases):
        mf_path = tmp_path / f"manifest_{idx}.json"
        with open(mf_path, "w", encoding="utf-8") as f:
            json.dump(data, f)

        schema_valid = validator.is_valid(data)
        python_res = validate_manifest(mf_path)
        python_valid = python_res["status"] == "valid"

        assert schema_valid == expected_valid, f"Case {idx} schema verdict mismatch"
        assert python_valid == expected_valid, f"Case {idx} Python verdict mismatch"
        assert schema_valid == python_valid, f"Case {idx} drift between schema ({schema_valid}) and Python ({python_valid})"
