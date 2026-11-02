# The PixelProof Execution Workflow

This document details the mandatory 8-step visual reconstruction workflow defined in §5 of the PixelProof project documentation, detailing what the coding agent does, the CLI commands supporting each step in Phase 1, and the features planned for future phases.

---

## 1. Step 01: Register the References

- **What the agent does:** Locates reference screenshot files, identifies the target routes and viewport dimensions, and prepares or checks the reference manifest (`references.json`). The agent ensures that each reference image file exists, is readable, and matches the specified viewport dimensions.
- **Which command supports it today:**
  `python -m pixelproof_image.cli validate --manifest PATH`
  Validates manifest syntax (version 1), route formats, viewport width/height, deviceScaleFactor, and image readability. Enforces that image paths stay inside the manifest directory (Option C, AGENT PROPOSAL pending Q3).
- **What is NOT BUILT YET:** Automated reference discovery, interactive registration, and the manifest generation CLI (`pixelproof init`) are NOT BUILT YET (Phase 2).

---

## 2. Step 02: Inspect the Project

- **What the agent does:** Evaluates the target frontend codebase before writing or editing any code. Inspects framework, package manager, scripts, routing conventions, styling systems, existing components, asset directories, and Git working tree status. The agent prioritizes existing project architecture over personal preference and strictly preserves unrelated user files.
- **Which command supports it today:**
  `python -m pixelproof_image.cli inspect --project DIR`
  Performs safe, read-only inspection of package manager lockfiles, package.json dependencies, build/dev scripts, styling libraries, asset/font directories, and Git repository state without modifying files or executing arbitrary project scripts.
- **What is NOT BUILT YET:** Automated routing tree parser, design system token extractor, and TypeScript inspection module are NOT BUILT YET (Phase 2).

---

## 3. Step 03: Analyze the Visual Design

- **What the agent does:** Analyzes reference screenshots and writes a design specification (`design-spec.md`) before implementation. Documents the global color palette, typography hierarchy, layout grid, container widths, section order, spacing patterns, component boundaries, and crop behavior.
- **Which command supports it today:** Performed directly by the AI agent; no deterministic CLI command.
- **What is NOT BUILT YET:** Automated visual element extraction, color palette detector, and automated design-spec generator are NOT BUILT YET (Phase 3).

---

## 4. Step 04: Implement the Pages

- **What the agent does:** Creates or edits frontend source code to reconstruct requested pages, adhering to the framework, styling system, and component patterns identified during project inspection. Reuses existing shared components (header, footer, buttons, cards), utilizes local assets, and avoids introducing unnecessary dependencies or modifying unrelated code.
- **Which command supports it today:** Performed directly by the AI agent using standard file-editing tools.
- **What is NOT BUILT YET:** Framework-specific component scaffolders and template generators are NOT BUILT YET (Phase 4).

---

## 5. Step 05: Capture Actual Browser Output

- **What the agent does:** Launches the local application development or preview server, waits for the server to be ready, opens the target routes in a headless browser at deterministic viewport sizes, and captures full-page or viewport screenshots.
- **Which command supports it today:** None. The agent must use manual browser tools or an external browser environment if available.
- **What is NOT BUILT YET:** Headless browser automation, Playwright integration, deterministic screenshot capture, and the `pixelproof capture` command are NOT BUILT YET (Phase 2).

---

## 6. Step 06: Compare and Rank Differences

- **What the agent does:** Compares actual browser captures against reference screenshots for every registered viewport and route. Generates visual comparison artifacts (overlay, diff image, side-by-side) and computes numeric error metrics to evaluate visual discrepancies.
- **Which command supports it today:**
  `python -m pixelproof_image.cli compare --id ID --reference PATH --actual PATH --out DIR [--overwrite]`
  Computes Mean Absolute Error (MAE), counts differing pixels, and generates 50/50 blend overlay, solid-red difference image, and side-by-side comparison artifacts under `comparison/`.
- **What is NOT BUILT YET:** Perceptual similarity metrics (SSIM), DOM geometry extraction, region-based comparison, and automated issue ranking ($P = A \times S \times V \times R$) are NOT BUILT YET (Phase 3).

---

## 7. Step 07: Refine and Repeat

- **What the agent does:** Analyzes comparison findings to locate root causes of visual defects. Fixes problems in priority order: missing sections, structural layout, alignment, shared components, image crops, typography, and styling details. Applies minimal code edits, recaptures affected routes, and checks for regressions across shared components. Stops at iteration limit or when improvements stall.
- **Which command supports it today:**
  `pixelproof iterate --manifest PATH --actual-dir DIR --out DIR [--overwrite]` (or `python -m pixelproof_image.cli iterate ...`)
  Records one refinement iteration and evaluates progress (MAE and differing pixels deltas) relative to the previous iteration under `<out>/state/iterations.json`.
- **What is NOT BUILT YET:** Autonomous refinement loop, progress stall detector, regression stop decisions, and the unified `pixelproof run` command are NOT BUILT YET (Step 25 / Phase 3).

---

## 8. Step 08: Verify and Report

- **What the agent does:** Runs build and test commands, records check results under the four explicit states (`passed`, `failed`, `skipped`, `unavailable`), and builds comprehensive machine-readable and human-readable reports. Discloses any unverified pages, failed references, or skipped checks honestly.
- **Which command supports it today:**
  `python -m pixelproof_image.cli report --summary PATH --out DIR [--overwrite]`
  Compiles `report.json` and `report.md` matching §16 sections 1–10. Enforces the §15 honesty rule: marks `# OVERALL: INCOMPLETE` if any reference failed or any check is not passed.
- **What is NOT BUILT YET:** Automated PR creation, evidence artifact publishing, and unified end-to-end execution (`pixelproof run`) are NOT BUILT YET (Phase 2/4).
