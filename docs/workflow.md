# The PixelProof Execution Workflow

This document details the mandatory 8-step visual reconstruction workflow defined in §5 of the PixelProof project documentation, detailing what the coding agent does, the CLI commands supporting each step, outputs produced, and the features planned for future phases.

---

## 1. Step 01: Register the References

- **What the agent does:** Locates reference screenshot files, identifies target routes and viewport dimensions, and prepares or checks the reference manifest (`references.json`). The agent ensures that each reference image file exists, is readable, and matches the specified viewport dimensions.
- **Which command supports it today:**
  `pixelproof validate --manifest PATH [--python CMD]` (or `python -m pixelproof_image.cli validate ...`)
  Validates manifest syntax (version 1), route formats, viewport width/height, deviceScaleFactor, and image readability. Enforces that image paths stay inside the manifest directory (Option C, AGENT PROPOSAL pending Q3).
- **What is NOT BUILT YET:** Automated reference discovery, interactive registration, and the manifest generation CLI (`pixelproof init`: NOT BUILT YET).

---

## 2. Step 02: Inspect the Project

- **What the agent does:** Evaluates the target frontend codebase before writing or editing any code. Inspects framework, package manager, scripts, routing conventions, styling systems, existing components, asset directories, and Git working tree status. The agent prioritizes existing project architecture over personal preference and strictly preserves unrelated user files.
- **Which command supports it today:**
  `pixelproof inspect --project DIR [--python CMD]` (or `python -m pixelproof_image.cli inspect ...`)
  Performs safe, read-only inspection of package manager lockfiles, package.json dependencies, build/dev scripts, styling libraries, asset/font directories, and Git repository state without modifying files or executing arbitrary project scripts.
- **What is NOT BUILT YET:** Automated routing tree parser, design system token extractor, and TypeScript inspection module (NOT BUILT YET).

---

## 3. Step 03: Analyze the Visual Design

- **What the agent does:** Analyzes reference screenshots and writes a design specification (`design-spec.md`) before implementation. Documents global color palette, typography hierarchy, layout grid, container widths, section order, spacing patterns, component boundaries, and crop behavior.
- **Which command supports it today:** Performed directly by the AI agent; no deterministic CLI command.
- **What is NOT BUILT YET:** Automated visual element extraction, color palette detector, and automated design-spec generator (NOT BUILT YET).

---

## 4. Step 04: Implement the Pages

- **What the agent does:** Creates or edits frontend source code to reconstruct requested pages, adhering to the framework, styling system, and component patterns identified during project inspection. Reuses existing shared components (header, footer, buttons, cards), utilizes local assets, and avoids introducing unnecessary dependencies or modifying unrelated code.
- **Which command supports it today:** Performed directly by the AI agent using standard file-editing tools.
- **What is NOT BUILT YET:** Framework-specific component scaffolders and template generators (NOT BUILT YET).

---

## 5. Step 05: Capture Actual Browser Output

- **What the agent does:** Connects to the local application development or preview server started by the owner (agent never launches project server commands), opens target routes in a headless browser at deterministic viewport sizes, and captures viewport screenshots.
- **Which command supports it today:**
  `pixelproof capture --manifest PATH --out DIR [--base-url URL] [--overwrite] [--ready-selector SELECTOR] [--wait-until load|domcontentloaded|networkidle] [--python CMD]`
  Captures deterministic PNG screenshots matching reference dimensions using Playwright, writing screenshots to `<out>/<id>.png`.
- **What is NOT BUILT YET:** Automated dev server lifecycle management, project launch commands, and full-page/region capture modes (NOT BUILT YET).

---

## 6. Step 06: Compare and Rank Differences

- **What the agent does:** Compares actual browser captures against reference screenshots for every registered viewport and route. Generates visual comparison artifacts (overlay, diff image, side-by-side), computes numeric error metrics (MAE, differing pixels), and evaluates regional discrepancies with optional owner-supplied importance weights.
- **Which command supports it today:**
  `pixelproof compare --id ID --reference PATH --actual PATH --out DIR [--overwrite] [--regions] [--grid RxC] [--weights PATH] [--python CMD]` (or `python -m pixelproof_image.cli compare ...`)
- **Outputs produced:**
  - Machine-readable comparison JSON written to stdout matching `schemas/comparison-report.schema.json`.
  - Visual comparison artifacts under `<out>/comparison/`:
    - `<id>-overlay.png`: 50/50 blend overlay highlighting differences.
    - `<id>-diff.png`: solid-red pixel diff mask.
    - `<id>-side-by-side.png`: side-by-side composite image.
  - Regional analysis (`--regions`): 4x4 grid (or custom `--grid RxC`) computing `areaFraction` and `diffRatio` per cell, plus deterministic ranking sorted descending by score `areaFraction * diffRatio` (AGENT PROPOSAL pending Q8).
  - Weighted ranking (`--weights PATH`): applies owner visual weights $V \in (0, 10]$ computing `weightedScore = score * weight`, `priorityScore = weightedScore`, and `factors` object `{A, S, V, R: null}` (AGENT PROPOSAL pending Q8).
- **What is NOT BUILT YET:** Perceptual similarity metrics (SSIM: NOT BUILT YET), DOM geometry extraction (DOM geometry checks: NOT BUILT YET), severity labels (high/medium/low severity labels: NOT BUILT YET), and factor R reuse weighting (factor R: NOT BUILT YET).

---

## 7. Step 07: Refine and Repeat

- **What the agent does:** Analyzes comparison findings to locate root causes of visual defects. Fixes problems in priority order: missing sections, structural layout, alignment, shared components, image crops, typography, and styling details. Applies minimal code edits, recaptures affected routes, and checks for regressions across shared components. Stops at iteration limit or when improvements stall.
- **Which command supports it today:**
  - `pixelproof iterate --manifest PATH --actual-dir DIR --out DIR [--overwrite] [--python CMD]` (or `python -m pixelproof_image.cli iterate ...`): Records one refinement iteration and computes progress deltas (MAE and differing pixels) relative to the previous iteration under `<out>/state/iterations.json`.
  - `pixelproof progress --state PATH [--stall-window N] [--python CMD]` (or `python -m pixelproof_image.cli progress ...`): Read-only command evaluating refinement progress, regressions, stall conditions, and stop reasons.
- **Outputs produced:**
  - `<out>/state/iterations.json`: atomic state document tracking all iteration timestamps and reference metrics matching `schemas/iteration-state.schema.json`.
  - JSON output to stdout with status `"recorded"`, current iteration number, remaining iterations, per-reference deltas (`improved`, `worse`, `same`, `recovered`, `failed`), and progress evaluation.
  - Progress evaluation object (`evaluate_progress`): `totalDifferingPixels` (list across compared references), `regressions` (`worse` with `pixelsDelta`, `failed`), `stalled` bool, `stallWindow`, `stopReason`, and `stopIsSuccess: false`.
- **Evaluation Rules & Precedence (§8.1, §8.4) (AGENT PROPOSALS pending Q1/Q8):**
  1. **Stall Detection (Window 2):** Stalled when the total differing pixels do not decrease across at least `stall_window` (default 2) consecutive iterations (requires $\text{stall\_window} + 1 = 3$ iterations of history). If totals are all zero, it is `no_differences`, not stalled.
  2. **Regression Tracking:** Reports any reference in the latest iteration that worsened (increased differing pixels) or failed (compared previously, failed now).
  3. **Stop Reason Precedence (first match wins):**
     - `blocked`: Any reference failed in the latest iteration.
     - `no_differences`: All references compared and total differing pixels == 0.
     - `limit_reached`: Latest iteration number >= `maxIterations`.
     - `stalled`: Stall condition triggered.
     - `null`: No stop reason met; continue refinement.
  4. **Stop is Not Success (§8.4):** `stopIsSuccess` is always `false`. Reaching a stop condition ceases iteration; it does not declare the visual output bug-free or successful.
- **What is NOT BUILT YET:** The autonomous multi-iteration refinement loop (`pixelproof run`: NOT BUILT YET), automatic code-fix application (NOT BUILT YET), and automated root-cause repair engine (NOT BUILT YET).

---

## 8. Step 08: Verify and Report

- **What the agent does:** Executes build and test commands, records check results under the four explicit states (`passed`, `failed`, `skipped`, `unavailable`), and compiles comprehensive machine-readable and human-readable reports. Discloses any unverified pages, failed references, or skipped checks honestly.
- **Which command supports it today:**
  `pixelproof report --summary PATH --out DIR [--overwrite] [--python CMD]` (or `python -m pixelproof_image.cli report ...`)
- **Outputs produced:**
  - `<out>/reports/report.json`: machine-readable report covering all 10 specification sections (§16).
  - `<out>/reports/report.md`: human-readable report with honesty banner (`# OVERALL: INCOMPLETE` if any reference failed or check not passed, `# OVERALL: COMPLETE (tool execution only, visual quality not judged)` otherwise).
- **What is NOT BUILT YET:** Automated PR creation (NOT BUILT YET), evidence artifact publishing (NOT BUILT YET), and unified end-to-end execution (`pixelproof run`: NOT BUILT YET).
