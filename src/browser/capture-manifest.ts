/**
 * PixelProof manifest-driven browser capture runner.
 *
 * Architecture and specification alignment:
 * - Manifest capture pipeline, statuses, and field names are AGENT PROPOSALS (pending Q2, Q4, Q5).
 * - Implements spec §6 multi-page coverage rules: every registered reference gets an attempt,
 *   failures of one reference do not abort others, and failures are reported explicitly, never skipped.
 * - Connect-only: connects to the application at baseUrl without managing project dev processes.
 * - Python-TS interop: uses loadManifest() to delegate manifest validation to the Python CLI.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { makeError } from "../core/hints.js";
import { loadManifest } from "../core/manifest.js";
import { captureUrl, type Viewport, type WaitUntilStrategy } from "./capture.js";

export interface CaptureFromManifestOptions {
  manifestPath: string;
  baseUrl?: string;
  outputDir: string;
  overwrite?: boolean;
  pythonCommand?: string; // default "python" (AGENT PROPOSAL)
  readySelector?: string;
  waitUntil?: WaitUntilStrategy;
  timeoutMs?: number;
}

export interface CaptureReferenceResult {
  referenceId: string;
  status: "captured" | "failed";
  outputPath?: string;
  error?: {
    code: string;
    message: string;
    hint?: string;
  };
  viewport: Viewport;
  deviceScaleFactor: number;
}

export interface CaptureFromManifestCompleted {
  status: "completed";
  total: number;
  captured: number;
  failed: number;
  results: CaptureReferenceResult[];
}

export interface CaptureFromManifestFailed {
  status: "failed";
  error: {
    code: string;
    message?: string;
    hint?: string;
  };
  errors?: Array<{
    code: string;
    path: string;
    message: string;
    hint?: string;
  }>;
}

export type CaptureFromManifestResult =
  | CaptureFromManifestCompleted
  | CaptureFromManifestFailed;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function buildUrl(baseUrl: string, route: string): string {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const pathPart = route.startsWith("/") ? route : `/${route}`;
  return `${base}${pathPart}`;
}

/**
 * Capture screenshots for all references registered in a manifest.
 *
 * @param options Manifest path, base URL, output directory, and capture options.
 * @returns Result object with status "completed" and individual results, or "failed".
 */
export async function captureFromManifest(
  options: CaptureFromManifestOptions
): Promise<CaptureFromManifestResult> {
  // 1. Validate manifest using the Python validator CLI
  const manifest = await loadManifest(options.manifestPath, {
    pythonCommand: options.pythonCommand,
  });

  if (manifest.status === "failed") {
    return {
      status: "failed",
      error: manifest.error,
    };
  }

  if (manifest.status === "invalid") {
    return {
      status: "failed",
      error: makeError("manifest_invalid", "Manifest validation failed"),
      errors: manifest.errors,
    };
  }

  // 2. Resolve base URL (from option or manifest project.baseUrl)
  let effectiveBaseUrl = options.baseUrl;
  if (!effectiveBaseUrl) {
    try {
      const rawText = fs.readFileSync(options.manifestPath, "utf-8");
      const rawData = JSON.parse(rawText);
      if (
        typeof rawData?.project?.baseUrl === "string" &&
        rawData.project.baseUrl.trim().length > 0
      ) {
        effectiveBaseUrl = rawData.project.baseUrl.trim();
      }
    } catch {
      // Ignore read/parse errors; handled by check below
    }
  }

  if (!effectiveBaseUrl) {
    return {
      status: "failed",
      error: makeError(
        "base_url_missing",
        "Base URL was not provided in options and could not be found in manifest project.baseUrl"
      ),
    };
  }

  // 3. Check for empty references
  const total = manifest.references.length;
  if (total === 0) {
    return {
      status: "failed",
      error: makeError("no_references", "Manifest contains no references to capture"),
    };
  }

  // 4. Capture each reference
  const finalDir = path.join(options.outputDir, "final");
  let captured = 0;
  let failed = 0;
  const results: CaptureReferenceResult[] = [];

  for (const ref of manifest.references) {
    const dsf = ref.deviceScaleFactor ?? 1;

    // Security check on reference ID before path interpolation
    if (!ID_PATTERN.test(ref.id)) {
      failed++;
      results.push({
        referenceId: ref.id,
        status: "failed",
        error: makeError(
          "invalid_reference_id",
          `Reference ID does not match [A-Za-z0-9_-]{1,64}: ${ref.id}`
        ),
        viewport: ref.viewport,
        deviceScaleFactor: dsf,
      });
      continue;
    }

    const targetUrl = buildUrl(effectiveBaseUrl, ref.route);
    const outPath = path.join(finalDir, `${ref.id}.png`);

    const captureRes = await captureUrl({
      url: targetUrl,
      outputPath: outPath,
      viewport: ref.viewport,
      deviceScaleFactor: dsf,
      overwrite: options.overwrite,
      readySelector: options.readySelector,
      waitUntil: options.waitUntil,
      timeoutMs: options.timeoutMs,
    });

    if (captureRes.status === "captured") {
      captured++;
      results.push({
        referenceId: ref.id,
        status: "captured",
        outputPath: captureRes.outputPath,
        viewport: ref.viewport,
        deviceScaleFactor: dsf,
      });
    } else {
      failed++;
      results.push({
        referenceId: ref.id,
        status: "failed",
        error: captureRes.error,
        viewport: ref.viewport,
        deviceScaleFactor: dsf,
      });
    }
  }

  return {
    status: "completed",
    total,
    captured,
    failed,
    results,
  };
}
