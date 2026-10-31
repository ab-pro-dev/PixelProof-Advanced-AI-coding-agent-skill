/**
 * PixelProof browser screenshot capture utility using Playwright.
 *
 * Notes on architecture and conventions:
 * - Statuses ("captured", "failed"), error codes ("url_not_allowed", "navigation_failed",
 *   "timeout", "write_failed", "output_exists"), and option names (e.g. allowExternal)
 *   are AGENT PROPOSALS pending open question Q5.
 * - networkidle is NOT used as the default readiness strategy per spec §12, because
 *   modern web applications frequently keep connections open (SSE, WebSocket, analytics),
 *   causing networkidle to stall or timeout. The default wait strategy is "load".
 *   Configurable readiness strategies belong in a later Phase 2 step.
 * - Connect-only: PixelProof does not start or manage application servers.
 * - Capture type: viewport only (captureType "viewport" per spec §5.1, pending Q4).
 * - Security (§13): Restricts navigation by default to local hosts (localhost, 127.0.0.1, ::1).
 *   External navigation requires explicit allowExternal: true. Non-http(s) schemes are rejected.
 *   Secrets, cookies, and tokens are never logged.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { chromium, type Browser } from "playwright";

export interface Viewport {
  width: number;
  height: number;
}

export interface CaptureOptions {
  url: string;
  outputPath: string;
  viewport: Viewport;
  deviceScaleFactor?: number; // default 1
  timeoutMs?: number; // default 30000
  allowExternal?: boolean; // default false (AGENT PROPOSAL)
  overwrite?: boolean; // default false
}

export interface CaptureSuccess {
  status: "captured";
  url: string;
  outputPath: string;
  viewport: Viewport;
  deviceScaleFactor: number;
  timestamp: string; // ISO 8601 string
  consoleErrors: string[];
}

export interface CaptureFailure {
  status: "failed";
  error: {
    code: "url_not_allowed" | "navigation_failed" | "timeout" | "write_failed" | "output_exists";
    message: string;
  };
  url: string;
}

export type CaptureResult = CaptureSuccess | CaptureFailure;

const ALLOWED_LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isLocalHostname(hostname: string): boolean {
  return ALLOWED_LOCAL_HOSTNAMES.has(hostname.toLowerCase());
}

/**
 * Capture a screenshot of a web page at a specific viewport dimension using Playwright.
 *
 * @param options Capture options including URL, destination path, and viewport dimensions.
 * @returns A JSON-serializable CaptureResult object indicating success or failure.
 */
export async function captureUrl(options: CaptureOptions): Promise<CaptureResult> {
  // 1. Validate URL syntax and protocol
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(options.url);
  } catch {
    return {
      status: "failed",
      error: {
        code: "url_not_allowed",
        message: `Invalid URL: ${options.url}`,
      },
      url: options.url,
    };
  }

  // Reject non-http(s) schemes always, even if allowExternal is true
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return {
      status: "failed",
      error: {
        code: "url_not_allowed",
        message: `Scheme '${parsedUrl.protocol}' is not allowed. Only http: and https: are permitted.`,
      },
      url: options.url,
    };
  }

  // Enforce local-only by default (§13 security requirement)
  const isExternalAllowed = options.allowExternal === true;
  if (!isExternalAllowed && !isLocalHostname(parsedUrl.hostname)) {
    return {
      status: "failed",
      error: {
        code: "url_not_allowed",
        message: `Host '${parsedUrl.hostname}' is not allowed by default. Only local hosts (localhost, 127.0.0.1, ::1) are permitted unless allowExternal: true is explicitly specified.`,
      },
      url: options.url,
    };
  }

  // 2. Validate output path and overwrite policy
  const resolvedOutPath = path.resolve(options.outputPath);
  if (!options.overwrite && fs.existsSync(resolvedOutPath)) {
    return {
      status: "failed",
      error: {
        code: "output_exists",
        message: `Output file already exists at ${resolvedOutPath}. Use overwrite: true to replace.`,
      },
      url: options.url,
    };
  }

  try {
    fs.mkdirSync(path.dirname(resolvedOutPath), { recursive: true });
  } catch (err: any) {
    return {
      status: "failed",
      error: {
        code: "write_failed",
        message: `Failed to create output directory: ${err?.message ?? String(err)}`,
      },
      url: options.url,
    };
  }

  // 3. Launch browser and capture screenshot
  const deviceScaleFactor = options.deviceScaleFactor ?? 1;
  const timeoutMs = options.timeoutMs ?? 30000;
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      viewport: {
        width: options.viewport.width,
        height: options.viewport.height,
      },
      deviceScaleFactor,
    });

    const page = await context.newPage();
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    // Navigate to target URL with default "load" readiness strategy (§12)
    try {
      await page.goto(options.url, {
        waitUntil: "load",
        timeout: timeoutMs,
      });
    } catch (navErr: any) {
      const isTimeout =
        navErr?.name === "TimeoutError" ||
        (typeof navErr?.message === "string" && navErr.message.includes("Timeout"));
      return {
        status: "failed",
        error: {
          code: isTimeout ? "timeout" : "navigation_failed",
          message: navErr?.message ?? String(navErr),
        },
        url: options.url,
      };
    }

    // Capture viewport-only screenshot (fullPage: false)
    try {
      await page.screenshot({
        path: resolvedOutPath,
        fullPage: false,
        timeout: timeoutMs,
      });
    } catch (shotErr: any) {
      const isTimeout =
        shotErr?.name === "TimeoutError" ||
        (typeof shotErr?.message === "string" && shotErr.message.includes("Timeout"));
      return {
        status: "failed",
        error: {
          code: isTimeout ? "timeout" : "write_failed",
          message: shotErr?.message ?? String(shotErr),
        },
        url: options.url,
      };
    }

    return {
      status: "captured",
      url: options.url,
      outputPath: options.outputPath,
      viewport: {
        width: options.viewport.width,
        height: options.viewport.height,
      },
      deviceScaleFactor,
      timestamp: new Date().toISOString(),
      consoleErrors,
    };
  } catch (err: any) {
    const isTimeout =
      err?.name === "TimeoutError" ||
      (typeof err?.message === "string" && err.message.includes("Timeout"));
    return {
      status: "failed",
      error: {
        code: isTimeout ? "timeout" : "navigation_failed",
        message: err?.message ?? String(err),
      },
      url: options.url,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
