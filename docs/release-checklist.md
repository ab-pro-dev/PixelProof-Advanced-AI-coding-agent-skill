# PixelProof Release Checklist

Pre-release checklist tracking public-release deliverables, specification acceptance criteria, and open architectural questions. All items remain unchecked pending final production verification.

---

## 1. Phase 4 Production Deliverables (§19)

- [ ] Add agent adapters and installation instructions (§19 Phase 4)
- [ ] Add robust error handling and diagnostic output (§19 Phase 4)
- [ ] Complete unit, integration, regression, and end-to-end tests (§14, §19 Phase 4)
- [ ] Test with different frontend frameworks (§19 Phase 4)
- [ ] Improve security, performance, and reproducibility (§17, §18, §19 Phase 4)
- [ ] Write release documentation and usage examples (§19 Phase 4)
- [ ] Benchmark workflow on several multi-page sites (§19 Phase 4)

---

## 2. Specification Acceptance Criteria (§15)

- [x] Manifest validation: valid and invalid references are handled correctly (§15)
- [x] Project inspection: framework and commands are detected without destructive edits (§5.2, §15)
- [x] Browser capture: multiple routes capture at the requested viewport (§13, §15)
- [x] Visual comparison: overlay, diff, and numeric metrics are generated correctly (§7.1, §15)
- [x] Iterative workflow: issues can be ranked, rechecked, and stopped at the limit (§8.1, §15)
- [x] Failure reporting: failed routes and unavailable checks are never marked successful (§15, §16)
- [x] Portability: core instructions do not require one frontend framework or one coding agent (§9, §15)
- [x] Safety: secrets are excluded, user changes are preserved, and risky actions are blocked (§17, §15)

---

## 3. Open Architectural Questions (Appendix A)

- [ ] Q1: Resolve stopping criteria combination and definition of configured acceptance policy (§8.1, §8.4, Appendix A) (decided, see docs/decisions.md)
- [ ] Q2: Formalize directory tree assignments and Python vs TypeScript CLI invocation boundary (§10, §19, Appendix A) (decided, see docs/decisions.md)
- [ ] Q3: Resolve manifest relative image path root and output baseline directory purpose (§6, §10, Appendix A) (decided, see docs/decisions.md)
- [ ] Q4: Align validation library selection (Zod vs JSON Schema) and define accepted captureType values (§2, §6, §10, Appendix A) (decided, see docs/decisions.md)
- [ ] Q5: Unify full check status and reference status reporting vocabulary (§7.7, §11, §21, Appendix A) (decided, see docs/decisions.md)
- [ ] Q6: Verify completion status of source documentation checklist items (§15, Appendix A) (decided, see docs/decisions.md)
- [ ] Q7: Formalize status of personal recommendations in final technology choices (§2, §22, §23, Appendix A) (decided, see docs/decisions.md)
- [ ] Q8: Calibrate and validate priority score parameters S, V, R and stall detection thresholds (§7.6, §8.1, §8.4, §12, Appendix A) (decided, see docs/decisions.md)
- [ ] Q9: Define exact division of responsibility between autonomous run command and agent guidance (§11, Appendix A) (decided, see docs/decisions.md)
