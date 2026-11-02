"""Tests for actionable error hints (spec §11).

Verifies hint mapping, completeness against source code, lack of stack traces
or environment variable leaks, and hint presence on failing runs.
"""

from __future__ import annotations

import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from typing import Any

from PIL import Image
import pytest

from pixelproof_image.compare import compare_images
from pixelproof_image.hints import HINTS, hint_for, make_error
from pixelproof_image.manifest import validate_manifest

REPO_ROOT = Path(__file__).resolve().parent.parent


def _extract_source_error_codes() -> set[str]:
    """Dynamically scan pixelproof_image source files for all string literals used as error codes."""
    py_dir = REPO_ROOT / "pixelproof_image"
    codes = set()
    code_pattern = re.compile(
        r'(?:"code":\s*"([a-zA-Z0-9_-]+)"|code="([a-zA-Z0-9_-]+)"|code\s*=\s*"([a-zA-Z0-9_-]+)"|make_error\(\s*"([a-zA-Z0-9_-]+)"|hint_for\(\s*"([a-zA-Z0-9_-]+)"\))'
    )
    for path in py_dir.glob("*.py"):
        if path.name == "hints.py":
            continue
        text = path.read_text(encoding="utf-8")
        for match in code_pattern.finditer(text):
            for g in match.groups():
                if g and g not in {"string", "code", "error"}:
                    codes.add(g)
    return codes


def test_every_extracted_source_code_has_non_empty_hint():
    """Every error code found in pixelproof_image source must be mapped in HINTS."""
    source_codes = _extract_source_error_codes()
    assert len(source_codes) >= 35, f"Expected at least 35 source codes, found {len(source_codes)}"

    missing_codes = []
    empty_hints = []
    for code in sorted(source_codes):
        hint = hint_for(code)
        if hint is None:
            missing_codes.append(code)
        elif not isinstance(hint, str) or len(hint.strip()) == 0:
            empty_hints.append(code)

    assert not missing_codes, f"Codes missing from HINTS: {missing_codes}"
    assert not empty_hints, f"Codes with empty hints: {empty_hints}"


def test_unknown_code_returns_none():
    """hint_for must return None for unknown codes."""
    assert hint_for("totally_nonexistent_code_12345") is None
    assert hint_for("") is None


def test_hints_have_no_stack_traces_or_env_var_patterns():
    """No hint may contain stack trace fragments or environment variable expressions."""
    env_pattern = re.compile(r"\$[A-Za-z_]+|%[A-Za-z_]+%|process\.env|os\.environ")
    for code, hint in HINTS.items():
        assert "Traceback" not in hint, f"Hint for {code} contains 'Traceback': {hint}"
        assert "at Object." not in hint, f"Hint for {code} contains 'at Object.': {hint}"
        assert not env_pattern.search(hint), f"Hint for {code} contains env var pattern: {hint}"
        assert hint.endswith("."), f"Hint for {code} should end with period: {hint}"
        assert len(hint) > 10, f"Hint for {code} is suspiciously short: {hint}"


def test_category_python_compare_mismatch_shows_hint(tmp_path: Path):
    """Real failing run Category 1: compare with dimension mismatch includes error.hint."""
    ref_path = tmp_path / "ref.png"
    act_path = tmp_path / "act.png"
    Image.new("RGB", (4, 4), "white").save(ref_path)
    Image.new("RGB", (5, 4), "black").save(act_path)

    res = compare_images(ref_path, act_path)
    assert res["status"] == "failed"
    assert res["error"]["code"] == "dimension_mismatch"
    assert "hint" in res["error"]
    assert res["error"]["hint"] == hint_for("dimension_mismatch")


def test_category_python_validate_invalid_shows_hint(tmp_path: Path):
    """Real failing run Category 2: manifest validation error entries include hint."""
    manifest_file = tmp_path / "references.json"
    manifest_file.write_text(json.dumps({"version": 99, "references": []}), encoding="utf-8")

    res = validate_manifest(manifest_file)
    assert res["status"] == "invalid"
    assert len(res["errors"]) > 0
    version_err = next(e for e in res["errors"] if e["code"] == "invalid_version")
    assert "hint" in version_err
    assert version_err["hint"] == hint_for("invalid_version")


def test_success_compare_contains_no_hint(tmp_path: Path):
    """Passing comparison output must not contain any 'hint' field."""
    ref_path = tmp_path / "ref.png"
    act_path = tmp_path / "act.png"
    Image.new("RGB", (4, 4), "white").save(ref_path)
    Image.new("RGB", (4, 4), "white").save(act_path)

    res = compare_images(ref_path, act_path)
    assert res["status"] == "compared"
    serialized = json.dumps(res)
    assert "hint" not in serialized


def test_make_error_helper():
    """make_error helper attaches hint when mapped, omits when unknown."""
    err_known = make_error("dimension_mismatch", "Dimensions do not match")
    assert err_known["code"] == "dimension_mismatch"
    assert err_known["message"] == "Dimensions do not match"
    assert err_known["hint"] == hint_for("dimension_mismatch")

    err_unknown = make_error("unmapped_custom_code", "Custom error")
    assert err_unknown["code"] == "unmapped_custom_code"
    assert err_unknown["message"] == "Custom error"
    assert "hint" not in err_unknown
