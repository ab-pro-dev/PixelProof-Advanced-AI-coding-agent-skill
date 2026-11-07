# PixelProof

PixelProof is an AI coding-agent skill and deterministic visual verification toolkit designed to reconstruct multi-page websites from screenshot references, compare browser captures against references, and iteratively refine the resulting code.

## Current Status

Phases 1 and 2 done; Phase 3 evidence tools done; agent loop instructions in SKILL.md.

The Phase 1 comparison engine, read-only project inspector, manifest validator, and report generator are fully implemented, along with Phase 2 Playwright browser capture and Phase 3 refinement iteration state tracking, delta calculations, region grid metrics, priority scoring, and stall/regression/stop-reason evaluation. Actionable error hints (`error.hint`) provide next-step guidance on all failure results across Python and TypeScript (spec §11). Planned future features—including perceptual SSIM, DOM geometry checks, and the autonomous multi-iteration refinement loop (`run`)—are NOT BUILT YET (Phase 3/4).

## Run the Demo

Run the end-to-end Phase 1 demonstration pipeline with a single command:

```bash
python scripts/demo_phase1.py
```

Run the end-to-end Phase 2 multi-route browser capture and comparison pipeline:

```bash
node scripts/demo_phase2.mjs
```

## Testing

Run the automated test suite:

- Python test suite (64 unit & CLI tests):
  ```bash
  pytest -q
  ```
- Node environment smoke test:
  ```bash
  npm test
  ```

## Installation

See [docs/install.md](docs/install.md) for step-by-step setup instructions on Linux, macOS, and Windows.
See [docs/decisions.md](docs/decisions.md) for owner-delegated decisions resolving architectural questions Q1 to Q9.

## Available CLI Commands

### TypeScript CLI (`pixelproof`)

The TypeScript CLI provides automated manifest validation, project inspection, browser capture, visual comparison, and final reporting:

1. **Manifest Validation:**
   ```bash
   pixelproof validate --manifest PATH [--python CMD]
   ```
   Validates reference manifest schema, viewport dimensions, deviceScaleFactor, and image readability.

2. **Project Inspection:**
   ```bash
   pixelproof inspect --project DIR [--python CMD]
   ```
   Inspects target project framework, package manager, build scripts, styling, assets, and Git status in read-only mode.

3. **Browser Capture:**
   ```bash
   pixelproof capture --manifest PATH --out DIR [--base-url URL] [--overwrite] [--ready-selector SEL] [--wait-until load|domcontentloaded|networkidle] [--python CMD]
   ```
   Captures deterministic screenshots for every reference registered in a manifest using Playwright, reporting JSON results to stdout.

4. **Image Comparison & Visual Artifacts:**
   ```bash
   pixelproof compare --id ID --reference PATH --actual PATH --out DIR [--overwrite] [--regions] [--grid RxC] [--weights PATH] [--python CMD]
   ```
   Computes exact Mean Absolute Error (MAE), counts differing pixels, generates overlay, diff, and side-by-side visual artifacts, and optionally computes region-based grid measurements (`--regions`) with deterministic ranking (measured-only by `areaFraction * diffRatio`, no severity labels or thresholds) and optional owner-supplied region weights (`--weights PATH`, applying visual importance $V$ as `weightedScore = score * weight`). See [docs/visual-analysis.md](docs/visual-analysis.md) for details on region grid metrics, owner-supplied weights, and the priority scoring heuristic ($P$).

5. **Final Report Generation:**
   ```bash
   pixelproof report --summary PATH --out DIR [--overwrite] [--python CMD]
   ```
   Generates machine-readable `report.json` and human-readable `report.md` covering all specification sections.

6. **Refinement Iteration Tracking:**
   ```bash
   pixelproof iterate --manifest PATH --actual-dir DIR --out DIR [--overwrite] [--python CMD]
   ```
   Records one refinement iteration and evaluates progress (MAE and differing pixels deltas) relative to the previous iteration under `<out>/state/iterations.json`. Iteration state + deltas, agent-driven (AGENT PROPOSAL pending Q1/Q8).

7. **Iteration Progress & Stop Reasons:**
   ```bash
   pixelproof progress --state PATH [--stall-window N] [--python CMD]
   ```
   Evaluates iteration progress, regressions, stall conditions, and stop reasons from state file in read-only mode. Stall/regression/stop reasons (AGENT PROPOSAL pending Q1/Q8).

8. **Environment Doctor & Capability Verification:**
   ```bash
   pixelproof doctor [--json] [--python CMD]
   ```
   Evaluates runtime environment, Node.js version, Python version, required packages, and Chromium launchability against specification requirements (§9.3, §19). See [docs/install.md](docs/install.md) for installation instructions.

9. **Project Initialization (built):**

   `pixelproof init [--dir DIR] [--overwrite]`: built; creates `references.json`, `references/.gitkeep`, and `pixelproof.config.json` (default DIR: cwd). Existing files are refused without `--overwrite`. Add your 1280×720 PNG at `references/home-desktop.png` before validating; until then, `validate` reports `image_missing`. Pass `--config pixelproof.config.json` to use the generated configuration.

Planned TypeScript CLI commands:

- `pixelproof run`: NOT BUILT YET (Phase 3 / spec §11)

### Python CLI (`pixelproof_image.cli`)

Phase 1 tools are invoked via the Python CLI (`pixelproof_image.cli`):

1. **Manifest Validation:**
   ```bash
   python -m pixelproof_image.cli validate --manifest PATH
   ```
   Validates reference manifest schema, viewport dimensions, deviceScaleFactor, and image readability.

2. **Project Inspection:**
   ```bash
   python -m pixelproof_image.cli inspect --project DIR
   ```
   Inspects target project framework, package manager, build scripts, styling, assets, and Git status in read-only mode without modifying files.

3. **Image Comparison & Visual Artifacts:**
   ```bash
   python -m pixelproof_image.cli compare --id ID --reference PATH --actual PATH --out DIR [--overwrite] [--regions] [--grid RxC] [--weights PATH]
   ```
   Computes exact Mean Absolute Error (MAE), counts differing pixels, generates overlay, diff, and side-by-side visual artifacts, and optionally computes region-based grid measurements (`--regions`) with deterministic ranking (measured-only by `areaFraction * diffRatio`, no severity labels or thresholds) and optional owner-supplied region weights (`--weights PATH`, applying visual importance $V$ as `weightedScore = score * weight`).

4. **Final Report Generation:**
   ```bash
   python -m pixelproof_image.cli report --summary PATH --out DIR [--overwrite]
   ```
   Generates machine-readable `report.json` and human-readable `report.md` covering all 10 specification sections and enforcing honest completion reporting.

5. **Refinement Iteration Tracking:**
   ```bash
   python -m pixelproof_image.cli iterate --manifest PATH --actual-dir DIR --out DIR [--overwrite]
   ```
   Records one refinement iteration and evaluates progress (MAE and differing pixels deltas) relative to the previous iteration under `<out>/state/iterations.json`. Iteration state + deltas, agent-driven (AGENT PROPOSAL pending Q1/Q8).

6. **Iteration Progress & Stop Reasons:**
   ```bash
   python -m pixelproof_image.cli progress --state PATH [--stall-window N]
   ```
   Evaluates iteration progress, regressions, stall conditions, and stop reasons from state file in read-only mode. Stall/regression/stop reasons (AGENT PROPOSAL pending Q1/Q8).

## Schemas

PixelProof maintains JSON Schema (2020-12) contracts for manifest inputs, comparison outputs, and run configurations:

- `schemas/references.schema.json`: Contract for input reference manifests (`references.json`), including optional owner-supplied `regionWeights` (`grid` and `weights` matrix).
- `schemas/comparison-report.schema.json`: Contract for visual comparison tool outputs (`compared` and `failed` results).
- `schemas/iteration-state.schema.json`: Contract for refinement iteration state files (`iterations.json`).
- `schemas/config.schema.json`: Contract for run configuration options (validating `config/default.json`; marked NOT BUILT YET pending Phase 3).

## Real App Test

`examples/real-app/` is a minimal Vite + React application with two routes for manual end-to-end testing against the PixelProof CLI:

```bash
cd examples/real-app && npm install && npm run dev
# In another terminal:
pixelproof capture --manifest examples/real-app/references/references.json --out /tmp/real-app-out
```

## Plain HTML Example

`examples/plain-html/` is a static HTML/CSS fixture (no JavaScript, system fonts) with two routes (`/` and `/about`). Serve it with `python -m http.server 5174 --bind 127.0.0.1`.

