import json
from pathlib import Path
import subprocess
import sys
import pytest

from pixelproof_image.final_report import build_report, write_report


def test_build_report_all_passed():
    """All references compared and all checks passed -> COMPLETE banner present."""
    run_summary = {
        "project": {"name": "Test Project"},
        "references": [
            {
                "referenceId": "home",
                "status": "compared",
                "referenceSize": {"width": 100, "height": 100},
                "actualSize": {"width": 100, "height": 100},
                "metrics": {"mae": 0.0},
                "artifacts": {
                    "overlay": "comparison/home-overlay.png",
                    "diff": "comparison/home-diff.png",
                    "sideBySide": "comparison/home-side-by-side.png",
                },
                "differingPixels": 0,
                "issues": [],
            }
        ],
        "checks": [
            {"name": "build", "state": "passed", "detail": "Built clean in 2s"},
            {"name": "unit-tests", "state": "passed", "detail": "All 10 tests passed"},
        ],
        "iterations": 2,
        "limitations": ["Browser font rendering differences"],
        "observations": ["Layout matches reference pixel-for-pixel"],
    }

    report = build_report(run_summary)
    assert report["overall"] == "OVERALL: COMPLETE (tool execution only, visual quality not judged)"
    assert report["overallReasons"] == []
    assert report["summary"]["totalReferences"] == 1
    assert report["summary"]["compared"] == 1
    assert report["summary"]["failed"] == 0
    assert report["measuredVsObserved"]["measured"]["comparedReferences"] == 1
    assert report["measuredVsObserved"]["observations"] == ["Layout matches reference pixel-for-pixel"]


def test_build_report_failed_reference(tmp_path: Path):
    """One failed reference -> INCOMPLETE banner with reason and error code in Markdown."""
    run_summary = {
        "project": {"name": "Test Project"},
        "references": [
            {
                "referenceId": "home",
                "status": "compared",
                "referenceSize": {"width": 100, "height": 100},
                "actualSize": {"width": 100, "height": 100},
                "metrics": {"mae": 0.0},
                "artifacts": {},
                "differingPixels": 0,
            },
            {
                "referenceId": "about",
                "status": "failed",
                "referenceSize": {"width": 100, "height": 100},
                "actualSize": {"width": 120, "height": 100},
                "error": {
                    "code": "dimension_mismatch",
                    "message": "Actual image size (120x100) does not match reference size (100x100)",
                },
            },
        ],
        "checks": [
            {"name": "build", "state": "passed", "detail": "Build succeeded"},
        ],
    }

    report = build_report(run_summary)
    assert report["overall"] == "OVERALL: INCOMPLETE"
    assert len(report["overallReasons"]) == 1
    assert "about" in report["overallReasons"][0]
    assert "dimension_mismatch" in report["overallReasons"][0]
    assert report["summary"]["totalReferences"] == 2
    assert report["summary"]["compared"] == 1
    assert report["summary"]["failed"] == 1

    out_res = write_report(report, tmp_path)
    md_content = Path(out_res["paths"]["markdown"]).read_text(encoding="utf-8")
    assert md_content.startswith("# OVERALL: INCOMPLETE")
    assert "dimension_mismatch" in md_content
    assert "Actual image size (120x100) does not match reference size (100x100)" in md_content


def test_build_report_skipped_and_unavailable_checks():
    """Skipped or unavailable checks result in INCOMPLETE overall status with reasons."""
    run_summary = {
        "project": {"name": "Check Test"},
        "references": [
            {
                "referenceId": "home",
                "status": "compared",
                "metrics": {"mae": 5.0},
            }
        ],
        "checks": [
            {"name": "build", "state": "passed", "detail": "Passed"},
            {"name": "e2e", "state": "skipped", "detail": "No Playwright installed"},
            {"name": "perf", "state": "unavailable", "detail": "Lighthouse tool unavailable"},
        ],
    }

    report = build_report(run_summary)
    assert report["overall"] == "OVERALL: INCOMPLETE"
    assert len(report["overallReasons"]) == 2
    assert any("e2e" in r and "skipped" in r for r in report["overallReasons"])
    assert any("perf" in r and "unavailable" in r for r in report["overallReasons"])


def test_build_report_reference_without_status():
    """Reference without status is counted as failed, not skipped silently."""
    run_summary = {
        "project": {"name": "Missing Status Test"},
        "references": [
            {
                "referenceId": "missing-status-ref",
                "referenceSize": {"width": 50, "height": 50},
            }
        ],
        "checks": [
            {"name": "build", "state": "passed", "detail": "OK"},
        ],
    }

    report = build_report(run_summary)
    assert report["overall"] == "OVERALL: INCOMPLETE"
    assert report["summary"]["failed"] == 1
    assert report["references"][0]["status"] == "failed"
    assert report["references"][0]["error"]["code"] == "missing_status"


def test_build_report_unknown_check_state():
    """Unknown check state raises ValueError."""
    run_summary = {
        "project": {"name": "Invalid State Test"},
        "checks": [
            {"name": "lint", "state": "in_progress", "detail": "running"},
        ],
    }

    with pytest.raises(ValueError, match="Invalid check state"):
        build_report(run_summary)


def test_build_report_checks_not_a_list():
    """Invalid checks type raises ValueError."""
    run_summary = {
        "project": {"name": "Invalid Checks Test"},
        "checks": "not-a-list",
    }

    with pytest.raises(ValueError, match="must be a list"):
        build_report(run_summary)


def test_write_report_success_and_sections(tmp_path: Path):
    """write_report produces both JSON and Markdown with all 10 spec headings."""
    run_summary = {
        "project": {"name": "Spec Headings Test"},
        "references": [
            {
                "referenceId": "landing",
                "route": "/",
                "status": "compared",
                "referenceSize": {"width": 800, "height": 600},
                "actualSize": {"width": 800, "height": 600},
                "metrics": {"mae": 1.25},
                "artifacts": {
                    "overlay": "comparison/landing-overlay.png",
                    "diff": "comparison/landing-diff.png",
                    "sideBySide": "comparison/landing-side-by-side.png",
                },
                "differingPixels": 42,
            }
        ],
        "checks": [
            {"name": "build", "state": "passed", "detail": "Built clean"},
        ],
        "iterations": 1,
        "limitations": ["No GPU acceleration"],
        "observations": ["Colors match brand specification"],
    }

    report = build_report(run_summary)
    res = write_report(report, tmp_path)

    assert res["status"] == "written"
    json_path = Path(res["paths"]["json"])
    md_path = Path(res["paths"]["markdown"])

    assert json_path.exists()
    assert md_path.exists()

    # Verify JSON content
    data = json.loads(json_path.read_text(encoding="utf-8"))
    assert data["project"]["name"] == "Spec Headings Test"
    assert data["summary"]["compared"] == 1

    # Verify Markdown sections 1-10
    md = md_path.read_text(encoding="utf-8")
    assert "# OVERALL: COMPLETE (tool execution only, visual quality not judged)" in md
    assert "## 1. Project and Run Summary" in md
    assert "## 2. Reference Coverage" in md
    assert "## 3. Pages Implemented or Checked" in md
    assert "## 4. Screenshot Dimensions and Capture Status" in md
    assert "## 5. Visual Comparison Metrics" in md
    assert "## 6. Highest-Priority Remaining Issues" in md
    assert "## 7. Build and Test Results" in md
    assert "## 8. Failed or Skipped Checks" in md
    assert "## 9. Final Iteration Count" in md
    assert "## 10. Limitations and Suggested Next Actions" in md


def test_write_report_overwrite_behavior(tmp_path: Path):
    """write_report refuses to overwrite without overwrite=True and leaves files intact."""
    run_summary = {
        "project": {"name": "Overwrite Test"},
        "references": [
            {"referenceId": "ref1", "status": "compared", "metrics": {"mae": 0.0}}
        ],
        "checks": [{"name": "build", "state": "passed", "detail": "OK"}],
    }

    report = build_report(run_summary)
    res = write_report(report, tmp_path)
    json_path = Path(res["paths"]["json"])
    md_path = Path(res["paths"]["markdown"])

    # Record initial contents
    original_json = json_path.read_text(encoding="utf-8")
    original_md = md_path.read_text(encoding="utf-8")

    # Attempt to write again without overwrite
    with pytest.raises(FileExistsError, match="Report files already exist"):
        write_report(report, tmp_path, overwrite=False)

    # Ensure original files were not modified
    assert json_path.read_text(encoding="utf-8") == original_json
    assert md_path.read_text(encoding="utf-8") == original_md

    # Overwrite=True succeeds
    res_ow = write_report(report, tmp_path, overwrite=True)
    assert res_ow["status"] == "written"


def test_write_report_atomic_failure_cleanup(tmp_path: Path, monkeypatch):
    """When write fails midway, partially written files are removed (atomic behavior)."""
    run_summary = {
        "project": {"name": "Atomic Test"},
        "references": [
            {"referenceId": "ref1", "status": "compared", "metrics": {"mae": 0.0}}
        ],
        "checks": [{"name": "build", "state": "passed", "detail": "OK"}],
    }
    report = build_report(run_summary)

    reports_dir = tmp_path / "reports"
    json_path = reports_dir / "report.json"
    md_path = reports_dir / "report.md"

    # Simulate failure on md_path write
    orig_write_text = Path.write_text

    def failing_write_text(self, *args, **kwargs):
        if self.name == "report.md":
            raise OSError("Disk write failed on Markdown file")
        return orig_write_text(self, *args, **kwargs)

    monkeypatch.setattr(Path, "write_text", failing_write_text)

    with pytest.raises(OSError, match="Disk write failed"):
        write_report(report, tmp_path)

    # Neither file should exist
    assert not json_path.exists()
    assert not md_path.exists()


def test_cli_report_success(tmp_path: Path):
    """CLI report subcommand succeeds with exit code 0 and valid JSON output."""
    summary_path = tmp_path / "run_summary.json"
    out_dir = tmp_path / "cli_out"

    summary_data = {
        "project": {"name": "CLI Project"},
        "references": [
            {
                "referenceId": "hero",
                "status": "compared",
                "referenceSize": {"width": 400, "height": 300},
                "actualSize": {"width": 400, "height": 300},
                "metrics": {"mae": 0.5},
            }
        ],
        "checks": [{"name": "compile", "state": "passed", "detail": "Compiled"}],
    }
    summary_path.write_text(json.dumps(summary_data), encoding="utf-8")

    proc = subprocess.run(
        [
            sys.executable,
            "-m",
            "pixelproof_image.cli",
            "report",
            "--summary",
            str(summary_path),
            "--out",
            str(out_dir),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert proc.returncode == 0
    assert proc.stderr == ""

    data = json.loads(proc.stdout)
    assert data["status"] == "written"
    assert (out_dir / "reports" / "report.json").exists()
    assert (out_dir / "reports" / "report.md").exists()


def test_cli_report_missing_summary(tmp_path: Path):
    """CLI report subcommand fails when summary file does not exist."""
    missing_path = tmp_path / "does_not_exist.json"
    out_dir = tmp_path / "cli_out"

    proc = subprocess.run(
        [
            sys.executable,
            "-m",
            "pixelproof_image.cli",
            "report",
            "--summary",
            str(missing_path),
            "--out",
            str(out_dir),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert proc.returncode == 1
    data = json.loads(proc.stdout)
    assert data["status"] == "failed"
    assert data["error"]["code"] == "summary_missing"


def test_cli_report_unparseable_summary(tmp_path: Path):
    """CLI report subcommand fails when summary file is invalid JSON."""
    bad_summary = tmp_path / "bad_summary.json"
    bad_summary.write_text("{ unclosed json: ", encoding="utf-8")
    out_dir = tmp_path / "cli_out"

    proc = subprocess.run(
        [
            sys.executable,
            "-m",
            "pixelproof_image.cli",
            "report",
            "--summary",
            str(bad_summary),
            "--out",
            str(out_dir),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert proc.returncode == 1
    data = json.loads(proc.stdout)
    assert data["status"] == "failed"
    assert data["error"]["code"] == "summary_unparseable"


def test_cli_report_output_exists_and_overwrite(tmp_path: Path):
    """CLI report subcommand fails on existing output without --overwrite, succeeds with --overwrite."""
    summary_path = tmp_path / "summary.json"
    out_dir = tmp_path / "cli_out"

    summary_data = {
        "project": {"name": "CLI Overwrite Project"},
        "references": [{"referenceId": "home", "status": "compared"}],
        "checks": [{"name": "test", "state": "passed", "detail": "OK"}],
    }
    summary_path.write_text(json.dumps(summary_data), encoding="utf-8")

    # Initial write: exit 0
    cmd = [
        sys.executable,
        "-m",
        "pixelproof_image.cli",
        "report",
        "--summary",
        str(summary_path),
        "--out",
        str(out_dir),
    ]
    proc1 = subprocess.run(cmd, capture_output=True, text=True, check=False)
    assert proc1.returncode == 0

    # Second write without --overwrite: exit 1, output_exists
    proc2 = subprocess.run(cmd, capture_output=True, text=True, check=False)
    assert proc2.returncode == 1
    data2 = json.loads(proc2.stdout)
    assert data2["status"] == "failed"
    assert data2["error"]["code"] == "output_exists"
    assert "--overwrite" in data2["error"]["message"]
    assert "overwrite=True" not in data2["error"]["message"]

    # Third write with --overwrite: exit 0
    proc3 = subprocess.run(cmd + ["--overwrite"], capture_output=True, text=True, check=False)
    assert proc3.returncode == 0
    data3 = json.loads(proc3.stdout)
    assert data3["status"] == "written"


def test_report_differing_and_identical_references_notes_and_summary(tmp_path: Path):
    """Test differingReferences, identicalReferences, and note lines under OVERALL banner."""
    # 1. 2 of 3 references differing -> NOTE says 2 of 3, differingReferences 2, OVERALL line unchanged
    summary_2_of_3 = {
        "project": {"name": "Test 2 of 3"},
        "references": [
            {"referenceId": "ref1", "status": "compared", "metrics": {"mae": 1.0}, "differingPixels": 10},
            {"referenceId": "ref2", "status": "compared", "metrics": {"mae": 2.5}, "differingPixels": 25},
            {"referenceId": "ref3", "status": "compared", "metrics": {"mae": 0.0}, "differingPixels": 0},
        ],
        "checks": [{"name": "check1", "state": "passed", "detail": "Passed"}],
    }
    rep1 = build_report(summary_2_of_3)
    assert rep1["summary"]["differingReferences"] == 2
    assert rep1["summary"]["identicalReferences"] == 1
    assert rep1["summary"]["compared"] == 3
    assert rep1["summary"]["failed"] == 0
    assert rep1["overall"] == "OVERALL: COMPLETE (tool execution only, visual quality not judged)"

    out1 = write_report(rep1, tmp_path / "out1")
    md1 = Path(out1["paths"]["markdown"]).read_text(encoding="utf-8")
    lines1 = [line for line in md1.splitlines() if line.strip()]
    assert lines1[0] == "# OVERALL: COMPLETE (tool execution only, visual quality not judged)"
    assert lines1[1] == "NOTE: 2 of 3 references compared but still differ from their references (see Visual Comparison Metrics)."

    # 2. All identical -> second NOTE, differingReferences 0, identicalReferences count, OVERALL line unchanged
    summary_all_identical = {
        "project": {"name": "Test All Identical"},
        "references": [
            {"referenceId": "ref1", "status": "compared", "metrics": {"mae": 0.0}, "differingPixels": 0},
            {"referenceId": "ref2", "status": "compared", "metrics": {"mae": 0.0}, "differingPixels": 0},
        ],
        "checks": [{"name": "check1", "state": "passed", "detail": "Passed"}],
    }
    rep2 = build_report(summary_all_identical)
    assert rep2["summary"]["differingReferences"] == 0
    assert rep2["summary"]["identicalReferences"] == 2
    assert rep2["summary"]["compared"] == 2
    assert rep2["summary"]["failed"] == 0
    assert rep2["overall"] == "OVERALL: COMPLETE (tool execution only, visual quality not judged)"

    out2 = write_report(rep2, tmp_path / "out2")
    md2 = Path(out2["paths"]["markdown"]).read_text(encoding="utf-8")
    lines2 = [line for line in md2.splitlines() if line.strip()]
    assert lines2[0] == "# OVERALL: COMPLETE (tool execution only, visual quality not judged)"
    assert lines2[1] == "NOTE: All compared references have 0 differing pixels (this is a measurement, not proof of correctness)."

    # 3. Failed references are not counted as either (differing or identical), OVERALL line unchanged
    summary_with_failed = {
        "project": {"name": "Test Failed Excluded"},
        "references": [
            {"referenceId": "ref1", "status": "compared", "metrics": {"mae": 1.0}, "differingPixels": 10},
            {"referenceId": "ref2", "status": "compared", "metrics": {"mae": 0.0}, "differingPixels": 0},
            {"referenceId": "ref3", "status": "failed", "error": {"code": "image_missing", "message": "File not found"}},
        ],
        "checks": [{"name": "check1", "state": "passed", "detail": "Passed"}],
    }
    rep3 = build_report(summary_with_failed)
    # Failed reference must NOT be counted as differing or identical
    assert rep3["summary"]["differingReferences"] == 1
    assert rep3["summary"]["identicalReferences"] == 1
    assert rep3["summary"]["compared"] == 2
    assert rep3["summary"]["failed"] == 1
    assert rep3["summary"]["totalReferences"] == 3
    # OVERALL line is unchanged (INCOMPLETE because ref3 failed)
    assert rep3["overall"] == "OVERALL: INCOMPLETE"

    out3 = write_report(rep3, tmp_path / "out3")
    md3 = Path(out3["paths"]["markdown"]).read_text(encoding="utf-8")
    lines3 = [line for line in md3.splitlines() if line.strip()]
    assert lines3[0] == "# OVERALL: INCOMPLETE"
    assert lines3[1] == "NOTE: 1 of 2 references compared but still differ from their references (see Visual Comparison Metrics)."
