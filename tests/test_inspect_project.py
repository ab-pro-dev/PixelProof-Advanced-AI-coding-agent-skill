import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

from pixelproof_image.inspect_project import inspect_project


def _hash_directory(dir_path: Path) -> dict[str, str]:
    """Compute sha256 hash for every file in dir_path."""
    hashes: dict[str, str] = {}
    for root, _, files in os.walk(dir_path):
        for f in sorted(files):
            full_path = Path(root) / f
            rel = str(full_path.relative_to(dir_path))
            h = hashlib.sha256(full_path.read_bytes()).hexdigest()
            hashes[rel] = h
    return hashes


def test_nextjs_like_project(tmp_path: Path):
    """Detect Next.js framework, npm package manager, scripts, and tailwind styling."""
    proj = tmp_path / "next_project"
    proj.mkdir()

    pkg_data = {
        "name": "sample-next",
        "scripts": {
            "dev": "next dev",
            "build": "next build",
        },
        "dependencies": {
            "next": "14.2.0",
            "react": "18.3.0",
        },
        "devDependencies": {
            "tailwindcss": "3.4.0",
        },
    }
    (proj / "package.json").write_text(json.dumps(pkg_data), encoding="utf-8")
    (proj / "package-lock.json").write_text("{}", encoding="utf-8")
    (proj / "tailwind.config.js").write_text("module.exports = {};", encoding="utf-8")

    result = inspect_project(proj)
    assert result["status"] == "inspected"
    assert result["packageManager"]["value"] == "npm"
    assert result["packageManager"]["evidence"] == ["package-lock.json"]
    assert result["framework"]["value"] == "Next.js"
    assert "next in dependencies" in result["framework"]["evidence"]
    assert result["scripts"] == {"dev": "next dev", "build": "next build"}

    styling_values = [s["value"] for s in result["styling"]]
    assert "tailwind" in styling_values


def test_plain_html_project(tmp_path: Path):
    """Detect Plain HTML/CSS/JS when index.html is present without package.json."""
    proj = tmp_path / "plain_project"
    proj.mkdir()
    (proj / "index.html").write_text("<!DOCTYPE html><html><body>Hello</body></html>", encoding="utf-8")
    (proj / "styles.css").write_text("body { margin: 0; }", encoding="utf-8")

    result = inspect_project(proj)
    assert result["status"] == "inspected"
    assert result["packageManager"]["value"] is None
    assert result["framework"]["value"] == "Plain HTML/CSS/JS"
    assert any("index.html" in e for e in result["framework"]["evidence"])

    styling_values = [s["value"] for s in result["styling"]]
    assert "plain-css" in styling_values


def test_empty_dir(tmp_path: Path):
    """Empty directory reports inspected status, null framework, and explicit uncertainties."""
    empty_dir = tmp_path / "empty_dir"
    empty_dir.mkdir()

    result = inspect_project(empty_dir)
    assert result["status"] == "inspected"
    assert result["packageManager"]["value"] is None
    assert result["framework"]["value"] is None
    assert result["scripts"] == {}
    assert result["fontsAndAssets"]["fontFiles"] == 0
    assert result["fontsAndAssets"]["imageFiles"] == 0
    assert any("No package.json or index.html" in u for u in result["uncertainties"])
    assert "Route detection not implemented in this step." in result["uncertainties"]


def test_nonexistent_path(tmp_path: Path):
    """Nonexistent directory returns failed status with not_a_directory error."""
    nonexistent = tmp_path / "does_not_exist"
    result = inspect_project(nonexistent)

    assert result["status"] == "failed"
    assert result["error"]["code"] == "not_a_directory"


def test_two_lockfiles_at_once(tmp_path: Path):
    """Multiple lockfiles in root results in null packageManager and an uncertainty."""
    proj = tmp_path / "multi_lock"
    proj.mkdir()
    (proj / "package-lock.json").write_text("{}", encoding="utf-8")
    (proj / "yarn.lock").write_text("# yarn lockfile", encoding="utf-8")

    result = inspect_project(proj)
    assert result["status"] == "inspected"
    assert result["packageManager"]["value"] is None
    assert set(result["packageManager"]["evidence"]) == {"package-lock.json", "yarn.lock"}
    assert any("Multiple lockfiles" in u for u in result["uncertainties"])


def test_malformed_package_json(tmp_path: Path):
    """Malformed package.json does not crash and records an uncertainty."""
    proj = tmp_path / "malformed_project"
    proj.mkdir()
    (proj / "package.json").write_text("{ this is not valid json", encoding="utf-8")

    result = inspect_project(proj)
    assert result["status"] == "inspected"
    assert result["scripts"] == {}
    assert any("package.json unparseable" in u for u in result["uncertainties"])


def test_git_repo_with_untracked_file(tmp_path: Path):
    """Git inspection detects work tree, uncommitted changes, and lists changed files."""
    proj = tmp_path / "git_project"
    proj.mkdir()

    # Initialize a git repo and create an untracked file
    subprocess.run(["git", "init"], cwd=proj, capture_output=True, check=True)
    untracked_file = proj / "untracked.txt"
    untracked_file.write_text("new content", encoding="utf-8")

    result = inspect_project(proj)
    assert result["status"] == "inspected"
    assert result["git"]["isRepo"] is True
    assert result["git"]["hasUncommittedChanges"] is True
    assert "untracked.txt" in result["git"]["changedFiles"]


def test_node_modules_fonts_not_counted(tmp_path: Path):
    """Fonts and images inside node_modules must be excluded from asset counts."""
    proj = tmp_path / "asset_project"
    proj.mkdir()

    # Create ignored node_modules directory with fonts
    nm_fonts = proj / "node_modules" / "some-font-pkg"
    nm_fonts.mkdir(parents=True)
    (nm_fonts / "ignored1.woff").write_bytes(b"FONT1")
    (nm_fonts / "ignored2.ttf").write_bytes(b"FONT2")
    (nm_fonts / "ignored_img.png").write_bytes(b"IMAGE")

    # Create real public asset directory
    public_dir = proj / "public"
    public_dir.mkdir()
    (public_dir / "app_font.woff2").write_bytes(b"REAL_FONT")
    (public_dir / "hero.png").write_bytes(b"REAL_IMAGE")

    result = inspect_project(proj)
    assert result["status"] == "inspected"
    assert result["fontsAndAssets"]["assetDirs"] == ["public"]
    # Only the font and image in public/ must be counted (node_modules skipped!)
    assert result["fontsAndAssets"]["fontFiles"] == 1
    assert result["fontsAndAssets"]["imageFiles"] == 1


def test_immutability_byte_for_byte_unchanged(tmp_path: Path):
    """Inspection must be completely read-only and leave target directory byte-for-byte unchanged."""
    proj = tmp_path / "immutable_project"
    proj.mkdir()

    (proj / "package.json").write_text(
        json.dumps({"name": "immutable", "dependencies": {"react": "18.0.0"}}),
        encoding="utf-8",
    )
    (proj / "package-lock.json").write_text("{}", encoding="utf-8")
    src = proj / "src"
    src.mkdir()
    (src / "App.css").write_text("body { color: red; }", encoding="utf-8")
    (src / "App.module.css").write_text(".button { background: blue; }", encoding="utf-8")
    (src / "logo.svg").write_text("<svg></svg>", encoding="utf-8")

    before_hashes = _hash_directory(proj)

    # Run inspection
    result = inspect_project(proj)
    assert result["status"] == "inspected"

    after_hashes = _hash_directory(proj)

    assert before_hashes == after_hashes, "Project directory was modified during inspection!"


def test_cli_inspect_subprocess(tmp_path: Path):
    """CLI subcommand inspect --project DIR outputs JSON and correct exit codes."""
    proj = tmp_path / "cli_project"
    proj.mkdir()
    (proj / "index.html").write_text("<h1>CLI</h1>", encoding="utf-8")

    cmd_success = [
        sys.executable,
        "-m",
        "pixelproof_image.cli",
        "inspect",
        "--project",
        str(proj),
    ]
    proc_success = subprocess.run(cmd_success, capture_output=True, text=True)
    assert proc_success.returncode == 0
    data_success = json.loads(proc_success.stdout)
    assert data_success["status"] == "inspected"
    assert data_success["framework"]["value"] == "Plain HTML/CSS/JS"

    # Nonexistent dir -> exit code 1
    cmd_fail = [
        sys.executable,
        "-m",
        "pixelproof_image.cli",
        "inspect",
        "--project",
        str(tmp_path / "nonexistent"),
    ]
    proc_fail = subprocess.run(cmd_fail, capture_output=True, text=True)
    assert proc_fail.returncode == 1
    data_fail = json.loads(proc_fail.stdout)
    assert data_fail["status"] == "failed"
    assert data_fail["error"]["code"] == "not_a_directory"
