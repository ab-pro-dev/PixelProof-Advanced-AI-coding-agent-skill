# PixelProof Troubleshooting Guide

This guide describes common error codes returned by the PixelProof CLI and concrete steps to resolve them.

## Common CLI Errors & Diagnostic Hints (§11)

### `dimension_mismatch` / `image_size_mismatch`
- **Symptom:** `pixelproof compare` fails because image dimensions do not match.
- **Cause:** Actual browser capture width/height does not match reference PNG dimensions.
- **Resolution:** Check `viewport` in `references.json` and ensure `deviceScaleFactor` (DSF) is set accurately (e.g., 1280x720 at DSF 1 produces 1280x720 pixels; DSF 2 produces 2560x1440).

### `navigation_failed`
- **Symptom:** `pixelproof capture` reports `status: failed` with `navigation_failed`.
- **Cause:** Playwright cannot connect to `baseUrl` (e.g., `ECONNREFUSED` on port 5173 or 5174).
- **Resolution:** Start the local development server before running capture. PixelProof operates in connect-only mode and does not start servers automatically.

### `readiness_timeout`
- **Symptom:** Browser capture times out waiting for page readiness.
- **Cause:** `--ready-selector` selector was not found or page stalled on network requests.
- **Resolution:** Verify the selector exists in the DOM. Use `--wait-until domcontentloaded` or `--wait-until load` instead of `networkidle` if open connections exist.

### `output_exists`
- **Symptom:** Tool exits with `output_exists`.
- **Cause:** Comparison artifacts, capture outputs, or init starter files already exist.
- **Resolution:** Supply `--overwrite` to replace existing artifacts, or specify a clean `--out` directory.

### Chromium Not Launchable
- **Symptom:** `pixelproof doctor` reports Chromium launch failure.
- **Cause:** Playwright browser binaries or OS dependencies are missing.
- **Resolution:** Run `npx playwright install chromium` (and `npx playwright install-deps chromium` on Linux).

## Using the Environment Doctor (§9.3, §19)

Run `pixelproof doctor` to diagnose environment issues:
```bash
pixelproof doctor          # Human-readable diagnostic output
pixelproof doctor --json   # Machine-readable JSON output
```
Checks verified: Node.js version (>= 20), Python version (>= 3.12), Pillow & NumPy imports, Playwright Chromium headless launch, and `dist/` compilation.
