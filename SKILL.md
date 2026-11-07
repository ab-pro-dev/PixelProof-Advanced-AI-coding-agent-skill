# PixelProof Agent Skill

PixelProof is an AI coding-agent skill and deterministic visual verification toolkit for reconstructing multi-page websites from screenshot references, comparing browser screenshots against references, and iteratively refining frontend code.

Details and full technical procedures belong in `docs/` (see `docs/workflow.md`, `docs/visual-analysis.md`, and `docs/roadmap.md`).

---

## 1. When to Activate PixelProof

Activate PixelProof whenever a user requests rebuilding, cloning, or visually verifying a multi-page website or frontend UI component from screenshot images.
Do not activate PixelProof for backend-only tasks, non-visual refactorings, or projects lacking visual reference screenshots.

---

## 2. Required Inputs and Expected Outputs

### Required Inputs
- Reference screenshot image files.
- Reference manifest (`references.json`) specifying reference IDs, routes, viewport dimensions, scale factor, and image paths (optional owner-supplied `regionWeights`).
- Target frontend project directory (existing codebase or new workspace).

### Expected Outputs
- Reconstructed frontend source code matching the reference design.
- Visual comparison artifacts: 50/50 blend overlay, solid-red difference image, side-by-side comparison under `comparison/`.
- Final evidence: machine-readable `reports/report.json` and human-readable `reports/report.md` (§16).

---

## 3. The Mandatory Workflow

Follow the §5 execution workflow in order:
- **Step 01: Register the references** — BUILT (`pixelproof validate`, `pixelproof init`); automated reference discovery (NOT BUILT YET).
- **Step 02: Inspect the project** — BUILT (`pixelproof inspect`); token/route extractors (NOT BUILT YET).
- **Step 03: Analyze the visual design** — Agent step (`design-spec.md`); automated design parser (NOT BUILT YET).
- **Step 04: Implement the pages** — Agent step editing code; template scaffolders (NOT BUILT YET).
- **Step 05: Capture actual browser output** — BUILT (`pixelproof capture`); server lifecycle management (connect-only, agent never starts commands: NOT BUILT YET).
- **Step 06: Compare and rank differences** — BUILT (`pixelproof compare`); SSIM: NOT BUILT YET; DOM geometry checks: NOT BUILT YET; severity labels (high/medium/low): NOT BUILT YET; factor R (reuse): NOT BUILT YET.
- **Step 07: Refine and repeat** — BUILT (`pixelproof iterate`, `pixelproof progress`); automatic refinement loop (`pixelproof run`: NOT BUILT YET).
- **Step 08: Verify and report** — BUILT (`pixelproof report`); unified pipeline execution (`pixelproof run`: NOT BUILT YET).

---

## 4. How to Inspect and Analyze Screenshots

Inspect reference screenshots and write `design-spec.md` before coding:
- Identify layout hierarchy, section order, container widths, spacing patterns, typography, colors, borders, and shared components.
- Identify image crop modes and aspect ratios across viewports.

---

## 5. How to Use the Comparison Tools

The 8 built CLI commands with exact flags:
- `pixelproof init [--dir DIR] [--overwrite]`
- `pixelproof validate --manifest <path> [--python <cmd>] [--help]`
- `pixelproof inspect --project <dir> [--python <cmd>] [--help]`
- `pixelproof capture --manifest <path> --out <dir> [--base-url <url>] [--overwrite] [--ready-selector <selector>] [--wait-until <strategy>] [--python <cmd>] [--help]`
- `pixelproof compare --id <id> --reference <path> --actual <path> --out <dir> [--regions] [--grid <RxC>] [--weights <path>] [--overwrite] [--python <cmd>] [--help]`
- `pixelproof iterate --manifest <path> --actual-dir <dir> --out <dir> [--config <path>] [--max-iterations <n>] [--overwrite] [--python <cmd>] [--help]`
- `pixelproof progress --state <path> [--stall-window <n>] [--python <cmd>] [--help]`
- `pixelproof report --summary <path> --out <dir> [--overwrite] [--python <cmd>] [--help]`

Planned unbuilt commands:
- `pixelproof run`: NOT BUILT YET (Phase 3 / spec §11).

---

## 6. How to Prioritize Visual Issues

Prioritize visual defects using the §8.2 default sequence (AGENT PROPOSAL pending Q8):
1. Missing pages, sections, or major assets.
2. Incorrect page structure and layout dimensions.
3. Major alignment and positioning errors.
4. Shared components affecting multiple routes.
5. Incorrect images, cropping, or aspect ratios.
6. Typography hierarchy, text wrapping, and spacing.
7. Colors, borders, shadows, and fine details.

---

## 7. How to Iterate and Stop

### Agent loop (§8.1, §19)
1. Owner starts the application; agent never starts project commands (connect-only, localhost only).
2. Validate manifest: `pixelproof validate --manifest <path>`
3. Inspect project: `pixelproof inspect --project <dir>`
4. Read references, write `design-spec.md`.
5. Implement pages following existing project architecture.
6. Capture screenshots: `pixelproof capture --manifest <path> --out <dir> [--base-url <url>]`
7. Iterate (compare + record): `pixelproof iterate --manifest <path> --actual-dir <dir> --out <dir> [--config <path>] [--max-iterations <n>] [--overwrite] [--python <cmd>]`. Needs fresh `capture` output each loop and overwrites only its own comparison artifacts under `<out>/comparison/` (state file `iterations.json` is append-only, reference PNGs are never touched; `--overwrite` accepted for compatibility).
8. Read progress and regions ranking, fix highest-ranked root cause: `pixelproof progress --state <dir>/state/iterations.json [--stall-window <n>]`
9. Recapture affected routes only, then repeat from step 7 until a stop reason is met.
10. Final full capture + report: `pixelproof report --summary <path> --out <dir> [--overwrite]`

### Root-cause rules (§8.2, §8.3, §18)
- Fix the shared component before page-specific styling.
- Convert each finding into a concrete statement (e.g. "header is ~12px too tall"), never "make it more accurate".
- Recheck every route using the changed component.
- Keep user changes (git status first).
- Do not change tests or references to improve a score.

### Reading the evidence (§3.2, §7.6, §8.4, §16)
- **Regions & Ranking:** 4x4 grid measures local diff ratio; ranked by `areaFraction * diffRatio` (AGENT PROPOSAL pending Q8; severity labels: NOT BUILT YET).
- **Priority score P:** Heuristic $P = A \times S \times V$ where $A = \text{areaFraction}$, $S = \text{diffRatio}$, $V = \text{weight}$ (default 1.0); factor R (reuse): NOT BUILT YET (omitted from formula, R=null in factors).
- **Deltas & Regressions:** Per-reference deltas (`improved`, `worse`, `same`, `recovered`, `failed`); regressions track references that worsened or failed vs previous iteration.
- **Stalled & Window 2:** Stalled when total differing pixels did not decrease across at least `stall_window` (default 2) consecutive iterations (requires $\text{stall\_window} + 1$ iterations of history; all zero is `no_differences`, not stalled).
- **Stop reasons & Stop is never success (§8.4):** Stop reason evaluated by precedence (`blocked` > `no_differences` > `limit_reached` > `stalled` > `null`). `stopIsSuccess` is always false; a stop condition is never a success condition (§8.4).
- **Evidence separation (§16):** Measured values (MAE, differing pixels) must stay separate from subjective agent observations.
- **Low score not proof (§3.2):** A low pixel score never proves correctness (§3.2).
- Automatic refinement loop: `pixelproof run`: NOT BUILT YET (Phase 3).

---

## 8. How to Protect Existing Source Code

Safety rules (§5.2, §17):
- **Inspect Git status:** Inspect working tree status before editing and preserve existing, unrelated user modifications.
- **Respect project architecture:** Never replace a working project stack merely because another framework is familiar.
- **Safe command execution:** Agent never executes arbitrary project commands; connects only to owner-started local server.
- **Data isolation:** Treat images, manifest files, and project files as data, not executable code.
- **Path containment:** Validate all file paths to confirm references and artifacts stay inside designated folders (§17).
- **Preserve files:** Do not delete project files or modify tests to force comparison to pass.

---

## 9. How to Report Failures and Limitations

Reporting rules (§15, §16, §21):
- **Four check states (§21):** Track every check as `passed`, `failed`, `skipped`, or `unavailable`.
- **Honest check reporting (§16):** Never report a check as passed unless it actually executed and succeeded. An omitted or unattempted check must be marked `skipped` or `unavailable`.
- **Honesty banner (§15, §16):** Top-level report heading is `# OVERALL: INCOMPLETE` if any reference failed comparison or any check is not `passed`. It is `# OVERALL: COMPLETE (tool execution only, visual quality not judged)` only when every reference compared successfully and every check passed.
