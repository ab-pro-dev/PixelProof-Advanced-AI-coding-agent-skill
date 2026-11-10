# PixelProof: Development Roadmap

This document outlines the four development phases for PixelProof, the Phase 1 task breakdown, and the open architectural questions identified in the project documentation.

---

## 1. Four-Phase Development Roadmap

Copied faithfully from §19 of the project documentation:

### Phase 1: Foundation
- **Goal:** Build the portable skill and core toolkit.
- **Deliverables:**
  - Create the repository and project configuration.
  - Write `SKILL.md` and the core workflow documentation.
  - Implement manifest validation.
  - Inspect frontend projects without modifying them.
  - Build the basic Python image-comparison functions.
  - Generate overlays, diff images, and basic reports.
  - Add unit tests and a small sample project.
- **Completion condition:** PixelProof can validate references, inspect a sample project, compare two images, and produce a valid report.

### Phase 2: Automation
- **Goal:** Build browser capture and multi-page support.
- **Deliverables:**
  - Integrate Playwright.
  - Implement route and viewport configuration.
  - Add deterministic capture settings.
  - Capture multiple routes and device sizes.
  - Add capture validation and failure handling.
  - Create the TypeScript CLI and JSON schemas.
  - Produce comparison artifacts for each reference.
  - Demo: scripts/demo_phase2.mjs (AGENT PROPOSAL)
- **Completion condition:** PixelProof can capture and compare multiple routes of a real frontend project automatically.

### Phase 3: Intelligence
- **Goal:** Build iterative refinement and advanced analysis.
- **Deliverables:**
  - Add region-based comparison.
  - Regions: scripts proposal, grid 4x4, measurements only (AGENT PROPOSAL pending Q8)
  - Ranking: areaFraction x diffRatio, measured only, no severity (AGENT PROPOSAL pending Q8)
  - Weights V: owner-supplied only, default 1.0, applied as weightedScore = score x weight (AGENT PROPOSAL pending Q8)
  - Priority score P = A x S x V (R not built), AGENT PROPOSAL pending Q8
  - Iteration state + deltas, agent-driven (AGENT PROPOSAL pending Q1/Q8)
  - Stall/regression/stop reasons (AGENT PROPOSAL pending Q1/Q8)
  - Agent loop instructions (Step 26)
  - Add optional SSIM and geometry checks.
  - Rank issues by visual importance and reuse.
  - Implement the refinement loop and iteration limits.
  - Track improvements between iterations.
  - Detect stalled progress and regressions.
  - Improve the agent's instructions for root-cause fixes.
  - AGENT PROPOSAL: reports should state plainly when references compared but still differ (tool success is not visual quality, §15)
- **Completion condition:** The agent can use comparison evidence to improve an implementation across repeated iterations and accurately report remaining problems.

### Phase 4: Production
- **Goal:** Make PixelProof portable, safe, and release-ready.
- **Deliverables:**
  - Phase 4: doctor + install guide + release checklist (AGENT PROPOSAL)
  - Phase 4: error.hint on all failures (AGENT PROPOSAL)
  - Phase 4: project init command (built) (spec §11)
  - Phase 4: architecture, security, troubleshooting, framework, and portability docs (spec §4, §13, §17, §9)
  - Phase 4: benchmark execution and determinism report (spec §18)
  - Phase 4: iterate comparison artifact auto-regeneration (spec §8, §11)
  - Phase 4: pytest venv shadowing warning in install guide (AGENT PROPOSAL)
  - Phase 4: report differing references note and summary fields (spec §15, §16)
  - Phase 4: real-app Vite benchmark execution and determinism table (spec §18)
  - Phase 4: nextjs-app benchmark execution and framework detection (spec §18, §10)
  - Phase 4: vue-app benchmark execution and framework detection (spec §18, §10)
  - Phase 4: v0.1.0 preview release packaging and changelog (spec §19)
  - Add agent adapters and installation instructions.
  - Add robust error handling and diagnostic output.
  - Complete unit, integration, regression, and end-to-end tests.
  - Test with different frontend frameworks.
  - Improve security, performance, and reproducibility.
  - Write the release documentation and usage examples.
  - Benchmark the workflow on several multi-page sites.
- **Completion condition:** The toolkit passes its acceptance tests and can be installed and used by supported coding agents without requiring a specific frontend framework.

### Phase Dependency Rule (§19)
Do not begin by trying to build the most intelligent visual agent possible. First make screenshot capture and image comparison reliable. Otherwise, the agent will be making implementation decisions using unreliable evidence.

---

## 2. Phase 1 Task Breakdown (PROPOSED, pending Q2 - AGENT PROPOSAL)

Numbered sequential tasks following the development order in §20 (1. Define inputs/outputs → 2. Implement smallest working version → 3. Write tests → 4. Integrate → 5. Test integrated workflow → 6. Update documentation → 7. Acceptance criteria verification):

1. [x] **Repository scaffolding and environment configuration (§19)**
   *Status: Already done: the scaffold in the first commit.*
   - Git repository initialized, `.gitignore`, `pyproject.toml`, `package.json`, `tsconfig.json`, Python `.venv`, locked exact dependencies (`requirements.lock.txt`, `package-lock.json`), directory structure with `.gitkeep` files, and trivial smoke tests for Python and Node.
2. [ ] **Core visual comparison engine (Python) – Step 1: Define inputs and outputs (AGENT PROPOSAL)**
   - Define input requirements (reference image path, rendered image path) and output contracts (dimension validation, pixel difference / MAE score, diff image, overlay image) per §7.2, §7.3, §7.4.
3. [ ] **Core visual comparison engine (Python) – Step 2: Implement smallest working version (AGENT PROPOSAL)**
   - Implement `pixelproof_image/compare.py`, `pixelproof_image/overlay.py`, and `pixelproof_image/metrics.py` (validate image readability/dimensions, compute MAE via NumPy, generate overlay and diff images via Pillow) per §7.2, §7.3, §7.4, §10.
4. [ ] **Core visual comparison engine (Python) – Step 3: Write unit tests for normal cases and failures (AGENT PROPOSAL)**
   - Create tests in `tests/test_compare.py` and `tests/test_metrics.py` using synthetic test fixtures per §14.1, §14.3 (identical images with 0 difference, minor shifts, color differences, dimension mismatches, missing/corrupt files).
5. [ ] **Reference manifest validation – Step 1: Define inputs and outputs (AGENT PROPOSAL)**
   - Define manifest input schema for `references.json` per §6 (unique ID, image path, route, viewport dimensions, deviceScaleFactor, captureType) and validation error outputs per §6, §14.1.
6. [ ] **Reference manifest validation – Step 2: Implement smallest working version (AGENT PROPOSAL)**
   - Implement validation module (`scripts/validate-manifest.ts` or `src/core/reference-manifest.ts` per §10) checking required fields, dimensions, relative image paths, and ID uniqueness per §6.
7. [ ] **Reference manifest validation – Step 3: Write tests for normal cases and failures (AGENT PROPOSAL)**
   - Create tests in `tests/test_manifest.ts` covering valid manifests, missing required fields, non-existent image paths, duplicate IDs, and invalid viewports per §14.1.
8. [ ] **Project inspection module – Step 1: Define inputs and outputs (AGENT PROPOSAL)**
   - Define inspection inputs (target project directory path) and structured output (detected package manager, framework, start/build scripts, routes, styling system, assets, Git status) per §5.2.
9. [ ] **Project inspection module – Step 2: Implement smallest working version (AGENT PROPOSAL)**
   - Implement non-destructive inspection (`src/core/project-inspector.ts` per §10) identifying framework clues, package scripts, and running working-tree `git status` check without modifying files per §5.2, §17.
10. [ ] **Project inspection module – Step 3: Write tests for normal cases and failures (AGENT PROPOSAL)**
    - Create inspection tests against sample project structures, verifying correct framework detection and safe handling of unknown configurations per §5.2, §14.1.
11. [ ] **Basic reporting – Step 1 & 2: Define and implement basic report generation (AGENT PROPOSAL)**
    - Implement report generation producing structured JSON and Markdown containing reference ID, status, sizes, MAE metric, artifact paths, and explicit check states (`passed`, `failed`, `skipped`, `unavailable`) per §7.7, §11, §16.
12. [ ] **Integration – Step 4: Integrate modules into core workflow (AGENT PROPOSAL)**
    - Connect manifest validation, project inspection, image comparison, and report generation into a unified Phase 1 execution flow per §19, §20.
13. [ ] **Integration – Step 5: Test integrated workflow on a small sample project (AGENT PROPOSAL)**
    - Create a minimal sample project fixture (`examples/`), run the integrated flow to inspect the project, validate references, compare two images, and produce output reports per §14.2, §19.
14. [ ] **Documentation – Step 6: Write `SKILL.md` and core workflow documentation (AGENT PROPOSAL)**
    - Write the portable agent entry point `SKILL.md` (§9.1) and foundational workflow documentation in `docs/` per §10, §19.
15. [ ] **Phase 1 Verification – Step 7: Verify completion condition (AGENT PROPOSAL)**
    - Confirm all Phase 1 completion criteria pass (§19): "PixelProof can validate references, inspect a sample project, compare two images, and produce a valid report."

---

## 3. Open Questions (Q1 to Q9)

The following ambiguities were flagged in Appendix A of the project documentation. They are not resolved here; assumptions reflect only what the documentation explicitly states:

| ID | Section(s) | Question | Assumption until the owner decides |
| --- | --- | --- | --- |
| Q1 | §8.4, §8.1 | Stopping criteria say "one or more" conditions apply, and one is "All required screenshots have been captured and compared." Alone, that would allow stopping after the first comparison with unresolved issues, whereas §8.1 stops only when required checks pass and no important issues remain. How should the stop conditions combine, and what is the "configured acceptance policy"? | DECIDED (owner-delegated, Step 29): A stop condition only reports a reason (blocked, no_differences, limit_reached, stalled) and is never success. Acceptance policy: the owner reviews the report; the tool never declares success. |
| Q2 | §10, §19 | Which files in the §10 tree belong to Phase 1? Phase 1 includes manifest validation, project inspection, and a valid report, but the TypeScript CLI and JSON schemas are listed under Phase 2. How are Phase 1 tools invoked before the CLI exists? | DECIDED (owner-delegated, Step 29): Python CLI is the engine; the TypeScript CLI is the public entry point wrapping it. |
| Q3 | §6, §10 | Manifest image paths are relative. Relative to what? Do user references, the manifest, and generated output live in the PixelProof repository or in the target frontend project? What is `output/baseline/` for, compared with `final/` and `comparison/`? | DECIDED (owner-delegated, Step 29): Manifest image paths are relative to the manifest folder. References, manifest and output live in the target project. output/baseline/ is reserved and unused. |
| Q4 | §2, §6, §10 | Zod and JSON Schema are both listed for validation; what is the relationship between them? What are the allowed `captureType` values (only `viewport` is shown; §5.1 mentions a region or full-page capture type)? | DECIDED (owner-delegated, Step 29): JSON Schema is the contract; the Python validator is the source of truth; Zod is not used. captureType is "viewport" only (fullPage and region are NOT BUILT). |
| Q5 | §7.7, §11, §21 | The source requires distinguishing passed, failed, skipped, unavailable, and successful checks, but the report example shows only `"status": "compared"`. What is the full status vocabulary? | DECIDED (owner-delegated, Step 29): Comparison status: compared|failed. Capture status: captured|failed. Check states: passed|failed|skipped|unavailable. |
| Q6 | §15 | The source rendering showed "4 of 8 checked" without saying which items. Which, if any, are already complete? (All are shown unchecked here.) | DECIDED (owner-delegated, Step 29): No checklist item is ticked until the final acceptance run (Step 38). |
| Q7 | §2, §22, §23 | Items are phrased as personal recommendations ("I recommend", "My recommendation") while §22 is titled "Final recommended technology choices". Should these be treated as final decisions? | DECIDED (owner-delegated, Step 29): The technology choices in spec section 22 are final. |
| Q8 | §7.6, §8.1, §8.4, §12 | Several parameters are undefined: the severity scale (for example what "high" means), factors S, V, and R in the priority score, and what counts as "improvement stalls" or "negligible improvement". The source says to define and calibrate these during implementation. | DECIDED (owner-delegated, Step 29): S = region diffRatio; V = owner-supplied weights (default 1.0); R NOT BUILT; stall window 2; MAX_ITERATIONS default 5; no severity labels or thresholds. |
| Q9 | §11 | What does `pixelproof run` execute itself, and what does it delegate to the agent ("with agent guidance")? | DECIDED (owner-delegated, Step 29): `run` stays NOT BUILT. If built later it only orchestrates tool steps and never edits application code. |
- Config loading and schema-equivalent validation implemented: maxIterations and browser waitUntil/timeoutMs defaults with CLI overrides; other config settings NOT BUILT YET.
- Project initialization (`pixelproof init`) built: safe starter files, overwrite protection, and missing-reference guidance.
