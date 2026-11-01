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

The TypeScript CLI entry point provides automated browser capture:

```bash
pixelproof capture --manifest PATH --out DIR [--base-url URL] [--overwrite] [--ready-selector SEL] [--wait-until load|domcontentloaded|networkidle] [--python CMD]
```
Captures deterministic screenshots for every reference registered in a manifest using Playwright, reporting JSON results to stdout.

Planned commands:
- `pixelproof init`: NOT BUILT YET (Phase 4 / spec §11)
- `pixelproof run`: NOT BUILT YET (Phase 3 / spec §11)
- Wrapped Phase 1 tools (`pixelproof validate`, `pixelproof compare`, `pixelproof inspect`, `pixelproof report`): NOT BUILT YET in the TypeScript CLI; invoke via Python CLI below.

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
   python -m pixelproof_image.cli compare --id ID --reference PATH --actual PATH --out DIR [--overwrite]
   ```
   Computes exact Mean Absolute Error (MAE), counts differing pixels, and generates overlay, diff, and side-by-side visual artifacts.

4. **Final Report Generation:**
   ```bash
   python -m pixelproof_image.cli report --summary PATH --out DIR [--overwrite]
   ```
   Generates machine-readable `report.json` and human-readable `report.md` covering all 10 specification sections and enforcing honest completion reporting.
