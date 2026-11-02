/**
 * Environment diagnostic and capability verification (spec §9.3, §10, §19 Phase 4).
 *
 * Implements the 4-state vocabulary ("passed", "failed", "unavailable", "skipped")
 * and verifies required system capabilities with real measurements:
 * - Node.js version (>= 20)
 * - Python executable (>= 3.12 per spec §2)
 * - Python packages (pillow, numpy) via subprocess import
 * - Playwright package and Chromium launch (headless launch without --no-sandbox)
 * - Project build output (dist/src/cli/index.js)
 * - Git availability and repository detection (informational)
 *
 * All check names, thresholds, and diagnostic formats are AGENT PROPOSALS.
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CheckState = "passed" | "failed" | "unavailable" | "skipped";

export interface CheckResult {
  name: string;
  required: boolean;
  state: CheckState;
  detail: string;
  action?: string;
}

export interface EnvironmentReport {
  status: "passed" | "failed";
  allRequiredPassed: boolean;
  checks: CheckResult[];
}

export interface EnvironmentProbes {
  checkNode?: () => Promise<CheckResult> | CheckResult;
  checkPython?: (pythonCmd: string) => Promise<CheckResult> | CheckResult;
  checkPackages?: (pythonCmd: string) => Promise<CheckResult> | CheckResult;
  checkChromium?: () => Promise<CheckResult> | CheckResult;
  checkDist?: () => Promise<CheckResult> | CheckResult;
  checkGit?: () => Promise<CheckResult> | CheckResult;
  checkGitRepo?: () => Promise<CheckResult> | CheckResult;
}

export interface CheckEnvironmentOptions {
  pythonCmd?: string;
  probes?: EnvironmentProbes;
  distPath?: string;
  cwd?: string;
}

/**
 * Probe Node.js version.
 * AGENT PROPOSAL: Requires Node.js >= 20. Node 20 LTS is the minimum supported runtime
 * because it provides the built-in node:test test runner, native global fetch, Web Crypto API,
 * and stable NodeNext ESM resolution used throughout PixelProof.
 */
export function probeNode(nodeVersion = process.version): CheckResult {
  const match = /^v?(\d+)/.exec(nodeVersion);
  const major = match ? parseInt(match[1], 10) : 0;
  if (major >= 20) {
    return {
      name: "node",
      required: true,
      state: "passed",
      detail: `Node.js ${nodeVersion} (>= 20)`,
    };
  }
  return {
    name: "node",
    required: true,
    state: "failed",
    detail: `Node.js ${nodeVersion} is below required 20`,
    action: "Upgrade Node.js to version 20 or later (https://nodejs.org/)",
  };
}

/**
 * Probe Python version via subprocess execution.
 * Spec §2 requires Python >= 3.12.
 */
export async function probePython(pythonCmd = "python"): Promise<CheckResult> {
  try {
    const { stdout } = await execFileAsync(pythonCmd, [
      "-c",
      "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')",
    ]);
    const verStr = stdout.trim();
    const parts = verStr.split(".").map((n) => parseInt(n, 10));
    const major = parts[0] ?? 0;
    const minor = parts[1] ?? 0;

    if (major > 3 || (major === 3 && minor >= 12)) {
      return {
        name: "python",
        required: true,
        state: "passed",
        detail: `Python ${verStr} (>= 3.12)`,
      };
    }
    return {
      name: "python",
      required: true,
      state: "failed",
      detail: `Python ${verStr} is below required 3.12`,
      action: "Upgrade Python to version 3.12 or later (https://www.python.org/downloads/)",
    };
  } catch (err: any) {
    return {
      name: "python",
      required: true,
      state: "failed",
      detail: `Python executable '${pythonCmd}' not found or not executable`,
      action: "Install Python >= 3.12 or specify path with --python <cmd>",
    };
  }
}

/**
 * Probe required Python packages (Pillow and numpy) by importing them.
 */
export async function probePackages(pythonCmd = "python"): Promise<CheckResult> {
  try {
    const { stdout } = await execFileAsync(pythonCmd, [
      "-c",
      "import PIL; import numpy; print(f'Pillow {PIL.__version__}, numpy {numpy.__version__}')",
    ]);
    return {
      name: "python_packages",
      required: true,
      state: "passed",
      detail: stdout.trim(),
    };
  } catch (err: any) {
    return {
      name: "python_packages",
      required: true,
      state: "failed",
      detail: "Required Python packages missing: Pillow or numpy",
      action: "Install required packages: pip install pillow numpy (or pip install -e \".[dev]\")",
    };
  }
}

/**
 * Probe Chromium browser launchability using Playwright.
 * Launches headless Chromium and immediately closes it. Never uses --no-sandbox (§13).
 */
export async function probeChromium(
  launcher?: (options?: any) => Promise<any>
): Promise<CheckResult> {
  try {
    const { chromium } = await import("playwright");
    const launchFn = launcher ?? ((opts) => chromium.launch(opts));
    const browser = await launchFn({ headless: true });
    const version = browser.version();
    await browser.close();
    return {
      name: "chromium",
      required: true,
      state: "passed",
      detail: `Playwright installed, Chromium ${version} launchable`,
    };
  } catch (err: any) {
    return {
      name: "chromium",
      required: true,
      state: "failed",
      detail: `Chromium launch failed: ${err?.message ?? String(err)}`,
      action: "Install Chromium: npx playwright install chromium",
    };
  }
}

/**
 * Probe built TypeScript CLI output (dist/src/cli/index.js).
 */
export function probeDist(distPath?: string): CheckResult {
  const target = distPath ?? path.resolve(process.cwd(), "dist/src/cli/index.js");
  if (fs.existsSync(target)) {
    return {
      name: "dist",
      required: true,
      state: "passed",
      detail: "dist/src/cli/index.js built and present",
    };
  }
  return {
    name: "dist",
    required: true,
    state: "failed",
    detail: "dist/src/cli/index.js is missing",
    action: "Build the TypeScript project: npm run build",
  };
}

/**
 * Probe git command-line tool availability (informational).
 */
export async function probeGit(): Promise<CheckResult> {
  try {
    const { stdout } = await execFileAsync("git", ["--version"]);
    return {
      name: "git",
      required: false,
      state: "passed",
      detail: stdout.trim(),
    };
  } catch {
    return {
      name: "git",
      required: false,
      state: "unavailable",
      detail: "git executable not found",
      action: "Install git (https://git-scm.com/downloads) for workspace safety and version inspection",
    };
  }
}

/**
 * Probe whether current working directory is inside a git repository (informational).
 */
export async function probeGitRepo(cwd = process.cwd()): Promise<CheckResult> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"], { cwd });
    if (stdout.trim() === "true") {
      return {
        name: "git_repo",
        required: false,
        state: "passed",
        detail: "Working directory is a git repository",
      };
    }
  } catch {
    // Non-zero exit code indicates not in a git repository
  }
  return {
    name: "git_repo",
    required: false,
    state: "unavailable",
    detail: "Working directory is not inside a git repository",
    action: "Initialize git repository: git init",
  };
}

/**
 * Main environment check coordinator.
 * Collects results from all capability probes and returns an EnvironmentReport.
 */
export async function checkEnvironment(
  options: CheckEnvironmentOptions = {}
): Promise<EnvironmentReport> {
  const pythonCmd = options.pythonCmd ?? "python";
  const probes = options.probes ?? {};

  const nodeRes = await (probes.checkNode ? probes.checkNode() : probeNode());
  const pythonRes = await (probes.checkPython ? probes.checkPython(pythonCmd) : probePython(pythonCmd));

  let packagesRes: CheckResult;
  if (probes.checkPackages) {
    packagesRes = await probes.checkPackages(pythonCmd);
  } else if (pythonRes.state !== "passed") {
    packagesRes = {
      name: "python_packages",
      required: true,
      state: "unavailable",
      detail: "Python packages check unavailable: Python executable check failed",
      action: pythonRes.action ?? "Install Python >= 3.12 first",
    };
  } else {
    packagesRes = await probePackages(pythonCmd);
  }

  const chromiumRes = await (probes.checkChromium ? probes.checkChromium() : probeChromium());
  const distRes = await (probes.checkDist ? probes.checkDist() : probeDist(options.distPath));
  const gitRes = await (probes.checkGit ? probes.checkGit() : probeGit());
  const gitRepoRes = await (probes.checkGitRepo ? probes.checkGitRepo() : probeGitRepo(options.cwd));

  const checks: CheckResult[] = [
    nodeRes,
    pythonRes,
    packagesRes,
    chromiumRes,
    distRes,
    gitRes,
    gitRepoRes,
  ];

  const allRequiredPassed = checks
    .filter((c) => c.required)
    .every((c) => c.state === "passed");

  return {
    status: allRequiredPassed ? "passed" : "failed",
    allRequiredPassed,
    checks,
  };
}

/**
 * Formats an EnvironmentReport into clean, human-readable terminal lines.
 */
export function formatHumanReport(report: EnvironmentReport): string {
  const lines: string[] = ["PixelProof Environment Doctor", ""];
  for (const c of report.checks) {
    const stateTag = `[${c.state}]`.padEnd(15);
    const reqTag = c.required ? "" : " (informational)";
    lines.push(`${stateTag} ${c.name}${reqTag}: ${c.detail}`);
    if (c.state !== "passed" && c.action) {
      lines.push(`                Action: ${c.action}`);
    }
  }
  lines.push("");
  if (report.allRequiredPassed) {
    lines.push("Result: All required environment checks passed.");
  } else {
    const failedCount = report.checks.filter((c) => c.required && c.state !== "passed").length;
    lines.push(`Result: ${failedCount} required check(s) failed or unavailable. See recommended actions above.`);
  }
  return lines.join("\n") + "\n";
}
