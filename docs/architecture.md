# PixelProof Architecture

PixelProof structures visual reconstruction into six modular components (§4) with strict separation of responsibilities between deterministic tools and agent reasoning.

## Six Core Components (§4)

| Component | Responsibility |
| --- | --- |
| **AI Coding Agent** | Understands visual intent, reasons about differences, fixes code. |
| **Skill Instructions** | Portable markdown (`SKILL.md`) defining workflow, rules, and safety. |
| **Project Inspector** | Read-only detection of framework, package manager, scripts, and git. |
| **Browser Runner** | Playwright capture for viewport screenshots under deterministic settings. |
| **Visual Analyzer** | Numerical pixel metrics (MAE), difference masks, blend overlays, regions. |
| **Verifier & Reporter** | Verifies coverage, tracks iteration state, generates JSON/MD reports. |

## The Separation Rule (§4.2)

PixelProof enforces that deterministic tools perform predictable operations, while the coding agent makes context-dependent decisions (§4.2). The tools never judge visual aesthetic quality or declare subjective success; they supply objective numerical evidence (Decision Q1, §15, §16).

Unified autonomous execution (`pixelproof run`) is NOT BUILT YET (Phase 3 / spec §11).

## Python / TypeScript Architectural Split (Decision Q2)

Per owner-delegated Decision Q2 and spec §10, §19:
- **Python Visual Engine (`pixelproof_image`):** Computes exact Mean Absolute Error (MAE via NumPy), difference masks (Pillow), 4x4 region grids, and iteration history deltas (`iterations.json`).
- **TypeScript Public CLI (`pixelproof`):** Acts as the primary developer-facing CLI wrapper (`src/cli/`). It drives Playwright browser automation (`src/browser/`), project initialization (`pixelproof init`), environment diagnostics (`pixelproof doctor`), and delegates visual computations to Python via `execFile` with byte-identical stdout passthrough.
