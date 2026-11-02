# PixelProof

PixelProof is an AI coding-agent skill and deterministic visual verification toolkit designed to reconstruct multi-page websites from screenshot references, compare browser captures against references, and iteratively refine the resulting code.

## Current Status

Phase 1 complete except Phase 2+ features.

The Phase 1 visual comparison engine, read-only project inspector, manifest validator, and report generator are implemented in Python. Features planned for subsequent phases—including browser automation with Playwright (`capture`), perceptual SSIM, region-based comparison, automated issue ranking, and the autonomous multi-iteration refinement loop (`run`)—are NOT BUILT YET (Phase 2/3).

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
   pixelproof compare --id ID --reference PATH --actual PATH --out DIR [--overwrite] [--regions] [--grid RxC] [--python CMD]
   ```
   Computes exact Mean Absolute Error (MAE), counts differing pixels, generates overlay, diff, and side-by-side visual artifacts, and optionally computes region-based grid measurements (`--regions`).

5. **Final Report Generation:**
   ```bash
   pixelproof report --summary PATH --out DIR [--overwrite] [--python CMD]
   ```
   Generates machine-readable `report.json` and human-readable `report.md` covering all specification sections.

Planned TypeScript CLI commands:
- `pixelproof init`: NOT BUILT YET (Phase 4 / spec §11)
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
   python -m pixelproof_image.cli compare --id ID --reference PATH --actual PATH --out DIR [--overwrite] [--regions] [--grid RxC]
   ```
   Computes exact Mean Absolute Error (MAE), counts differing pixels, generates overlay, diff, and side-by-side visual artifacts, and optionally computes region-based grid measurements (`--regions`).

4. **Final Report Generation:**
   ```bash
   python -m pixelproof_image.cli report --summary PATH --out DIR [--overwrite]
   ```
   Generates machine-readable `report.json` and human-readable `report.md` covering all 10 specification sections and enforcing honest completion reporting.

## Schemas

PixelProof maintains JSON Schema (2020-12) contracts for manifest inputs, comparison outputs, and run configurations:

- `schemas/references.schema.json`: Contract for input reference manifests (`references.json`).
- `schemas/comparison-report.schema.json`: Contract for visual comparison tool outputs (`compared` and `failed` results).
- `schemas/config.schema.json`: Contract for run configuration options (validating `config/default.json`; marked NOT BUILT YET pending Phase 3).

## Real App Test

`examples/real-app/` is a minimal Vite + React application with two routes for manual end-to-end testing against the PixelProof CLI:

```bash
cd examples/real-app && npm install && npm run dev
# In another terminal:
pixelproof capture --manifest examples/real-app/references/references.json --out /tmp/real-app-out
```

