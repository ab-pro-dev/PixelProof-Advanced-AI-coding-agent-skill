# PixelProof Execution Benchmarks

This document records measured wall-clock execution timings and determinism across the core PixelProof toolchain commands (§18).

> [!NOTE]
> **Single-Machine Measurement**: All metrics were measured on a single local Linux development machine (Node.js v24.22.2, Chromium 156.0.8078.4 via Playwright, Python 3.14.4). These results reflect one specific hardware and environment configuration and are not a general performance claim.

## Benchmark Status by Site

| Site | Routes | Status | Notes |
| --- | --- | --- | --- |
| `examples/nextjs-app` (Next.js) | `/`, `/about` | **Benchmarked** | Served via `next dev -H 127.0.0.1 -p 5175`. |
| `examples/real-app` (Vite) | `/`, `/dashboard` | **Benchmarked** | Served via `vite --host 127.0.0.1 --port 5173 --strictPort`. |
| `examples/sample-project` | `/`, `/dashboard` | **Skipped** | Static project fixture without dev server; not served. |
| `examples/plain-html` | `/`, `/about` | **Benchmarked** | Served via `python3 -m http.server 5174 --bind 127.0.0.1`. |

## Measured Results (`examples/nextjs-app (Next.js)`)

Each command was executed twice in succession against reference screenshots generated at 1280×720 (deviceScaleFactor: 1). Determinism verifies whether both runs produced identical differing pixel counts and metric scores. Measured with Node.js v24.22.2 and Chromium 156.0.8078.4 (from `pixelproof doctor`).

| Site | Routes | Command | Run 1 (s) | Run 2 (s) | Determinism |
| --- | --- | --- | --- | --- | --- |
| `examples/nextjs-app` | `/`, `/about` | `pixelproof validate` | 0.869 | 0.958 | Identical (code 0, valid) |
| `examples/nextjs-app` | `/`, `/about` | `pixelproof capture` | 3.216 | 3.310 | Identical (captured 2/2) |
| `examples/nextjs-app` | `/` | `pixelproof compare --regions` | 1.244 | 1.294 | Identical (0 differing px, MAE 0.0) |
| `examples/nextjs-app` | `/about` | `pixelproof compare --regions` | 1.249 | 1.157 | Identical (0 differing px, MAE 0.0) |
| `examples/nextjs-app` | `/`, `/about` | `pixelproof iterate` | 1.490 | 1.402 | Identical (0 differing px, MAE 0.0) |

## Measured Results (`examples/real-app (Vite + React)`)

Each command was executed twice in succession against reference screenshots generated at 1280×720 (deviceScaleFactor: 1). Determinism verifies whether both runs produced identical differing pixel counts and metric scores. Measured with Node.js v24.22.2 and Chromium 156.0.8078.4 (from `pixelproof doctor`).

| Site | Routes | Command | Run 1 (s) | Run 2 (s) | Determinism |
| --- | --- | --- | --- | --- | --- |
| `examples/real-app` | `/`, `/dashboard` | `pixelproof validate` | 0.739 | 0.697 | Identical (code 0, valid) |
| `examples/real-app` | `/`, `/dashboard` | `pixelproof capture` | 2.485 | 2.578 | Identical (captured 2/2) |
| `examples/real-app` | `/` | `pixelproof compare --regions` | 1.226 | 1.272 | Identical (0 differing px, MAE 0.0) |
| `examples/real-app` | `/dashboard` | `pixelproof compare --regions` | 0.971 | 0.959 | Identical (0 differing px, MAE 0.0) |
| `examples/real-app` | `/`, `/dashboard` | `pixelproof iterate` | 1.425 | 1.503 | Identical (0 differing px, MAE 0.0) |

## Measured Results (`examples/plain-html`)

Each command was executed twice in succession against reference screenshots generated at 1280×720 (deviceScaleFactor: 1). Determinism verifies whether both runs produced identical differing pixel counts and metric scores.

| Site | Routes | Command | Run 1 (s) | Run 2 (s) | Determinism |
| --- | --- | --- | --- | --- | --- |
| `examples/plain-html` | `/`, `/about` | `pixelproof validate` | 0.369 | 0.335 | Identical (code 0, valid) |
| `examples/plain-html` | `/`, `/about` | `pixelproof capture` | 1.638 | 1.610 | Identical (captured 2/2) |
| `examples/plain-html` | `/` | `pixelproof compare --regions` | 0.472 | 0.517 | Identical (0 differing px, MAE 0.0) |
| `examples/plain-html` | `/about` | `pixelproof compare --regions` | 0.476 | 0.506 | Identical (0 differing px, MAE 0.0) |
| `examples/plain-html` | `/`, `/about` | `pixelproof iterate` | 0.358 | 0.362 | Identical (0 differing px, MAE 0.0) |

## Key Findings

1. **Deterministic Visual Output:** Both runs produced byte-identical difference measurements (0 differing pixels and 0.0 MAE across both routes).
2. **Predictable Execution Times:** Capture across two routes averaged ~1.62s including browser launch and navigation; comparisons with 4×4 regional grids averaged ~0.49s per reference.
