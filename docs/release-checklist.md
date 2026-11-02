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

## 2. Specification Acceptance Criteria (§15, §17, §18)

- [ ] Multi-page reference understanding operates across diverse route configurations (§15)
- [ ] Project inspection identifies frameworks, dependencies, and styles in read-only mode (§5.2, §15)
- [ ] Deterministic visual verification produces accurate overlays, difference images, and measurements (§7.1, §15)
- [ ] Iterative refinement engine guides defect resolution without destructive regressions (§8.1, §15)
- [ ] Final reporting truthfully discloses unverified pages, failed references, or skipped checks (§15, §16)
- [ ] Automated test suite verifies normal execution, edge cases, and failure handling (§14, §15)
- [ ] Safety and sandboxing rules protect host source code and prevent untrusted execution (§17)
- [ ] Resource usage conforms to token, memory, and time constraints (§18)

---

## 3. Open Architectural Questions (Appendix A)

- [ ] Q1: Resolve stopping criteria combination and definition of configured acceptance policy (§8.1, §8.4, Appendix A)
- [ ] Q2: Formalize directory tree assignments and Python vs TypeScript CLI invocation boundary (§10, §19, Appendix A)
- [ ] Q3: Resolve manifest relative image path root and output baseline directory purpose (§6, §10, Appendix A)
- [ ] Q4: Align validation library selection (Zod vs JSON Schema) and define accepted captureType values (§2, §6, §10, Appendix A)
- [ ] Q5: Unify full check status and reference status reporting vocabulary (§7.7, §11, §21, Appendix A)
- [ ] Q6: Verify completion status of source documentation checklist items (§15, Appendix A)
- [ ] Q7: Formalize status of personal recommendations in final technology choices (§2, §22, §23, Appendix A)
- [ ] Q8: Calibrate and validate priority score parameters S, V, R and stall detection thresholds (§7.6, §8.1, §8.4, §12, Appendix A)
- [ ] Q9: Define exact division of responsibility between autonomous run command and agent guidance (§11, Appendix A)
