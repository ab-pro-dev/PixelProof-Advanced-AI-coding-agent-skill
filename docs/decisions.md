# Architectural Decisions (Q1 to Q9)

This document records the owner-delegated decisions resolving the open architectural questions identified in Appendix A of the project documentation.

---

## Q1: Stopping Criteria and Acceptance Policy

- **Question:** How should stop conditions combine, and what is the configured acceptance policy?
- **Decision:** DECIDED (owner-delegated, Step 29): A stop condition only reports a reason (blocked, no_differences, limit_reached, stalled) and is never success. Acceptance policy: the owner reviews the report; the tool never declares success.
- **Spec Section:** §8.1, §8.4, Appendix A (Q1)
- **Status & Implementation:** Existing behavior. Implemented in `pixelproof_image/iteration.py` (`evaluate_progress`), `pixelproof_image/cli.py` (`progress`), and `src/cli/index.ts` (`pixelproof progress`). `stopIsSuccess` is hard-coded to `false`.

---

## Q2: Engine and Public CLI Boundary

- **Question:** Which files belong to Phase 1, and how are tools invoked before the CLI exists?
- **Decision:** DECIDED (owner-delegated, Step 29): Python CLI is the engine; the TypeScript CLI is the public entry point wrapping it.
- **Spec Section:** §10, §19, Appendix A (Q2)
- **Status & Implementation:** Existing behavior. Implemented in `pixelproof_image/cli.py` (engine) and `src/cli/index.ts` (public entry point wrapping the Python engine).

---

## Q3: Path Resolution, File Locations, and Baseline Directory

- **Question:** Relative to what are manifest image paths resolved, where do files live, and what is `output/baseline/` for?
- **Decision:** DECIDED (owner-delegated, Step 29): Manifest image paths are relative to the manifest folder. References, manifest and output live in the target project. output/baseline/ is reserved and unused.
- **Spec Section:** §6, §10, Appendix A (Q3)
- **Status & Implementation:** Existing behavior. Implemented in `pixelproof_image/manifest.py` and `src/core/manifest.ts`. `output/baseline/` is reserved and unused.

---

## Q4: Validation Schema Contracts and Capture Types

- **Question:** What is the relationship between Zod and JSON Schema, and what are the allowed `captureType` values?
- **Decision:** DECIDED (owner-delegated, Step 29): JSON Schema is the contract; the Python validator is the source of truth; Zod is not used. captureType is "viewport" only (fullPage and region are NOT BUILT).
- **Spec Section:** §2, §5.1, §6, §10, Appendix A (Q4)
- **Status & Implementation:** Existing behavior. Implemented in `schemas/references.schema.json` and `pixelproof_image/manifest.py` (JSON Schema contract, Python validator as source of truth, "viewport" only enforced).

---

## Q5: Status Vocabulary Unification

- **Question:** What is the full status vocabulary across checks, captures, and comparisons?
- **Decision:** DECIDED (owner-delegated, Step 29): Comparison status: compared|failed. Capture status: captured|failed. Check states: passed|failed|skipped|unavailable.
- **Spec Section:** §7.7, §9.3, §11, §16, §21, Appendix A (Q5)
- **Status & Implementation:** Existing behavior. Implemented in `schemas/comparison-report.schema.json`, `src/browser/capture.ts`, `src/core/check-environment.ts`, and `pixelproof_image/final_report.py`.

---

## Q6: Completion Status of Specification Checklist

- **Question:** Which items, if any, in the source §15 checklist are already complete?
- **Decision:** DECIDED (owner-delegated, Step 29): No checklist item is ticked until the final acceptance run (Step 38).
- **Spec Section:** §15, Appendix A (Q6)
- **Status & Implementation:** Policy only. Documented in `docs/release-checklist.md` where all checklist items remain unchecked `[ ]` until Step 38 acceptance verification.

---

## Q7: Finality of Recommended Technology Choices

- **Question:** Should personal recommendations in technology choice sections be treated as final decisions?
- **Decision:** DECIDED (owner-delegated, Step 29): The technology choices in spec section 22 are final.
- **Spec Section:** §2, §22, §23, Appendix A (Q7)
- **Status & Implementation:** Policy only. Affirms the technology choices adopted across the repository (Playwright, Node.js/TypeScript, Python, Pillow, NumPy).

---

## Q8: Priority Score Factors and Stall Parameters

- **Question:** How are priority score factors S, V, R, severity scales, and stall criteria defined and calibrated?
- **Decision:** DECIDED (owner-delegated, Step 29): S = region diffRatio; V = owner-supplied weights (default 1.0); R NOT BUILT; stall window 2; MAX_ITERATIONS default 5; no severity labels or thresholds.
- **Spec Section:** §7.6, §8.1, §8.4, §12, Appendix A (Q8)
- **Status & Implementation:** Existing behavior. Implemented in `pixelproof_image/regions.py` ($P = A \times S \times V$, factor R null/unbuilt, no severity labels or thresholds), `schemas/references.schema.json`, and `pixelproof_image/iteration.py` (stall window 2, MAX_ITERATIONS 5).

---

## Q9: Execution Scope and Boundary of the Run Command

- **Question:** What does `pixelproof run` execute itself, and what does it delegate to the agent?
- **Decision:** DECIDED (owner-delegated, Step 29): `run` stays NOT BUILT. If built later it only orchestrates tool steps and never edits application code.
- **Spec Section:** §11, Appendix A (Q9)
- **Status & Implementation:** Policy only. The `pixelproof run` command remains unbuilt; any future implementation will serve solely to orchestrate tool steps without editing application source code.
