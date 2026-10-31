# PixelProof

PixelProof is an AI coding-agent skill and deterministic visual verification toolkit designed to reconstruct multi-page websites from screenshot references, compare browser captures against references, and iteratively refine the resulting code.

## Current Status

Phase 1 complete except Phase 2+ features.

The Phase 1 visual comparison engine, read-only project inspector, manifest validator, and report generator are implemented in Python. Features planned for subsequent phases—including browser automation with Playwright (`capture`), perceptual SSIM, region-based comparison, automated issue ranking, and the autonomous multi-iteration refinement loop (`run`)—are NOT BUILT YET (Phase 2/3).

## Testing

Run the automated test suite:

- Python test suite (63 unit & CLI tests):
  ```bash
  pytest -q
  ```
- Node environment smoke test:
  ```bash
  npm test
  ```

## Available CLI Commands

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
