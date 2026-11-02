"""PixelProof reference manifest validation.

Consistent with spec §5.1, §6, §17:
- Manifest format in §6 is PROPOSED.
- Status values ("valid", "invalid") and error codes are AGENT PROPOSALS (pending Q5).
- Manifest image paths are relative to the manifest file's directory (Option C, agreed with owner).
- Only "viewport" is accepted for captureType for now (AGENT PROPOSAL, pending Q4).
- The image pixel size check (viewport dimensions * deviceScaleFactor) for captureType "viewport"
  is an AGENT PROPOSAL derived from §7.2.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Union

from pixelproof_image.compare import ImageLoadError, load_image
from pixelproof_image.hints import hint_for
from pixelproof_image.regions import validate_region_weights
from pixelproof_image.report import REFERENCE_ID_PATTERN


class ErrorList(list):
    """List of validation errors that automatically attaches hints to error dicts."""

    def append(self, item: dict[str, Any]) -> None:
        code = item.get("code")
        if code and "hint" not in item:
            h = hint_for(code)
            if h is not None:
                item["hint"] = h
        super().append(item)

    def extend(self, iterable: Any) -> None:
        for item in iterable:
            self.append(item)


def _attach_hints(errs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    for e in errs:
        code = e.get("code")
        if code and "hint" not in e:
            h = hint_for(code)
            if h is not None:
                e["hint"] = h
    return errs


def validate_manifest(manifest_path: Union[str, os.PathLike]) -> dict[str, Any]:
    """Validate a reference manifest file and resolve relative image paths.

    Args:
        manifest_path: Path to the reference manifest JSON file.

    Returns:
        JSON-serializable validation result:
        - On success:
          {
              "status": "valid",
              "manifestPath": str,
              "referenceCount": int,
              "references": list[dict]
          }
        - On failure:
          {
              "status": "invalid",
              "errors": [
                  {"code": str, "path": str, "message": str},
                  ...
              ]
          }
    """
    path_obj = Path(manifest_path)
    if not path_obj.exists() or not path_obj.is_file():
        return {
            "status": "invalid",
            "errors": _attach_hints([
                {
                    "code": "manifest_missing",
                    "path": "",
                    "message": f"Manifest file not found: {manifest_path}",
                }
            ]),
        }

    try:
        with open(path_obj, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        return {
            "status": "invalid",
            "errors": _attach_hints([
                {
                    "code": "manifest_unparseable",
                    "path": "",
                    "message": f"Manifest is not valid JSON: {e}",
                }
            ]),
        }

    if not isinstance(data, dict):
        return {
            "status": "invalid",
            "errors": _attach_hints([
                {
                    "code": "manifest_unparseable",
                    "path": "",
                    "message": "Manifest root must be a JSON object",
                }
            ]),
        }

    errors: list[dict[str, str]] = ErrorList()
    manifest_dir = path_obj.parent.resolve()

    # 1. Version check: must equal 1
    if "version" not in data:
        errors.append({
            "code": "missing_field",
            "path": "version",
            "message": "Field 'version' is required",
        })
    elif data["version"] != 1 or isinstance(data["version"], bool):
        errors.append({
            "code": "invalid_version",
            "path": "version",
            "message": f"Version must equal 1, got {data['version']!r}",
        })

    # 2. Project check (baseUrl optional, but must start with http:// or https://)
    if "project" in data:
        project = data["project"]
        if isinstance(project, dict):
            if "baseUrl" in project:
                base_url = project["baseUrl"]
                if not isinstance(base_url, str) or not (
                    base_url.startswith("http://") or base_url.startswith("https://")
                ):
                    errors.append({
                        "code": "invalid_base_url",
                        "path": "project.baseUrl",
                        "message": (
                            "project.baseUrl must be a string starting with "
                            f"'http://' or 'https://', got {base_url!r}"
                        ),
                    })
        else:
            errors.append({
                "code": "invalid_type",
                "path": "project",
                "message": "Field 'project' must be an object",
            })

    # 3. References list check
    if "references" not in data:
        errors.append({
            "code": "missing_field",
            "path": "references",
            "message": "Field 'references' is required",
        })
        return {"status": "invalid", "errors": errors}

    references = data["references"]
    if not isinstance(references, list):
        errors.append({
            "code": "invalid_type",
            "path": "references",
            "message": "Field 'references' must be a list",
        })
        return {"status": "invalid", "errors": errors}

    if len(references) == 0:
        errors.append({
            "code": "empty_references",
            "path": "references",
            "message": "Field 'references' must not be empty",
        })
        return {"status": "invalid", "errors": errors}

    seen_ids: set[str] = set()
    normalized_references: list[dict[str, Any]] = []

    # 4. Reference entries check
    for idx, ref in enumerate(references):
        prefix = f"references[{idx}]"
        if not isinstance(ref, dict):
            errors.append({
                "code": "invalid_type",
                "path": prefix,
                "message": "Reference entry must be an object",
            })
            continue

        # id check
        ref_id = ref.get("id")
        has_valid_id = False
        if "id" not in ref:
            errors.append({
                "code": "missing_field",
                "path": f"{prefix}.id",
                "message": "Field 'id' is required",
            })
        elif not isinstance(ref_id, str) or not REFERENCE_ID_PATTERN.fullmatch(ref_id):
            errors.append({
                "code": "invalid_id",
                "path": f"{prefix}.id",
                "message": (
                    f"Invalid reference ID: {ref_id!r}. Must contain only "
                    "alphanumeric characters, underscores, and hyphens, and be 1 to 64 characters long."
                ),
            })
        else:
            has_valid_id = True
            if ref_id in seen_ids:
                errors.append({
                    "code": "duplicate_id",
                    "path": f"{prefix}.id",
                    "message": f"Duplicate reference ID: {ref_id!r}",
                })
            else:
                seen_ids.add(ref_id)

        # route check
        route = ref.get("route")
        has_valid_route = False
        if "route" not in ref:
            errors.append({
                "code": "missing_field",
                "path": f"{prefix}.route",
                "message": "Field 'route' is required",
            })
        elif not isinstance(route, str) or not route.startswith("/"):
            errors.append({
                "code": "invalid_route",
                "path": f"{prefix}.route",
                "message": f"Route must be a string starting with '/', got {route!r}",
            })
        else:
            has_valid_route = True

        # captureType check (only "viewport" is accepted currently)
        capture_type = ref.get("captureType")
        has_valid_capture_type = False
        if "captureType" not in ref:
            errors.append({
                "code": "missing_field",
                "path": f"{prefix}.captureType",
                "message": "Field 'captureType' is required",
            })
        elif capture_type != "viewport":
            errors.append({
                "code": "invalid_capture_type",
                "path": f"{prefix}.captureType",
                "message": f"captureType must be 'viewport', got {capture_type!r}",
            })
        else:
            has_valid_capture_type = True

        # viewport check
        viewport = ref.get("viewport")
        has_valid_viewport = False
        valid_width: int | None = None
        valid_height: int | None = None
        if "viewport" not in ref:
            errors.append({
                "code": "missing_field",
                "path": f"{prefix}.viewport",
                "message": "Field 'viewport' is required",
            })
        elif not isinstance(viewport, dict):
            errors.append({
                "code": "invalid_viewport",
                "path": f"{prefix}.viewport",
                "message": "Field 'viewport' must be an object",
            })
        else:
            if "width" not in viewport:
                errors.append({
                    "code": "missing_field",
                    "path": f"{prefix}.viewport.width",
                    "message": "Field 'viewport.width' is required",
                })
            else:
                w = viewport["width"]
                if isinstance(w, bool) or not isinstance(w, int) or w <= 0:
                    errors.append({
                        "code": "invalid_viewport",
                        "path": f"{prefix}.viewport.width",
                        "message": f"Viewport width must be a positive integer, got {w!r}",
                    })
                else:
                    valid_width = w

            if "height" not in viewport:
                errors.append({
                    "code": "missing_field",
                    "path": f"{prefix}.viewport.height",
                    "message": "Field 'viewport.height' is required",
                })
            else:
                h = viewport["height"]
                if isinstance(h, bool) or not isinstance(h, int) or h <= 0:
                    errors.append({
                        "code": "invalid_viewport",
                        "path": f"{prefix}.viewport.height",
                        "message": f"Viewport height must be a positive integer, got {h!r}",
                    })
                else:
                    valid_height = h

            if valid_width is not None and valid_height is not None:
                has_valid_viewport = True

        # deviceScaleFactor check (optional, positive number, default 1)
        scale_factor = 1.0
        has_valid_scale = True
        if "deviceScaleFactor" in ref:
            dsf = ref["deviceScaleFactor"]
            if isinstance(dsf, bool) or not isinstance(dsf, (int, float)) or dsf <= 0:
                errors.append({
                    "code": "invalid_device_scale_factor",
                    "path": f"{prefix}.deviceScaleFactor",
                    "message": f"deviceScaleFactor must be a positive number, got {dsf!r}",
                })
                has_valid_scale = False
            else:
                scale_factor = float(dsf)

        # regionWeights check (optional)
        if "regionWeights" in ref:
            rw_errors = validate_region_weights(ref["regionWeights"], path_prefix=f"{prefix}.regionWeights")
            errors.extend(rw_errors)

        # image path check (security: relative only, inside manifest_dir, no escape, readable)
        img_str = ref.get("image")
        resolved_img_path: Path | None = None
        if "image" not in ref:
            errors.append({
                "code": "missing_field",
                "path": f"{prefix}.image",
                "message": "Field 'image' is required",
            })
        elif not isinstance(img_str, str) or not img_str.strip():
            errors.append({
                "code": "invalid_type",
                "path": f"{prefix}.image",
                "message": "Field 'image' must be a non-empty string",
            })
        elif Path(img_str).is_absolute() or img_str.startswith("/") or img_str.startswith("\\"):
            errors.append({
                "code": "path_escape",
                "path": f"{prefix}.image",
                "message": f"Image path must be relative, not absolute: {img_str}",
            })
        else:
            raw_target = manifest_dir / img_str
            resolved_target = raw_target.resolve()

            # Confirm resolved target stays inside manifest directory (blocks .. and symlink escapes)
            if not resolved_target.is_relative_to(manifest_dir):
                errors.append({
                    "code": "path_escape",
                    "path": f"{prefix}.image",
                    "message": f"Image path escapes manifest folder: {img_str}",
                })
            elif not resolved_target.exists():
                errors.append({
                    "code": "image_missing",
                    "path": f"{prefix}.image",
                    "message": f"Image file does not exist: {img_str}",
                })
            elif not resolved_target.is_file():
                errors.append({
                    "code": "image_unreadable",
                    "path": f"{prefix}.image",
                    "message": f"Image path is not a file: {img_str}",
                })
            else:
                # Fully decode image with load_image
                try:
                    _, img_size, _ = load_image(resolved_target)
                    resolved_img_path = resolved_target

                    # Verify image dimensions against viewport * deviceScaleFactor
                    if has_valid_viewport and has_valid_scale:
                        exp_w = round(valid_width * scale_factor)
                        exp_h = round(valid_height * scale_factor)
                        if img_size.width != exp_w or img_size.height != exp_h:
                            errors.append({
                                "code": "image_size_mismatch",
                                "path": f"{prefix}.image",
                                "message": (
                                    f"Image dimensions {img_size.width}x{img_size.height} do not match "
                                    f"expected viewport size {exp_w}x{exp_h} "
                                    f"(viewport: {valid_width}x{valid_height}, deviceScaleFactor: {scale_factor})"
                                ),
                            })
                except ImageLoadError as e:
                    code = "image_missing" if e.code == "missing_file" else "image_unreadable"
                    errors.append({
                        "code": code,
                        "path": f"{prefix}.image",
                        "message": e.message,
                    })
                except Exception as e:
                    errors.append({
                        "code": "image_unreadable",
                        "path": f"{prefix}.image",
                        "message": f"Failed to load image {img_str}: {e}",
                    })

        # Build normalized entry if this reference is valid
        if (
            resolved_img_path is not None
            and has_valid_id
            and has_valid_route
            and has_valid_capture_type
            and has_valid_viewport
            and has_valid_scale
        ):
            norm_entry = dict(ref)
            norm_entry["id"] = ref_id
            norm_entry["image"] = str(resolved_img_path)
            norm_entry["route"] = route
            norm_entry["viewport"] = {
                "width": valid_width,
                "height": valid_height,
            }
            norm_entry["deviceScaleFactor"] = ref.get("deviceScaleFactor", 1)
            norm_entry["captureType"] = "viewport"
            normalized_references.append(norm_entry)

    if errors:
        return {
            "status": "invalid",
            "errors": _attach_hints(errors),
        }

    return {
        "status": "valid",
        "manifestPath": str(manifest_path),
        "referenceCount": len(normalized_references),
        "references": normalized_references,
    }
