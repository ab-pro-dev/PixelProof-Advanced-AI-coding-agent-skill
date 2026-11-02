# Visual Analysis and Priority Scoring

## Overview

In accordance with specification §7.5 and §7.6, PixelProof provides region-based comparison and visual difference prioritization. The priority score $P$ is defined in §7.6 as a heuristic to order discrepancies for human or agent review, not an objective measure of design quality.

All naming conventions, grid tiling mechanisms, and provisional formula factors described here are **AGENT PROPOSALS** pending resolution of open architectural question Q8.

---

## What is Measured

1. **Regions (Grid Tiling):**
   - The comparison canvas is tiled into a uniform integer grid ($R \times C$, default $4 \times 4$), where remainder pixels are absorbed by the final row and column so that regions tile the image completely without gaps or overlaps.
   - For each cell, PixelProof measures:
     - `areaFraction`: Region area divided by total image area ($W \times H$).
     - `differingPixels`: Count of pixels differing in any color channel.
     - `diffRatio`: Fraction of differing pixels within the region (`differingPixels / (width * height)`).
     - `mae`: Mean absolute error across RGB channels within the region.

2. **Unweighted Ranking:**
   - Orders differing regions by measured score: $\text{score} = \text{areaFraction} \times \text{diffRatio}$ (equivalent to the region's differing pixels over the total image pixels).
   - Only regions with `differingPixels > 0` are ranked. Zero-difference regions are omitted.
   - Strictly measured; no severity labels or subjective thresholds.

3. **Owner-Supplied Weights ($V$):**
   - Optional visual importance weights matrix supplied by the human owner in the manifest (`regionWeights`) or via CLI (`--weights <path>`).
   - Weight values must be positive numbers $\le 10.0$.
   - The agent never invents or infers weights; default is $1.0$ for all cells.

4. **Priority Score ($P$):**
   - Computed as:
     $$P = A \times S \times V \times R$$
   - In the weighted ranking, `priorityScore` equals `weightedScore` ($A \times S \times V$).
   - Raw floating-point values are reported alongside the explicit factor dictionary:
     `{"A": areaFraction, "S": diffRatio, "V": weight, "R": null}`.

---

## Factor Definitions

| Factor | Name | Source / Meaning | Status |
|---|---|---|---|
| **$A$** | Affected Area Fraction | `areaFraction` of the grid cell relative to total image pixels ($W \times H$). | Measured |
| **$S$** | Mismatch Proportion | `diffRatio` within the cell (`differingPixels / region pixels`). | Measured |
| **$V$** | Visual Importance | Owner-supplied weight from matrix (defaults to 1.0 when unweighted). | Owner-supplied |
| **$R$** | Component Reuse / Frequency | Frequency of the affected component across screens. | **NOT BUILT** (treated as 1, reported as `null`) |

---

## What is NOT BUILT

The following features remain unbuilt and deferred:
- **Component Reuse Factor ($R$):** Cross-page component frequency analysis is not implemented; reported as `null` in factors.
- **SSIM and Geometry Checks:** Structural Similarity and geometric layout checks (§7.4) belong to future Phase 3 deliverables.
- **Severity Labels:** No classification into "critical", "major", "minor", or "high/medium/low".
- **Pass/Fail Thresholds:** No acceptance or rejection thresholds based on priority scores or MAE (pending Q8).
- **Issue Generation:** The `"issues"` array remains strictly empty until issue generation rules are formally defined.

---

## Honest Limitations

- **Heuristic, Not Design Quality:** Spec §7.6 explicitly notes that $P$ is a ranking heuristic to prioritize inspection, not an objective evaluation of visual aesthetic or layout quality.
- **Difference Detection vs. Semantic Correctness:** A high priority score indicates a high concentration of differing pixels in a visually important cell, not necessarily a human-perceptible defect.
- **No Autonomous Importance Judgment:** Visual importance weights ($V$) originate strictly from the project owner; the agent does not fabricate importance values.
