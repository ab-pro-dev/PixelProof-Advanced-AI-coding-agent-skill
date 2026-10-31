"""Phase 1 demonstration script for PixelProof.

Executes the real CLI chain (validate, inspect, compare x2, report) against
the committed sample project and outputs a single summary line per step.
"""

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import tempfile
from PIL import Image


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    sample_project = repo_root / "examples" / "sample-project"
    manifest_path = sample_project / "references" / "references.json"
    landing_ref = sample_project / "references" / "landing.png"
    dashboard_ref = sample_project / "references" / "dashboard.png"

    with tempfile.TemporaryDirectory() as tmp_dir_str:
        tmp_dir = Path(tmp_dir_str)
        actuals_dir = tmp_dir / "actuals"
        out_dir = tmp_dir / "out"
        actuals_dir.mkdir(parents=True, exist_ok=True)
        out_dir.mkdir(parents=True, exist_ok=True)

        # 1. Generate "actual" images
        # Landing: identical to reference
        act_landing = Image.open(landing_ref).convert("RGB")
        act_landing_path = actuals_dir / "act_landing.png"
        act_landing.save(act_landing_path)

        # Dashboard: copy with 10x10 block changed
        act_dashboard = Image.open(dashboard_ref).convert("RGB")
        for x in range(20, 30):
            for y in range(20, 30):
                act_dashboard.putpixel((x, y), (255, 0, 0))
        act_dashboard_path = actuals_dir / "act_dashboard.png"
        act_dashboard.save(act_dashboard_path)

        # Step 1: validate
        p_val = subprocess.run(
            [sys.executable, "-m", "pixelproof_image.cli", "validate", "--manifest", str(manifest_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        val_data = json.loads(p_val.stdout) if p_val.stdout else {}
        print(f"validate: exit {p_val.returncode}, status={val_data.get('status')}, references={val_data.get('referenceCount')}")

        # Step 2: inspect
        p_insp = subprocess.run(
            [sys.executable, "-m", "pixelproof_image.cli", "inspect", "--project", str(sample_project)],
            capture_output=True,
            text=True,
            check=False,
        )
        insp_data = json.loads(p_insp.stdout) if p_insp.stdout else {}
        print(f"inspect: exit {p_insp.returncode}, status={insp_data.get('status')}, framework={insp_data.get('framework', {}).get('value')}")

        # Step 3: compare landing
        p_comp1 = subprocess.run(
            [
                sys.executable,
                "-m",
                "pixelproof_image.cli",
                "compare",
                "--id",
                "landing",
                "--reference",
                str(landing_ref),
                "--actual",
                str(act_landing_path),
                "--out",
                str(out_dir),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        comp1_data = json.loads(p_comp1.stdout) if p_comp1.stdout else {}
        print(
            f"compare (landing): exit {p_comp1.returncode}, status={comp1_data.get('status')}, "
            f"mae={comp1_data.get('metrics', {}).get('mae')}, differingPixels={comp1_data.get('differingPixels')}"
        )

        # Step 4: compare dashboard
        p_comp2 = subprocess.run(
            [
                sys.executable,
                "-m",
                "pixelproof_image.cli",
                "compare",
                "--id",
                "dashboard",
                "--reference",
                str(dashboard_ref),
                "--actual",
                str(act_dashboard_path),
                "--out",
                str(out_dir),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        comp2_data = json.loads(p_comp2.stdout) if p_comp2.stdout else {}
        print(
            f"compare (dashboard): exit {p_comp2.returncode}, status={comp2_data.get('status')}, "
            f"mae={comp2_data.get('metrics', {}).get('mae')}, differingPixels={comp2_data.get('differingPixels')}"
        )

        # Step 5: report
        val_state = "passed" if p_val.returncode == 0 else "failed"
        insp_state = "passed" if p_insp.returncode == 0 else "failed"
        comp_state = "passed" if (p_comp1.returncode == 0 and p_comp2.returncode == 0) else "failed"

        run_summary = {
            "project": {"name": "sample-project"},
            "references": [comp1_data, comp2_data],
            "checks": [
                {"name": "manifest-validation", "state": val_state, "detail": "Manifest validated"},
                {"name": "project-inspection", "state": insp_state, "detail": "Project inspected"},
                {"name": "image-comparison", "state": comp_state, "detail": "Images compared"},
                {"name": "browser-capture", "state": "unavailable", "detail": "Phase 2 not built"},
            ],
            "iterations": 1,
            "limitations": ["Browser capture unavailable in Phase 1"],
            "observations": ["Landing reference identical; dashboard has 100 differing pixels"],
        }
        summary_path = tmp_dir / "run_summary.json"
        summary_path.write_text(json.dumps(run_summary, indent=2), encoding="utf-8")

        p_rep = subprocess.run(
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
        rep_data = json.loads(p_rep.stdout) if p_rep.stdout else {}
        report_json = out_dir / "reports" / "report.json"
        report_md = out_dir / "reports" / "report.md"

        overall_status = "UNKNOWN"
        if report_json.exists():
            try:
                rep_content = json.loads(report_json.read_text(encoding="utf-8"))
                overall_status = rep_content.get("overall", "UNKNOWN")
            except Exception:
                pass

        print(f"report: exit {p_rep.returncode}, status={rep_data.get('status')}, overall={overall_status}")

        report_written = (
            p_rep.returncode == 0
            and rep_data.get("status") == "written"
            and report_json.exists()
            and report_md.exists()
        )
        if not report_written:
            sys.exit(1)


if __name__ == "__main__":
    main()
