/**
 * PixelProof browser screenshot capture utility using Playwright.
 *
 * Notes on architecture, readiness, and conventions:
 * - Statuses ("captured", "failed"), error codes ("url_not_allowed", "navigation_failed",
 *   "timeout", "write_failed", "output_exists", "readiness_timeout", "invalid_option"),
 *   option names (waitUntil, readySelector, waitForFonts, disableAnimations, allowExternal,
 *   locale, timezoneId, colorScheme, reducedMotion), and their default values are AGENT PROPOSALS
 *   pending open question Q5.
 * - networkidle is NOT used as the default readiness strategy per spec §12, because
 *   modern web applications frequently keep connections open (SSE, WebSocket, analytics),
 *   causing networkidle to stall or timeout. The default wait strategy is "load".
 *   networkidle must be chosen explicitly, never as default.
 * - Readiness strategies: Supports waiting for document fonts (`waitForFonts: true`) and
 *   explicit readiness selector visibility (`readySelector?: string`).
 * - Deterministic rendering (§13): Disables animations and hides caret by default using Playwright's
 *   built-in screenshot options (`animations: "disabled"`, `caret: "hide"`). Applies fixed context
 *   defaults for locale ("en-US"), timezone ("UTC"), color scheme ("light"), and reduced motion ("reduce").
 * - Connect-only: PixelProof does not start or manage application servers.
 * - Capture type: viewport only (captureType "viewport" per spec §5.1, pending Q4).
 * - Security (§13): Restricts navigation by default to local hosts (localhost, 127.0.0.1, ::1).
 *   External navigation requires explicit allowExternal: true. Non-http(s) schemes are rejected.
 *   Secrets, cookies, and tokens are never logged.
 * - Browser sandbox remains enabled; sandbox is never disabled.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { chromium, type Browser } from "playwright";

export type WaitUntilStrategy = "load" | "domcontentloaded" | "networkidle";
export type ColorScheme = "light" | "dark" | "no-preference";
export type ReducedMotion = "reduce" | "no-preference";

export type BrowserLauncher = (options?: Parameters<typeof chromium.launch>[0]) => Promise<Browser>;

// AGENT PROPOSAL: Browser launcher injection for tests without changing production behavior.
// Must NOT be exposed through captureFromManifest options or any future CLI flag.
let defaultBrowserLauncher: BrowserLauncher = (launchOptions) => chromium.launch(launchOptions);

/**
 * Set the default browser launcher (used for test isolation).
 * AGENT PROPOSAL: Test hook only. Must NOT be exposed through captureFromManifest options or CLI flags.
 */
export function setDefaultBrowserLauncher(launcher: BrowserLauncher): void {
  defaultBrowserLauncher = launcher;
}

/**
 * Reset the default browser launcher to Playwright's chromium.launch.
 * AGENT PROPOSAL: Test hook only.
 */
export function resetDefaultBrowserLauncher(): void {
  defaultBrowserLauncher = (launchOptions) => chromium.launch(launchOptions);
}

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
  waitUntil?: WaitUntilStrategy; // default "load" (AGENT PROPOSAL)
  readySelector?: string; // wait for element to be visible after navigation
  waitForFonts?: boolean; // default true (AGENT PROPOSAL)
  disableAnimations?: boolean; // default true (AGENT PROPOSAL)
  locale?: string; // default "en-US" (AGENT PROPOSAL)
  timezoneId?: string; // default "UTC" (AGENT PROPOSAL)
  colorScheme?: ColorScheme; // default "light" (AGENT PROPOSAL)
  reducedMotion?: ReducedMotion; // default "reduce" (AGENT PROPOSAL)
  /**
   * Optional internal launcher hook for testing (default: Playwright's chromium.launch).
   * AGENT PROPOSAL: Internal test injection only. Must NOT be exposed through
   * captureFromManifest options or any future CLI flag.
   */
  launcher?: BrowserLauncher;
}

export interface CaptureSuccess {
  status: "captured";
  url: string;
  outputPath: string;
  viewport: Viewport;
  deviceScaleFactor: number;
  timestamp: string; // ISO 8601 string
  consoleErrors: string[];
  browserVersion: string;
  platform: string;
  readyAfterMs: number;
  waitUntil: WaitUntilStrategy;
}

export interface CaptureFailure {
  status: "failed";
  error: {
    code:
      | "url_not_allowed"
      | "navigation_failed"
      | "timeout"
      | "write_failed"
      | "output_exists"
      | "readiness_timeout"
      | "invalid_option";
    message: string;
  };
  url: string;
}

export type CaptureResult = CaptureSuccess | CaptureFailure;

const ALLOWED_LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const VALID_WAIT_UNTIL = new Set(["load", "domcontentloaded", "networkidle"]);

function isLocalHostname(hostname: string): boolean {
  return ALLOWED_LOCAL_HOSTNAMES.has(hostname.toLowerCase());
}

/**
 * Capture a deterministic screenshot of a web page at a specific viewport dimension using Playwright.
 *
 * @param options Capture options including URL, destination path, viewport, and readiness settings.
 * @returns A JSON-serializable CaptureResult object indicating success or failure.
 */
export async function captureUrl(options: CaptureOptions): Promise<CaptureResult> {
  // 1. Validate options before launching browser
  const waitUntil: WaitUntilStrategy = options.waitUntil ?? "load";
  if (!VALID_WAIT_UNTIL.has(waitUntil)) {
    return {
      status: "failed",
      error: {
        code: "invalid_option",
        message: `Invalid waitUntil option: '${options.waitUntil}'. Allowed values: load, domcontentloaded, networkidle.`,
      },
      url: options.url,
    };
  }

  // 2. Validate URL syntax and protocol
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

  // 3. Validate output path and overwrite policy
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

  // 4. Launch browser and set up context with deterministic defaults
  const launchBrowser = options.launcher ?? defaultBrowserLauncher;
  const deviceScaleFactor = options.deviceScaleFactor ?? 1;
  const timeoutMs = options.timeoutMs ?? 30000;
  const waitForFonts = options.waitForFonts !== false; // default true
  const disableAnimations = options.disableAnimations !== false; // default true
  const locale = options.locale ?? "en-US";
  const timezoneId = options.timezoneId ?? "UTC";
  const colorScheme = options.colorScheme ?? "light";
  const reducedMotion = options.reducedMotion ?? "reduce";

  let browser: Browser | null = null;

  try {
    browser = await launchBrowser({
      headless: true,
    });

    const browserVersion = browser.version();
    const platform = process.platform;

    const context = await browser.newContext({
      viewport: {
        width: options.viewport.width,
        height: options.viewport.height,
      },
      deviceScaleFactor,
      locale,
      timezoneId,
      colorScheme,
      reducedMotion,
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

    // 5. Navigate to target URL with configured waitUntil
    const startTime = performance.now();
    try {
      await page.goto(options.url, {
        waitUntil,
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
    const navEndTime = performance.now();

    // 6. Readiness handling: fonts + readySelector
    if (waitForFonts) {
      try {
        await page.evaluate(async () => {
          if ("fonts" in document) {
            await (document as any).fonts.ready;
          }
        });
      } catch {
        // Document font readiness failures do not abort capture
      }
    }

    if (options.readySelector) {
      const elapsedSoFar = performance.now() - startTime;
      const selectorRemainingMs = Math.max(1, timeoutMs - elapsedSoFar);
      try {
        await page.locator(options.readySelector).waitFor({
          state: "visible",
          timeout: selectorRemainingMs,
        });
      } catch (selErr: any) {
        const isTimeout =
          selErr?.name === "TimeoutError" ||
          (typeof selErr?.message === "string" && selErr.message.includes("Timeout"));
        return {
          status: "failed",
          error: {
            code: isTimeout ? "readiness_timeout" : "navigation_failed",
            message: selErr?.message ?? String(selErr),
          },
          url: options.url,
        };
      }
    }
    const readyEndTime = performance.now();
    const readyAfterMs = Math.round(readyEndTime - navEndTime);

    // 7. Capture viewport-only screenshot with deterministic options
    const elapsedBeforeShot = performance.now() - startTime;
    const shotRemainingMs = Math.max(1, timeoutMs - elapsedBeforeShot);

    try {
      await page.screenshot({
        path: resolvedOutPath,
        fullPage: false,
        timeout: shotRemainingMs,
        animations: disableAnimations ? "disabled" : "allow",
        caret: disableAnimations ? "hide" : "initial",
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
      browserVersion,
      platform,
      readyAfterMs,
      waitUntil,
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
