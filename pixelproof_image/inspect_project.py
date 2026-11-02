"""PixelProof read-only project inspection.

Consistent with spec §5.2, §17:
- Read-only inspection: NEVER modifies the target project and NEVER executes project scripts.
- Implemented in Python as an AGENT PROPOSAL pending resolution of open question Q2
  (spec lists project inspection in Phase 1 but TypeScript modules in the tree).
- Statuses ("inspected", "failed") and field names are AGENT PROPOSALS (pending Q5).
- Reports facts and explicit uncertainty without guessing.
- Security: never follows symlinks outside project_dir (followlinks=False), never reads .env files.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
from typing import Any, Union

from pixelproof_image.hints import make_error

# Common directories to skip when scanning assets and files
SKIPPED_DIRS = {"node_modules", ".git", "dist", "build", ".next", ".venv"}

# Common asset directory locations relative to project root
COMMON_ASSET_DIRS = ["public", "assets", "static", "src/assets"]

# Framework priority mapping (specific frameworks checked before general ones)
FRAMEWORK_CANDIDATES = [
    ("next", "Next.js"),
    ("nuxt", "Nuxt"),
    ("@sveltejs/kit", "SvelteKit"),
    ("astro", "Astro"),
    ("@angular/core", "Angular"),
    ("svelte", "Svelte"),
    ("vue", "Vue"),
    ("react", "React"),
]

LOCKFILE_MAP = [
    ("package-lock.json", "npm"),
    ("pnpm-lock.yaml", "pnpm"),
    ("yarn.lock", "yarn"),
    ("bun.lockb", "bun"),
    ("bun.lock", "bun"),
]


def inspect_project(project_dir: Union[str, os.PathLike]) -> dict[str, Any]:
    """Non-destructively inspect a target frontend project and report facts and uncertainties.

    Args:
        project_dir: Path to the frontend project directory.

    Returns:
        JSON-serializable inspection report dictionary:
        - Success:
          {
              "status": "inspected",
              "projectDir": <absolute>,
              "packageManager": {"value": <npm|pnpm|yarn|bun|null>, "evidence": [<lockfiles>]},
              "framework": {"value": <name|null>, "evidence": [...]},
              "scripts": {<name>: <command string>},
              "styling": [{"value": ..., "evidence": ...}],
              "fontsAndAssets": {"assetDirs": [...], "fontFiles": int, "imageFiles": int},
              "git": {"isRepo": bool, "hasUncommittedChanges": bool|null, "changedFiles": [...]},
              "uncertainties": [<strings>]
          }
        - Failure:
          {
              "status": "failed",
              "error": {"code": "not_a_directory" | "unreadable", "message": str}
          }
    """
    path_obj = Path(project_dir)
    if not path_obj.exists() or not path_obj.is_dir():
        return {
            "status": "failed",
            "error": make_error(
                "not_a_directory",
                f"Project directory not found or is not a directory: {project_dir}",
            ),
        }

    try:
        resolved_dir = path_obj.resolve()
        # Test basic directory read permission
        os.listdir(resolved_dir)
    except Exception as e:
        return {
            "status": "failed",
            "error": make_error(
                "unreadable",
                f"Cannot read project directory {project_dir}: {e}",
            ),
        }

    uncertainties: list[str] = []

    # 1. Package Manager Detection (by lockfiles in project root)
    found_lockfiles: list[str] = []
    found_managers: set[str] = set()
    for lockfile, mgr in LOCKFILE_MAP:
        if (resolved_dir / lockfile).is_file():
            found_lockfiles.append(lockfile)
            found_managers.add(mgr)

    if len(found_lockfiles) == 1:
        pkg_mgr_value: str | None = list(found_managers)[0]
    elif len(found_lockfiles) > 1:
        pkg_mgr_value = None
        uncertainties.append(f"Multiple lockfiles detected: {', '.join(found_lockfiles)}")
    else:
        pkg_mgr_value = None

    package_manager_info = {
        "value": pkg_mgr_value,
        "evidence": found_lockfiles,
    }

    # 2. Read package.json if present
    pkg_json_path = resolved_dir / "package.json"
    package_json: dict[str, Any] | None = None
    if pkg_json_path.exists():
        if pkg_json_path.is_file():
            try:
                with open(pkg_json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    package_json = data
                else:
                    uncertainties.append("package.json unparseable: root is not an object")
            except Exception:
                uncertainties.append("package.json unparseable")
        else:
            uncertainties.append("package.json is not a file")

    # 3. Framework Detection
    framework_value: str | None = None
    framework_evidence: list[str] = []

    if package_json is not None:
        deps = package_json.get("dependencies", {})
        dev_deps = package_json.get("devDependencies", {})
        all_deps: dict[str, Any] = {}
        if isinstance(deps, dict):
            all_deps.update(deps)
        if isinstance(dev_deps, dict):
            all_deps.update(dev_deps)

        for dep_pkg, fw_name in FRAMEWORK_CANDIDATES:
            if dep_pkg in all_deps:
                framework_value = fw_name
                where = "dependencies" if (isinstance(deps, dict) and dep_pkg in deps) else "devDependencies"
                framework_evidence.append(f"{dep_pkg} in {where}")
                break

        if framework_value is None:
            uncertainties.append("Framework could not be determined from package.json dependencies")
    else:
        index_html = resolved_dir / "index.html"
        if index_html.is_file():
            framework_value = "Plain HTML/CSS/JS"
            framework_evidence.append("index.html present in root without package.json")
        else:
            uncertainties.append("No package.json or index.html found to identify framework")

    framework_info = {
        "value": framework_value,
        "evidence": framework_evidence,
    }

    # 4. Scripts (verbatim read-only copy from package.json)
    scripts: dict[str, str] = {}
    if package_json is not None:
        raw_scripts = package_json.get("scripts")
        if isinstance(raw_scripts, dict):
            scripts = {str(k): str(v) for k, v in raw_scripts.items()}

    # 5. Styling Detection & Asset / File Scanning
    styling_list: list[dict[str, Any]] = []

    # Check tailwind in package.json
    tailwind_evidence: list[str] = []
    if package_json is not None:
        all_deps = {}
        if isinstance(package_json.get("dependencies"), dict):
            all_deps.update(package_json["dependencies"])
        if isinstance(package_json.get("devDependencies"), dict):
            all_deps.update(package_json["devDependencies"])
        if "tailwindcss" in all_deps:
            tailwind_evidence.append("tailwindcss in dependencies")

    # Check tailwind.config.* in root
    for entry in os.listdir(resolved_dir):
        if entry.startswith("tailwind.config."):
            tailwind_evidence.append(f"{entry} found in root")

    if tailwind_evidence:
        styling_list.append({"value": "tailwind", "evidence": tailwind_evidence})

    # Check sass in package.json
    if package_json is not None:
        all_deps = {}
        if isinstance(package_json.get("dependencies"), dict):
            all_deps.update(package_json["dependencies"])
        if isinstance(package_json.get("devDependencies"), dict):
            all_deps.update(package_json["devDependencies"])
        for sass_pkg in ("sass", "node-sass", "sass-loader"):
            if sass_pkg in all_deps:
                styling_list.append({
                    "value": "sass",
                    "evidence": [f"{sass_pkg} in dependencies"],
                })
                break

    # Scan project tree (skipping ignored dirs, followlinks=False for security)
    font_count = 0
    image_count = 0
    css_modules_samples: list[str] = []
    plain_css_samples: list[str] = []

    for root, dirs, files in os.walk(resolved_dir, followlinks=False):
        dirs[:] = [d for d in dirs if d not in SKIPPED_DIRS]
        for f in files:
            ext = Path(f).suffix.lower()
            if ext in {".woff", ".woff2", ".ttf", ".otf"}:
                font_count += 1
            elif ext in {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}:
                image_count += 1

            if f.endswith(".module.css"):
                css_modules_samples.append(os.path.relpath(os.path.join(root, f), resolved_dir))
            elif f.endswith(".css"):
                plain_css_samples.append(os.path.relpath(os.path.join(root, f), resolved_dir))

    if css_modules_samples:
        styling_list.append({
            "value": "css-modules",
            "evidence": [f"{len(css_modules_samples)} *.module.css file(s) found (e.g. {css_modules_samples[0]})"],
        })

    if plain_css_samples:
        styling_list.append({
            "value": "plain-css",
            "evidence": [f"{len(plain_css_samples)} *.css file(s) found (e.g. {plain_css_samples[0]})"],
        })

    # Common asset directories check
    existing_asset_dirs = [
        d for d in COMMON_ASSET_DIRS if (resolved_dir / d).is_dir()
    ]

    fonts_and_assets = {
        "assetDirs": existing_asset_dirs,
        "fontFiles": font_count,
        "imageFiles": image_count,
    }

    # 6. Read-Only Git Detection
    is_repo = False
    has_uncommitted: bool | None = None
    changed_files: list[str] = []

    try:
        rev_proc = subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            cwd=resolved_dir,
            capture_output=True,
            text=True,
            timeout=5,
        )
        if rev_proc.returncode == 0 and rev_proc.stdout.strip() == "true":
            is_repo = True
            status_proc = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=resolved_dir,
                capture_output=True,
                text=True,
                timeout=5,
            )
            if status_proc.returncode == 0:
                lines = [ln.strip() for ln in status_proc.stdout.splitlines() if ln.strip()]
                # Porcelain format: XY filename or XY orig -> new
                for line in lines:
                    # Strip status indicator (first 2 chars + space)
                    rel_path = line[2:].strip()
                    changed_files.append(rel_path)
                has_uncommitted = len(changed_files) > 0
            else:
                uncertainties.append("git status check failed")
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError) as e:
        uncertainties.append(f"Git inspection failed: {e}")

    git_info = {
        "isRepo": is_repo,
        "hasUncommittedChanges": has_uncommitted,
        "changedFiles": changed_files,
    }

    # 7. Routes (explicit uncertainty as required)
    uncertainties.append("Route detection not implemented in this step.")

    return {
        "status": "inspected",
        "projectDir": str(resolved_dir),
        "packageManager": package_manager_info,
        "framework": framework_info,
        "scripts": scripts,
        "styling": styling_list,
        "fontsAndAssets": fonts_and_assets,
        "git": git_info,
        "uncertainties": uncertainties,
    }
