# Changelog

All notable changes to PixelProof are documented in this file.

## v0.1.0 (preview)

Initial preview release of PixelProof: portable AI coding-agent skill and deterministic visual verification toolkit.

### What is Built

The CLI provides 9 commands (`pixelproof <command>`):
- `init`: Create starter reference manifest, folder, and configuration (`references.json`, `references/.gitkeep`, `pixelproof.config.json`).
- `validate`: Validate reference manifest JSON schema, relative paths, viewport bounds, and deviceScaleFactor.
- `inspect`: Inspect target frontend project directory in read-only mode (package manager, framework, scripts, styling, assets, git status).
- `capture`: Deterministically capture full-page and viewport screenshots for all registered manifest routes via Playwright (localhost-only).
- `compare`: Compare reference and actual images, compute Mean Absolute Error (MAE), count differing pixels, generate visual artifacts (overlay, diff, side-by-side), and calculate 4×4 regional grid metrics with priority ranking.
- `report`: Build and write final report files (`report.json` and `report.md`) enforcing honest completion criteria (OVERALL: COMPLETE or INCOMPLETE).
- `iterate`: Record refinement iterations, evaluate deltas vs previous iteration, and regenerate comparison artifacts under `<out>/comparison/`.
- `progress`: Evaluate iteration progress, regressions, stall detection, and stop reasons from state file.
- `doctor`: Check runtime environment, dependencies, Node.js, Python, and browser capabilities.

### Frameworks Tested

End-to-end benchmarked and verified across four frontend environments:
- **Vite + React** (`examples/real-app`): 2 routes (`/`, `/dashboard`), 1280×720, DSF 1.
- **Plain HTML/CSS/JS** (`examples/plain-html`): 2 routes (`/`, `/about`), 1280×720, DSF 1.
- **Next.js** (`examples/nextjs-app`): App router, 2 routes (`/`, `/about`), 1280×720, DSF 1.
- **Vite + Vue** (`examples/vue-app`): In-component path routing without router library, 2 routes (`/`, `/about`), 1280×720, DSF 1.

### Left Out by Decision

Per owner-delegated decisions (Appendix A, `docs/decisions.md`):
- **Perceptual SSIM**: Left out to prioritize deterministic numeric MAE and pixel-level diffing.
- **DOM Geometry Checks**: Left out in favor of non-intrusive screenshot-based visual comparison.
- **Factor R (Effort/Risk)**: Priority scoring uses $P = A \times S \times V$ without heuristic risk factor R.
- **Autonomous `run` Loop**: Left out to keep human and agent in control; iterative refinement is agent-driven via `iterate` and `progress`.

### Known Limits

- **Agent Portability**: Other coding agents remain UNTESTED (tested exclusively with Google Antigravity).
- **Platform Support**: Tested only on Linux; macOS and Windows are not yet verified in CI.
- **API & Schema Stability**: Schemas, CLI flags, and report shapes are proposals and may change before v1.0.
