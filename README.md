# PixelProof UI

> **Status: v0.1.0 (preview)** — Open-source deterministic visual verification toolkit and AI coding-agent skill for multi-page UI reconstruction.

[![npm version](https://img.shields.io/npm/v/pixelproof-ui.svg)](https://www.npmjs.com/package/pixelproof-ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**PixelProof** bridges the gap between screenshot designs and working frontend code. It equips AI coding agents (Google Antigravity, Claude Code, Cursor, OpenCode, Codex) with a deterministic, closed-loop visual feedback system to reconstruct pixel-accurate, multi-page websites and automatically verify their work.

---

## The Big Idea

When AI agents build user interfaces from screenshot images, they usually "guess" visual accuracy without ever looking at the running page. This results in subtle padding bugs, broken flexbox alignments, incorrect color shades, and displaced components.

**PixelProof changes that:**
1. **Captures Real Output**: Uses Playwright to render and photograph actual browser pages on localhost with exact viewport and scale parameters.
2. **Deterministic Mathematical Comparison**: Computes exact pixel deltas and Mean Absolute Error (MAE) without heuristic guesswork or hallucination.
3. **Region-Based Heatmaps & Priority Scoring**: Divides pages into grid regions and ranks visual defects by visual weight ($P = A \times S \times V$), telling the agent exactly *which* section (header, hero, card grid) needs fixing first.
4. **Iterative Refinement Loop**: Tracks improvements across iterations, catches visual regressions, and halts when differences are resolved or progress stalls.
5. **Separation of Evidence**: Maintains an uncompromised distinction between cold numerical measurements and subjective agent observations.

```text
┌─────────────────────┐       ┌──────────────────────┐       ┌─────────────────────┐
│  Screenshot Images  │ ───>  │  Playwright Browser  │ ───>  │ PixelProof Compare  │
│  (references.json)  │       │  (Localhost Capture) │       │ (MAE & Diff Matrix) │
└─────────────────────┘       └──────────────────────┘       └──────────┬──────────┘
                                                                        │
┌─────────────────────┐       ┌──────────────────────┐                  │
│ Reconstructed Code  │ <───  │ Agent Refinement     │ <────────────────┘
│ (Pixel-Accurate)    │       │ (Region-by-Region)   │   (Ranked Diff Artifacts)
└─────────────────────┘       └──────────────────────┘
```

---

## Installation

PixelProof is published on npm as [`pixelproof-ui`](https://www.npmjs.com/package/pixelproof-ui).

### 1. Install Globally (Recommended)

```bash
npm install -g pixelproof-ui
```

### 2. Verify Your Environment

PixelProof uses Node.js (>= 20) for orchestration and Python (>= 3.12) with Playwright for deterministic image comparison. Run the built-in diagnostic doctor:

```bash
pixelproof doctor
```

*(You can also run it instantly without global installation via `npx pixelproof-ui doctor`)*.

---

## Install Agent Skill across AI Assistants

PixelProof includes a one-command skill installer that configures workflow rules and activation instructions across all major AI coding platforms:

```bash
# Install skill for all supported agents
pixelproof install-skill

# Or target a specific assistant
pixelproof install-skill --agent antigravity   # Global ~/.gemini/config/skills/pixelproof/SKILL.md
pixelproof install-skill --agent claude        # Configures project CLAUDE.md
pixelproof install-skill --agent cursor        # Generates .cursor/rules/pixelproof.mdc
pixelproof install-skill --agent copilot       # Generates .github/copilot-instructions.md
pixelproof install-skill --agent opencode      # Generates AGENTS.md
pixelproof install-skill --agent codex         # Generates AGENTS.md
```

The installer is **idempotent**: re-running it verifies your configuration and reports `already_installed` without creating duplicate entries.

---

## The Mandatory 8-Step Reconstruction Workflow

When an AI agent is tasked with reconstructing a website from screenshots, it follows PixelProof's mandatory workflow:

1. **Register References (`pixelproof init` / `validate`)**: Index screenshot files and viewport dimensions into `references.json`.
2. **Inspect Project (`pixelproof inspect`)**: Detect framework (React, Next.js, Vue, plain HTML), build scripts, styling system, and Git status in read-only mode.
3. **Analyze Design**: Read reference screenshots and compile `design-spec.md` (spacing, typography, layout tokens).
4. **Implement Code**: Scaffold components and routes matching existing project conventions.
5. **Capture Browser (`pixelproof capture`)**: Launch headless Chromium via Playwright and take deterministic screenshots of all routes.
6. **Compare & Rank (`pixelproof compare`)**: Produce difference overlays, diff masks, and calculate region-by-region defect scores.
7. **Iterate & Refine (`pixelproof iterate` & `progress`)**: Apply targeted CSS/layout fixes starting with the highest-ranked component. Re-capture and verify progress deltas.
8. **Verify & Report (`pixelproof report`)**: Generate audit-ready Markdown and JSON evidence reports summarizing the visual delta.

---

## CLI Reference

All commands support `--help` for full argument details.

| Command | Purpose |
| :--- | :--- |
| `pixelproof init` | Scaffold starter `references.json`, folder structure, and config |
| `pixelproof doctor` | Inspect Node, Python, Pillow, NumPy, and Playwright Chromium readiness |
| `pixelproof install-skill` | Configure AI agent rules (Antigravity, Claude Code, Cursor, Copilot, OpenCode, Codex) |
| `pixelproof validate` | Validate `references.json` schema, viewports, and image readability |
| `pixelproof inspect` | Read-only inspection of target frontend stack, package manager, and routes |
| `pixelproof capture` | Deterministic Playwright multi-route screenshot capture |
| `pixelproof compare` | Compute MAE, differing pixel count, diff masks, and 4x4 region rankings |
| `pixelproof iterate` | Record iteration deltas (`improved`, `worse`, `same`) against previous runs |
| `pixelproof progress` | Evaluate stall detection, visual regressions, and iteration stop conditions |
| `pixelproof report` | Build final audit reports (`report.md` and `report.json`) |

---

## Included Examples & Test Fixtures

PixelProof includes ready-to-test applications in the `examples/` directory:

- **`examples/auracommerce/`**: Full-scale eCommerce admin dashboard built with Next.js (App Router), Tailwind CSS, Lucide icons, and Recharts. Demonstrates complex multi-page layout reconstruction.
- **`examples/real-app/`**: Minimal Vite + React application with multi-route references.
- **`examples/nextjs-app/`**: Minimal Next.js application with pinned dependencies and plain CSS.
- **`examples/vue-app/`**: Minimal Vite + Vue 3 application with route simulation.
- **`examples/plain-html/`**: Static HTML/CSS fixture (zero JS, system fonts) for baseline capture tests.

---

## Development & Testing

Run unit tests and end-to-end verification pipelines:

```bash
# Run Python visual comparison tests
.venv/bin/python -m pytest -q

# Run Node.js CLI & Playwright capture tests
npm test

# Run Phase 1 demo (CLI image comparison pipeline)
python scripts/demo_phase1.py

# Run Phase 2 demo (Full browser capture and compare)
node scripts/demo_phase2.mjs
```

---

## Documentation

Comprehensive guides are available in [`docs/`](docs/):

- [docs/workflow.md](docs/workflow.md): The full 8-step visual reconstruction protocol.
- [docs/visual-analysis.md](docs/visual-analysis.md): Mathematical formulas for MAE, region grids, and priority scoring ($P$).
- [docs/architecture.md](docs/architecture.md): Core separation of concerns and Python/TypeScript architecture.
- [docs/security.md](docs/security.md): Strict localhost-only network policy and path confinement rules.
- [docs/framework-detection.md](docs/framework-detection.md): Framework and build script heuristic rules.
- [docs/install.md](docs/install.md): In-depth manual installation guide.
- [docs/benchmarks.md](docs/benchmarks.md): Performance benchmarks and determinism measurements.
- [docs/troubleshooting.md](docs/troubleshooting.md): Common error codes and resolution steps.

---

## License

MIT © [ab-pro-dev](https://github.com/ab-pro-dev)
