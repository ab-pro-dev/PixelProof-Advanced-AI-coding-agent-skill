# PixelProof §15 Acceptance Verification Evidence

This document records real execution evidence for each of the eight release verification criteria defined in §15 of the PixelProof specification.

---

## 1. Manifest Validation (§15)

### Valid Manifest
- **Command:** `node dist/src/cli/index.js validate --manifest examples/sample-project/references/references.json`
- **Result:** Exit code 0, `status: valid`, `referenceCount: 2`.

### Invalid Manifest
- **Command:** `node dist/src/cli/index.js validate --manifest /tmp/invalid-manifest.json` (version: 99, empty references)
- **Result:** Exit code 1, `status: invalid`, errors: `invalid_version` ("Version must equal 1, got 99"), `empty_references` ("Field 'references' must not be empty").

---

## 2. Project Inspection (§5.2, §15)

- **Command:** `node dist/src/cli/index.js inspect --project examples/plain-html`
- **Result:** Exit code 0, `status: inspected`, `framework: Plain HTML/CSS/JS`, `git.isRepo: true`.
- **Read-Only Verification:** `git status -s` evaluated before and after execution was identical; no files modified, created, or deleted.

---

## 3. Browser Capture (§13, §15)

- **Command:** `node dist/src/cli/index.js capture --manifest examples/plain-html/references/references.json --out /tmp/acceptance-capture --overwrite` (against local server at 127.0.0.1:5174)
- **Result:** Exit code 0, `status: completed`, `total: 2`, `captured: 2`, `failed: 0`.
- **Pillow Image Verification:**
  - `home-desktop.png`: Dimensions `(1280, 720)`, format `PNG`.
  - `about-desktop.png`: Dimensions `(1280, 720)`, format `PNG`.

---

## 4. Visual Comparison (§7.1, §15)

- **Command:** `node dist/src/cli/index.js compare --id landing --reference examples/sample-project/references/landing.png --actual examples/sample-project/references/landing.png --out /tmp/acceptance-compare --overwrite`
- **Result:** Exit code 0, `status: compared`, `metrics.mae: 0.0`, `differingPixels: 0`.
- **Artifacts Generated:**
  - Overlay: `/tmp/acceptance-compare/comparison/landing-overlay.png` (252 bytes)
  - Diff: `/tmp/acceptance-compare/comparison/landing-diff.png` (253 bytes)
  - Side-by-Side: `/tmp/acceptance-compare/comparison/landing-side-by-side.png` (312 bytes)

---

## 5. Iterative Workflow (§8.1, §15)

- **Commands:**
  1. `node dist/src/cli/index.js iterate --manifest examples/sample-project/references/references.json --actual-dir examples/sample-project/references --out /tmp/acceptance-iter --overwrite` (iteration 1, remaining 4)
  2. `node dist/src/cli/index.js iterate --manifest examples/sample-project/references/references.json --actual-dir examples/sample-project/references --out /tmp/acceptance-iter` (iteration 2, remaining 3)
  3. `node dist/src/cli/index.js progress --state /tmp/acceptance-iter/state/iterations.json`
- **Result:** `totalDifferingPixels: [0, 0]`, `stalled: false`, `stallWindow: 2`, `stopReason: blocked`, `stopIsSuccess: false`.

---

## 6. Failure Reporting (§15, §16)

- **Command:** `node dist/src/cli/index.js report --summary /tmp/failed-summary.json --out /tmp/acceptance-report --overwrite` (summary containing a failed reference)
- **Result:** Exit code 0, generated `/tmp/acceptance-report/reports/report.md`.
- **Report Banner:** Heading `# OVERALL: INCOMPLETE` truthfully disclosing: `Reference 'unknown' failed: dimension_mismatch - Image dimensions do not match reference`.

---

## 7. Portability (§9, §15)

- **Command:** `grep -ci "claude\|gemini\|cursor\|copilot" SKILL.md`
- **Result:** Count `0` matches. Core skill instructions contain no vendor-specific extensions or proprietary prompt bindings.

---

## 8. Safety (§13, §17, §15)

### External URL Block
- **Command:** `node dist/src/cli/index.js capture --manifest /tmp/safety-test/ext-manifest.json --out /tmp/safety-test/out` (manifest with `baseUrl: "https://example.com"`)
- **Result:** `captured: 0`, `failed: 1`, error code `url_not_allowed` ("Host 'example.com' is not allowed by default. Only local hosts (localhost, 127.0.0.1, ::1) are permitted").

### Path Escape Block
- **Command:** `node dist/src/cli/index.js validate --manifest /tmp/safety-test/escape-manifest.json` (image path `../../outside.png`)
- **Result:** Exit code 1, `status: invalid`, error code `path_escape` ("Image path escapes manifest folder: ../../outside.png").
