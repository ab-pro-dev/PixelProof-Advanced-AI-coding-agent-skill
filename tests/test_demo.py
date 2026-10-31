import re
from pathlib import Path
import subprocess
import sys
import numpy as np
from PIL import Image


def test_demo_phase1_execution():
    """Execute scripts/demo_phase1.py and assert exit 0, matching numpy MAE, and INCOMPLETE overall status."""
    repo_root = Path(__file__).resolve().parent.parent
    script_path = repo_root / "scripts" / "demo_phase1.py"
    dashboard_ref_path = repo_root / "examples" / "sample-project" / "references" / "dashboard.png"

    # 1. Run the demo script via subprocess
    proc = subprocess.run(
        [sys.executable, str(script_path)],
        capture_output=True,
        text=True,
        check=False,
    )

    assert proc.returncode == 0, f"Script failed with exit {proc.returncode}: {proc.stderr}"
    lines = proc.stdout.strip().splitlines()
    assert len(lines) == 5, f"Expected 5 output lines, got {len(lines)}: {proc.stdout}"

    # 2. Independently compute expected MAE with numpy
    ref_img = Image.open(dashboard_ref_path).convert("RGB")
    act_img = ref_img.copy()
    for x in range(20, 30):
        for y in range(20, 30):
            act_img.putpixel((x, y), (255, 0, 0))

    ref_arr = np.array(ref_img, dtype=np.int16)
    act_arr = np.array(act_img, dtype=np.int16)
    expected_mae = float(np.mean(np.abs(ref_arr - act_arr)))

    # 3. Assert the dashboard MAE printed equals the independent numpy calculation
    dashboard_line = lines[3]
    assert "compare (dashboard)" in dashboard_line
    mae_match = re.search(r"mae=([0-9.]+)", dashboard_line)
    assert mae_match is not None, f"Could not find mae in line: {dashboard_line}"
    printed_mae = float(mae_match.group(1))
    assert printed_mae == expected_mae

    # 4. Assert the overall report line is INCOMPLETE
    report_line = lines[4]
    assert "report:" in report_line
    assert "overall=OVERALL: INCOMPLETE" in report_line
