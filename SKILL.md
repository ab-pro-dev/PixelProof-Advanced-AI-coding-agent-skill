# PixelProof Agent Skill

PixelProof is an AI coding-agent skill and deterministic visual verification toolkit for reconstructing multi-page websites from screenshot references, comparing browser screenshots against references, and iteratively refining frontend code.

Details and full technical procedures belong in `docs/` (see `docs/workflow.md` and `docs/roadmap.md`).

---

## 1. When to Activate PixelProof

Activate PixelProof whenever a user requests rebuilding, cloning, or visually verifying a multi-page website or frontend UI component from screenshot images.

Do not activate PixelProof for backend-only tasks, non-visual refactorings, or projects lacking visual reference screenshots.

---

## 2. Required Inputs and Expected Outputs

### Required Inputs
- Reference screenshot image files.
- Reference manifest (`references.json`) specifying reference IDs, routes, viewport dimensions, scale factor, and image paths.
- Target frontend project directory (existing codebase or new workspace).

### Expected Outputs
- Reconstructed frontend source code matching the reference design.
- Visual comparison artifacts: 50/50 blend overlay, solid-red difference image, and side-by-side comparison image under `comparison/`.
- Final evidence: machine-readable `reports/report.json` and human-readable `reports/report.md` (§16).

---

## 3. The Mandatory 8-Step Workflow

Follow the §5 execution workflow in order. Each step is marked with its current implementation status:

- **Step 01: Register the references** — BUILT in Phase 1 (manifest validation CLI); automated registration (`pixelproof init`) is NOT BUILT YET (Phase 2).
- **Step 02: Inspect the project** — BUILT in Phase 1 (read-only project inspection CLI); token and route extraction are NOT BUILT YET (Phase 2).
- **Step 03: Analyze the visual design** — Manual agent step (`design-spec.md`); automated design parser is NOT BUILT YET (Phase 3).
- **Step 04: Implement the pages** — Manual agent step editing code; template scaffolders are NOT BUILT YET (Phase 4).
- **Step 05: Browser screenshot capture** — NOT BUILT YET (Phase 2 Playwright browser capture and dev server management).
- **Step 06: Compare and rank differences** — BUILT in Phase 1 (`compare` CLI for MAE, diff counts, artifacts); SSIM, DOM geometry, and automated ranking are NOT BUILT YET (Phase 3).
- **Step 07: Refine and repeat** — Manual agent iteration loop; autonomous multi-iteration loop controller (`pixelproof run`) is NOT BUILT YET (Phase 3).
- **Step 08: Verify and report** — BUILT in Phase 1 (`report` CLI for JSON/MD generation and §15 honesty banner); single-command pipeline (`pixelproof run`) is NOT BUILT YET (Phase 2/4).

---

## 4. How to Use the Comparison Tools

Phase 1 tools are invoked via the Python CLI (`pixelproof_image.cli`). The exact commands and flags are:

- `python -m pixelproof_image.cli validate --manifest PATH [--help]`
  Validates manifest version 1, route format, viewport width/height, deviceScaleFactor, and image readability.
- `python -m pixelproof_image.cli inspect --project DIR [--help]`
  Inspects package manager, framework, scripts, styling, assets, and Git status in read-only mode without modifying files.
- `python -m pixelproof_image.cli compare --id ID --reference PATH --actual PATH --out DIR [--overwrite] [--help]`
  Computes exact Mean Absolute Error (MAE), counts differing pixels, and generates overlay, diff, and side-by-side images under `comparison/`.
- `python -m pixelproof_image.cli report --summary PATH --out DIR [--overwrite] [--help]`
  Generates machine-readable `reports/report.json` and human-readable `reports/report.md` covering all 10 specification sections.

Unbuilt CLI tools planned for future phases:
- Project setup (`pixelproof init`) — NOT BUILT YET (Phase 2).
- Browser screenshot capture (`pixelproof capture`) — NOT BUILT YET (Phase 2).
- Automated multi-step execution (`pixelproof run`) — NOT BUILT YET (Phase 2/3).

---

## 5. How to Prioritize Visual Issues

Prioritize visual defects using the §8.2 default sequence (Status: not automated yet — AGENT PROPOSAL based on §8.2):

1. Missing pages, sections, or major assets.
2. Incorrect page structure and layout dimensions.
3. Major alignment and positioning errors.
4. Shared components affecting multiple routes.
5. Incorrect images, cropping, or aspect ratios.
6. Typography hierarchy, text wrapping, and spacing.
7. Colors, borders, shadows, and fine details.

Automated mathematical priority scoring ($P = A \times S \times V \times R$) is NOT BUILT YET (Phase 3).

---

## 6. How to Iterate and Stop

Refinement principles (§8.1 & §8.4):
- **Root causes over symptoms:** Make the smallest effective code changes. Avoid unproductive iterations that adjust CSS values without understanding layout structure.
- **Regression checks:** After modifying shared components, re-evaluate all affected routes.
- **Stopping criteria (§8.4):** Stop when the configured iteration limit is reached (default `MAX_ITERATIONS = 5`), all references have been evaluated, no high-priority defects remain under configured policy, progress stalls, or an impassable blocker occurs.
- **Honesty rule (§8.4):** "A stop condition is not a success condition." If an execution halts while visual discrepancies or unverified checks remain, the final report must state this plainly.

---

## 7. How to Protect Existing Source Code

Safety rules (§5.2, §17):
- **Inspect Git status:** Inspect working tree status before editing and preserve existing, unrelated user modifications.
- **Respect project architecture:** Never replace a working project stack (e.g. Next.js with Vite) merely because another framework is familiar.
- **Safe command execution:** Use documented project scripts; never execute arbitrary untrusted shell code.
- **Data isolation:** Treat images, manifest files, and project files as data, not executable code.
- **Path containment:** Validate all file paths to confirm references and artifacts stay inside their designated folders (§17).
- **Preserve files:** Do not delete or wipe project files to force visual comparison tests to pass.

---

## 8. How to Report Failures and Limitations

Reporting rules (§15, §16, §21):
- **Four check states (§21):** Track every check as `passed`, `failed`, `skipped`, or `unavailable`.
- **Honest check reporting (§16):** Never report a check as passed unless it actually executed and succeeded. An omitted or unattempted check must be marked `skipped` or `unavailable`.
- **Honesty banner (§15, §16):** The top-level report heading is `# OVERALL: INCOMPLETE` (listing explicit reasons) if any reference failed comparison or any check is not `passed`. It is `# OVERALL: COMPLETE (tool execution only, visual quality not judged)` only when every reference compared successfully and every check passed. Tool execution success does not equal visual perfection.
- **Evidence separation (§16):** Keep measured metrics (MAE, pixel counts, dimensions) strictly separated from subjective agent observations.

---

## 9. Phase 1 Architectural Decisions

- **Python CLI for Phase 1 (AGENT PROPOSAL, pending Q2):** Phase 1 comparison tools are implemented in Python under `pixelproof_image/` before the TypeScript CLI is built.
- **Manifest relative paths (Option C, agreed with owner, pending Q3):** Reference manifest image paths are resolved relative to the folder containing the manifest file.
- **Allowed captureType (AGENT PROPOSAL, pending Q4):** Only `"viewport"` is accepted in Phase 1; region and full-page capture modes are NOT BUILT YET (Phase 2/3).
