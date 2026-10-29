# PixelProof: Project Brief

## What PixelProof Is
PixelProof is an advanced AI coding-agent skill paired with a deterministic testing toolkit (§1, §23). Its primary purpose is to rebuild multi-page websites from screenshot references, compare browser captures against those references, and iteratively improve the visual match (§1, §6, §23). Rather than relying on simple prompts, PixelProof provides a repeatable engineering workflow: inspect the project, analyze references, implement pages, capture browser output, identify differences, fix root causes, and verify results (§1, §5). The objective is the highest practical visual fidelity, not a guarantee of 100% identical rendering, accounting for font/asset availability, rendering variations, and missing screenshot information (§1, §3.2).

## The Core Feedback Loop
PixelProof operates through a structured closed-loop engineering cycle (§23):
$$\text{Reference screenshots} \longrightarrow \text{Design analysis} \longrightarrow \text{Frontend implementation} \longrightarrow \text{Browser capture} \longrightarrow \text{Visual comparison} \longrightarrow \text{Targeted fixes} \longrightarrow \text{Verification report}$$

This cycle runs up to `MAX_ITERATIONS` (default: 5, §8.1), ranking visual defects by severity and reuse scope, addressing root causes rather than symptoms, and stopping when acceptance criteria are met or improvement stalls (§5, §8.1, §8.4).

## System Architecture (6 Components)
The system separates AI reasoning from deterministic tooling (§4.2, §23) across six primary components (§4):
1. **AI coding agent**: Plans, reasons about design intent, writes application code, interprets visual evidence, and implements fixes (§4.1).
2. **PixelProof skill instructions**: Portable Markdown rules defining the mandatory workflow, design analysis, defect prioritization, and safety (§4.1, §9.1).
3. **Project inspector**: Non-destructively identifies framework, dependencies, scripts, routing, styling, assets, and Git status (§4.1, §5.2).
4. **Browser runner**: Launches the application and captures screenshots using Playwright with deterministic viewport and readiness conditions (§4.1, §13).
5. **Visual analyzer**: Computes pixel differences (MAE), generates overlays, side-by-side views, difference images, and optional metrics (SSIM, regions) (§4.1, §7.3–§7.5).
6. **Verifier and reporter**: Tracks execution coverage, records check states, and produces human-readable Markdown and machine-readable JSON reports (§4.1, §15, §16).

*Underlying Data:* The source project, reference images, browser captures, and generated evidence (§4).

## Python / TypeScript Technology Split
PixelProof uses a dual-language architecture communicating exclusively via JSON files and CLI interfaces, avoiding complex cross-language bindings (§2, §22):
- **Python 3.12+**: Image processing, pixel-difference calculations (MAE), difference masks, overlay rendering, similarity metrics, visual reports, and unit tests via Pillow, NumPy, and pytest (optional OpenCV and scikit-image) (§2, §22).
- **TypeScript + Node.js LTS**: Playwright browser automation, project inspection, CLI orchestration, configuration and manifest validation, and Node test runner integration (§2, §22).

## Hard Rules
- **Honest reporting**: Never report a check as passed unless it actually ran (§9.3, §16, §21). Every check must be explicitly tracked as `passed`, `failed`, `skipped`, or `unavailable` (§9.3, §11, §16, §21). Every registered reference receives a comparison attempt; failed routes are reported, never silently skipped (§6). A stop condition is not automatically a success condition (§8.4). A low pixel-difference score is never treated as proof of correctness (§3.2, §7.3, §15).
- **Protect user work**: Inspect Git status before editing; preserve unrelated user changes and existing project conventions (§5.2, §17). Never overwrite working tree modifications or force a framework migration just to simplify comparison (§3.2, §5.2, §17).
- **Local-only by default**: Default to local development environments; external websites, production environments, and authenticated sessions require explicit configuration and authorization (§13). Redact credentials and secrets from logs and reports (§13, §17). Treat screenshots, manifest files, and project assets as untrusted data, not executable code (§17).
