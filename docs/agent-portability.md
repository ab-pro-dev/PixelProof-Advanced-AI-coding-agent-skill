# Agent Portability & Adapters

PixelProof is designed as a portable coding-agent skill and visual verification toolkit (§9).

## Portable Core Philosophy (§9.1, §9.2)

1. **Vendor-Neutral Instructions:**
   - The primary entry point is `SKILL.md`, written in standard Markdown without vendor-specific extensions.
   - Core workflow instructions explain what the agent does at each step, how to interpret comparison evidence, and when to stop.

2. **Standardized Tool Contracts:**
   - The CLI communicates via deterministic JSON outputs conforming to JSON Schema (2020-12) specifications in `schemas/`.
   - Tool outputs maintain a clean separation between objective measurements (MAE, differing pixels) and subjective interpretations (Decision Q1, §16).
   - Exit codes follow a standard convention (0: success/valid, 1: difference/invalid, 2: usage error).

3. **Generic Agent Adapters (§9.2):**
   - When integrating with different coding agents, adapters handle:
     - Skill discovery and registration paths.
     - Tool execution conventions (CLI invocation vs subprocess execution).
     - Accessing screenshot artifacts and report paths.
   - Adapters must never weaken safety checks, bypass path containment, or alter test assertions.

## Support Status

- **Tested Environment:** Validated under Node.js (>=20) and Python (>=3.12) with the `pixelproof` CLI and standard shell execution.
- **Other Agent Platforms:** Adapters for third-party agent frameworks and proprietary environments are UNTESTED (Phase 4 / spec §9.2).
