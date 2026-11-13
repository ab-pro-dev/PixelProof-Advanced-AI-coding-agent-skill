#!/usr/bin/env node
/**
 * PixelProof TypeScript CLI entry point.
 *
 * Architecture and specification alignment:
 * - Exit codes (0 for full success, 1 for reference failure/pipeline failure, 2 for usage errors)
 *   and CLI flag names are AGENT PROPOSALS pending open questions Q2 and Q5.
 * - Adheres to spec §11 CLI requirements: clear help, predictable exit codes, actionable errors,
 *   JSON output on stdout for agents, explicit project/config options, and no silent overwriting.
 * - Bridges Phase 1 tools (validate, inspect, compare, report) to the Python CLI via execFile (no shell)
 *   while preserving byte-identical stdout JSON per spec §2.
 * - SECURITY: Connect-only, localhost-only default. External URLs and sandbox bypasses are prohibited.
 *   Environment variables and secrets are never logged.
 */

import { initProject } from "../core/init.js";
import { loadConfig } from "../core/config.js";
import { parseArgs } from "node:util";
import { captureFromManifest } from "../browser/capture-manifest.js";
import type { WaitUntilStrategy } from "../browser/capture.js";
import { checkEnvironment, formatHumanReport } from "../core/check-environment.js";
import { makeError } from "../core/hints.js";
import { installSkill, type SupportedAgent } from "../core/install-skill.js";
import { runPythonCli } from "../core/manifest.js";

let config: ReturnType<typeof loadConfig>;

const VALID_WAIT_UNTIL = new Set(["load", "domcontentloaded", "networkidle"]);

function printUsageError(message: string): never {
  const errorDoc = {
    status: "failed",
    error: makeError("usage_error", message),
  };
  console.log(JSON.stringify(errorDoc, null, 2));
  process.exit(2);
}

function printRootHelp(): void {
  console.log(`PixelProof: AI coding-agent skill and deterministic visual verification toolkit.

Usage: pixelproof <command> [options]

Available Commands:
  init       Create starter reference manifest, folder, and configuration
  validate   Validate a reference manifest file
  inspect    Inspect a frontend project directory in read-only mode
  capture    Capture screenshots for all references registered in a manifest
  compare    Compare reference and actual images and output comparison artifacts
  report     Build and write final report files (JSON and Markdown)
  iterate    Record one refinement iteration and compute deltas vs previous iteration
  progress   Evaluate iteration progress, regressions, and stop reasons
  doctor     Check runtime environment, dependencies, and browser capabilities

Setup:
    install-skill  Install agent skill for Antigravity, Claude, Cursor, Copilot

Options:
  --config <path>    Configuration JSON (default: config/default.json, else built-in defaults)
  --help, -h Show help for pixelproof

Use 'pixelproof <command> --help' for more information about a command.
`);
  process.exit(0);
}

function printValidateHelp(): void {
  console.log(`Validate a reference manifest file against specification requirements.

Usage:
  pixelproof validate --manifest <path> [options]

Required flags:
  --manifest <path>  Path to reference manifest JSON file

Options:
  --config <path>    Configuration JSON (default: config/default.json, else built-in defaults)
  --python <cmd>     Python executable command or path (default: python)
  --help, -h         Show help for validate command
`);
  process.exit(0);
}

function printInspectHelp(): void {
  console.log(`Inspect a frontend project directory in read-only mode.

Usage:
  pixelproof inspect --project <dir> [options]

Required flags:
  --project <dir>  Path to target frontend project directory

Options:
  --config <path>    Configuration JSON (default: config/default.json, else built-in defaults)
  --python <cmd>   Python executable command or path (default: python)
  --help, -h       Show help for inspect command
`);
  process.exit(0);
}

function printCompareHelp(): void {
  console.log(`Compare reference and actual images and output comparison artifacts.

Usage:
  pixelproof compare --id <id> --reference <path> --actual <path> --out <dir> [options]

Required flags:
  --id <id>           Reference identifier ([A-Za-z0-9_-], max 64 chars)
  --reference <path>  Path to reference image
  --actual <path>     Path to actual rendered image
  --out <dir>         Output directory for comparison artifacts

Options:
  --config <path>    Configuration JSON (default: config/default.json, else built-in defaults)
  --regions           Include region-based comparison measurements
  --grid <RxC>        Grid dimensions for regions (default: 4x4)
  --weights <path>    Path to JSON file containing regionWeights object
  --overwrite         Overwrite existing comparison artifacts
  --python <cmd>      Python executable command or path (default: python)
  --help, -h          Show help for compare command
`);
  process.exit(0);
}

function printReportHelp(): void {
  console.log(`Build and write final report files (JSON and Markdown) under output directory.

Usage:
  pixelproof report --summary <path> --out <dir> [options]

Required flags:
  --summary <path>  Path to run summary JSON file
  --out <dir>       Base directory under which reports/ will be created

Options:
  --config <path>    Configuration JSON (default: config/default.json, else built-in defaults)
  --overwrite       Overwrite existing report files
  --python <cmd>    Python executable command or path (default: python)
  --help, -h        Show help for report command
`);
  process.exit(0);
}

function printIterateHelp(): void {
  console.log(`Record one refinement iteration and compute deltas vs previous iteration.

Usage:
  pixelproof iterate --manifest <path> --actual-dir <dir> --out <dir> [options]

Required flags:
  --manifest <path>    Path to reference manifest JSON file
  --actual-dir <dir>   Directory containing actual rendered screenshots (<id>.png)
  --out <dir>          Base output directory for comparison artifacts and state/

Options:
  --config <path>    Configuration JSON (default: config/default.json, else built-in defaults)
  --max-iterations <n> Maximum iterations (default: config maxIterations, 5)
  --overwrite          Accepted for compatibility; comparison artifacts are always regenerated
  --python <cmd>       Python executable command or path (default: python)
  --help, -h           Show help for iterate command
`);
  process.exit(0);
}

function printProgressHelp(): void {
  console.log(`Evaluate iteration progress, regressions, and stop reasons from state file.

Usage:
  pixelproof progress --state <path> [options]

Required flags:
  --state <path>        Path to iterations.json state file

Options:
  --config <path>    Configuration JSON (default: config/default.json, else built-in defaults)
  --stall-window <n>    Number of consecutive iterations required to detect stall (default: 2)
  --python <cmd>        Python executable command or path (default: python)
  --help, -h            Show help for progress command
`);
  process.exit(0);
}

function printDoctorHelp(): void {
  console.log(`Evaluate runtime environment and dependencies against specification requirements.

Usage:
  pixelproof doctor [options]

Options:
  --config <path>    Configuration JSON (default: config/default.json, else built-in defaults)
  --json          Output full diagnostics as JSON document
  --python <cmd>  Python executable command or path (default: python)
  --help, -h      Show help for doctor command
`);
  process.exit(0);
}

function printCaptureHelp(): void {
  console.log(`Capture screenshots for all references registered in a manifest file.

Usage:
  pixelproof capture --manifest <path> --out <dir> [options]

Required flags:
  --manifest <path>            Path to reference manifest JSON file
  --out <dir>                  Output directory for captured screenshots

Options:
  --config <path>    Configuration JSON (default: config/default.json, else built-in defaults)
  --base-url <url>             Target application base URL (localhost only)
  --overwrite                  Overwrite existing output files
  --timeout-ms <n>            Capture timeout in milliseconds (default: config browser.timeoutMs, 30000)
  --ready-selector <selector>  CSS selector to wait for visibility before capturing
  --wait-until <strategy>      Navigation wait strategy: load, domcontentloaded, networkidle (default: config browser.waitUntil, networkidle)
  --python <cmd>               Python executable command or path (default: python)
  --help, -h                   Show help for capture command
`);
  process.exit(0);
}

const VALIDATE_OPTIONS = {
  help: { type: "boolean", short: "h" },
  manifest: { type: "string" },
  python: { type: "string" },
} as const;

async function runValidate(args: string[]): Promise<void> {
  let values: {
    help?: boolean;
    manifest?: string;
    python?: string;
  };
  let positionals: string[];

  try {
    const parsed = parseArgs({
      args,
      options: VALIDATE_OPTIONS,
      allowPositionals: true,
      strict: true,
    });
    values = parsed.values;
    positionals = parsed.positionals;
  } catch (err: any) {
    printUsageError(err?.message ?? String(err));
  }

  if (values.help) {
    printValidateHelp();
  }

  if (positionals.length > 0) {
    printUsageError(`Unexpected positional argument(s): ${positionals.join(", ")}`);
  }

  if (!values.manifest || values.manifest.trim().length === 0) {
    printUsageError("Missing required flag: --manifest");
  }

  const res = await runPythonCli(["validate", "--manifest", values.manifest], {
    pythonCommand: values.python,
    unavailableCode: "validator_unavailable",
  });

  if (res.status === "failed") {
    console.log(JSON.stringify({ status: "failed", error: res.error }, null, 2));
    process.exit(1);
  }

  process.stdout.write(res.stdout);
  process.exit(res.exitCode);
}

const INSPECT_OPTIONS = {
  help: { type: "boolean", short: "h" },
  project: { type: "string" },
  python: { type: "string" },
} as const;

async function runInspect(args: string[]): Promise<void> {
  let values: {
    help?: boolean;
    project?: string;
    python?: string;
  };
  let positionals: string[];

  try {
    const parsed = parseArgs({
      args,
      options: INSPECT_OPTIONS,
      allowPositionals: true,
      strict: true,
    });
    values = parsed.values;
    positionals = parsed.positionals;
  } catch (err: any) {
    printUsageError(err?.message ?? String(err));
  }

  if (values.help) {
    printInspectHelp();
  }

  if (positionals.length > 0) {
    printUsageError(`Unexpected positional argument(s): ${positionals.join(", ")}`);
  }

  if (!values.project || values.project.trim().length === 0) {
    printUsageError("Missing required flag: --project");
  }

  const res = await runPythonCli(["inspect", "--project", values.project], {
    pythonCommand: values.python,
    unavailableCode: "inspector_unavailable",
  });

  if (res.status === "failed") {
    console.log(JSON.stringify({ status: "failed", error: res.error }, null, 2));
    process.exit(1);
  }

  process.stdout.write(res.stdout);
  process.exit(res.exitCode);
}

const COMPARE_OPTIONS = {
  help: { type: "boolean", short: "h" },
  id: { type: "string" },
  reference: { type: "string" },
  actual: { type: "string" },
  out: { type: "string" },
  overwrite: { type: "boolean" },
  regions: { type: "boolean" },
  grid: { type: "string" },
  weights: { type: "string" },
  python: { type: "string" },
} as const;

async function runCompare(args: string[]): Promise<void> {
  let values: {
    help?: boolean;
    id?: string;
    reference?: string;
    actual?: string;
    out?: string;
    overwrite?: boolean;
    regions?: boolean;
    grid?: string;
    weights?: string;
    python?: string;
  };
  let positionals: string[];

  try {
    const parsed = parseArgs({
      args,
      options: COMPARE_OPTIONS,
      allowPositionals: true,
      strict: true,
    });
    values = parsed.values;
    positionals = parsed.positionals;
  } catch (err: any) {
    printUsageError(err?.message ?? String(err));
  }

  if (values.help) {
    printCompareHelp();
  }

  if (positionals.length > 0) {
    printUsageError(`Unexpected positional argument(s): ${positionals.join(", ")}`);
  }

  if (!values.id || values.id.trim().length === 0) {
    printUsageError("Missing required flag: --id");
  }
  if (!values.reference || values.reference.trim().length === 0) {
    printUsageError("Missing required flag: --reference");
  }
  if (!values.actual || values.actual.trim().length === 0) {
    printUsageError("Missing required flag: --actual");
  }
  if (!values.out || values.out.trim().length === 0) {
    printUsageError("Missing required flag: --out");
  }

  const cliArgs = [
    "compare",
    "--id",
    values.id,
    "--reference",
    values.reference,
    "--actual",
    values.actual,
    "--out",
    values.out,
  ];
  if (values.overwrite) {
    cliArgs.push("--overwrite");
  }
  if (values.regions) {
    cliArgs.push("--regions");
  }
  if (values.grid) {
    cliArgs.push("--grid", values.grid);
  }
  if (values.weights) {
    cliArgs.push("--weights", values.weights);
  }

  const res = await runPythonCli(cliArgs, {
    pythonCommand: values.python,
    unavailableCode: "compare_unavailable",
  });

  if (res.status === "failed") {
    console.log(JSON.stringify({ status: "failed", error: res.error }, null, 2));
    process.exit(1);
  }

  process.stdout.write(res.stdout);
  process.exit(res.exitCode);
}

const REPORT_OPTIONS = {
  help: { type: "boolean", short: "h" },
  summary: { type: "string" },
  out: { type: "string" },
  overwrite: { type: "boolean" },
  python: { type: "string" },
} as const;

async function runReport(args: string[]): Promise<void> {
  let values: {
    help?: boolean;
    summary?: string;
    out?: string;
    overwrite?: boolean;
    python?: string;
  };
  let positionals: string[];

  try {
    const parsed = parseArgs({
      args,
      options: REPORT_OPTIONS,
      allowPositionals: true,
      strict: true,
    });
    values = parsed.values;
    positionals = parsed.positionals;
  } catch (err: any) {
    printUsageError(err?.message ?? String(err));
  }

  if (values.help) {
    printReportHelp();
  }

  if (positionals.length > 0) {
    printUsageError(`Unexpected positional argument(s): ${positionals.join(", ")}`);
  }

  if (!values.summary || values.summary.trim().length === 0) {
    printUsageError("Missing required flag: --summary");
  }
  if (!values.out || values.out.trim().length === 0) {
    printUsageError("Missing required flag: --out");
  }

  const cliArgs = ["report", "--summary", values.summary, "--out", values.out];
  if (values.overwrite) {
    cliArgs.push("--overwrite");
  }

  const res = await runPythonCli(cliArgs, {
    pythonCommand: values.python,
    unavailableCode: "report_unavailable",
  });

  if (res.status === "failed") {
    console.log(JSON.stringify({ status: "failed", error: res.error }, null, 2));
    process.exit(1);
  }

  process.stdout.write(res.stdout);
  process.exit(res.exitCode);
}

const ITERATE_OPTIONS = {
  "max-iterations": { type: "string" },
  help: { type: "boolean", short: "h" },
  manifest: { type: "string" },
  "actual-dir": { type: "string" },
  out: { type: "string" },
  overwrite: { type: "boolean" },
  python: { type: "string" },
} as const;

async function runIterate(args: string[]): Promise<void> {
  let values: {
    help?: boolean;
    manifest?: string;
    "actual-dir"?: string;
    "max-iterations"?: string;
    out?: string;
    overwrite?: boolean;
    python?: string;
  };
  let positionals: string[];

  try {
    const parsed = parseArgs({
      args,
      options: ITERATE_OPTIONS,
      allowPositionals: true,
      strict: true,
    });
    values = parsed.values;
    positionals = parsed.positionals;
  } catch (err: any) {
    printUsageError(err?.message ?? String(err));
  }

  if (values.help) {
    printIterateHelp();
  }

  if (positionals.length > 0) {
    printUsageError(`Unexpected positional argument(s): ${positionals.join(", ")}`);
  }

  if (!values.manifest || values.manifest.trim().length === 0) {
    printUsageError("Missing required flag: --manifest");
  }
  if (!values["actual-dir"] || values["actual-dir"].trim().length === 0) {
    printUsageError("Missing required flag: --actual-dir");
  }
  if (!values.out || values.out.trim().length === 0) {
    printUsageError("Missing required flag: --out");
  }

  const maxIterations = positiveFlag(values["max-iterations"], config.maxIterations);
  const cliArgs = [
    "iterate",
    "--max-iterations", String(maxIterations),
    "--manifest",
    values.manifest,
    "--actual-dir",
    values["actual-dir"],
    "--out",
    values.out,
  ];
  if (values.overwrite) {
    cliArgs.push("--overwrite");
  }

  const res = await runPythonCli(cliArgs, {
    pythonCommand: values.python,
    unavailableCode: "iterate_unavailable",
  });

  if (res.status === "failed") {
    console.log(JSON.stringify({ status: "failed", error: res.error }, null, 2));
    process.exit(1);
  }

  process.stdout.write(res.stdout);
  process.exit(res.exitCode);
}

const PROGRESS_OPTIONS = {
  help: { type: "boolean", short: "h" },
  state: { type: "string" },
  "stall-window": { type: "string" },
  python: { type: "string" },
} as const;

async function runProgress(args: string[]): Promise<void> {
  let values: {
    help?: boolean;
    state?: string;
    "stall-window"?: string;
    python?: string;
  };
  let positionals: string[];

  try {
    const parsed = parseArgs({
      args,
      options: PROGRESS_OPTIONS,
      allowPositionals: true,
      strict: true,
    });
    values = parsed.values;
    positionals = parsed.positionals;
  } catch (err: any) {
    printUsageError(err?.message ?? String(err));
  }

  if (values.help) {
    printProgressHelp();
  }

  if (positionals.length > 0) {
    printUsageError(`Unexpected positional argument(s): ${positionals.join(", ")}`);
  }

  if (!values.state || values.state.trim().length === 0) {
    printUsageError("Missing required flag: --state");
  }

  const cliArgs = ["progress", "--state", values.state];
  if (values["stall-window"]) {
    cliArgs.push("--stall-window", values["stall-window"]);
  }

  const res = await runPythonCli(cliArgs, {
    pythonCommand: values.python,
    unavailableCode: "progress_unavailable",
  });

  if (res.status === "failed") {
    console.log(JSON.stringify({ status: "failed", error: res.error }, null, 2));
    process.exit(1);
  }

  process.stdout.write(res.stdout);
  process.exit(res.exitCode);
}

const DOCTOR_OPTIONS = {
  help: { type: "boolean", short: "h" },
  json: { type: "boolean" },
  python: { type: "string" },
} as const;

async function runDoctor(args: string[]): Promise<void> {
  let values: {
    help?: boolean;
    json?: boolean;
    python?: string;
  };
  let positionals: string[];

  try {
    const parsed = parseArgs({
      args,
      options: DOCTOR_OPTIONS,
      allowPositionals: true,
      strict: true,
    });
    values = parsed.values;
    positionals = parsed.positionals;
  } catch (err: any) {
    printUsageError(err?.message ?? String(err));
  }

  if (values.help) {
    printDoctorHelp();
  }

  if (positionals.length > 0) {
    printUsageError(`Unexpected positional argument(s): ${positionals.join(", ")}`);
  }

  const report = await checkEnvironment({
    pythonCmd: values.python,
  });

  if (values.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    process.stdout.write(formatHumanReport(report));
  }

  process.exit(report.allRequiredPassed ? 0 : 1);
}

const CAPTURE_OPTIONS = {
  "timeout-ms": { type: "string" },
  help: { type: "boolean", short: "h" },
  manifest: { type: "string" },
  out: { type: "string" },
  "base-url": { type: "string" },
  overwrite: { type: "boolean" },
  "ready-selector": { type: "string" },
  "wait-until": { type: "string" },
  python: { type: "string" },
} as const;

async function runCapture(args: string[]): Promise<void> {
  let values: {
    help?: boolean;
    manifest?: string;
    out?: string;
    "base-url"?: string;
    overwrite?: boolean;
    "ready-selector"?: string;
    "wait-until"?: string;
    "timeout-ms"?: string;
    python?: string;
  };
  let positionals: string[];

  try {
    const parsed = parseArgs({
      args,
      options: CAPTURE_OPTIONS,
      allowPositionals: true,
      strict: true,
    });
    values = parsed.values;
    positionals = parsed.positionals;
  } catch (err: any) {
    printUsageError(err?.message ?? String(err));
  }

  if (values.help) {
    printCaptureHelp();
  }

  if (positionals.length > 0) {
    printUsageError(`Unexpected positional argument(s): ${positionals.join(", ")}`);
  }

  if (!values.manifest || values.manifest.trim().length === 0) {
    printUsageError("Missing required flag: --manifest");
  }

  if (!values.out || values.out.trim().length === 0) {
    printUsageError("Missing required flag: --out");
  }

  if (values["wait-until"] && !VALID_WAIT_UNTIL.has(values["wait-until"])) {
    printUsageError(
      `Invalid --wait-until value: '${values["wait-until"]}'. Allowed values: load, domcontentloaded, networkidle.`
    );
  }

  const timeoutMs = positiveFlag(values["timeout-ms"], config.browser.timeoutMs);
  try {
    const result = await captureFromManifest({
      manifestPath: values.manifest,
      outputDir: values.out,
      baseUrl: values["base-url"],
      overwrite: values.overwrite,
      readySelector: values["ready-selector"],
      waitUntil: (values["wait-until"] as WaitUntilStrategy | undefined) ?? config.browser.waitUntil,
      timeoutMs,
      pythonCommand: values.python,
    });

    console.log(JSON.stringify(result, null, 2));

    if (result.status === "completed" && result.failed === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`[pixelproof] unexpected error: ${err?.message ?? String(err)}`);
    console.log(
      JSON.stringify(
        {
          status: "failed",
          error: makeError("internal_error", err?.message ?? String(err)),
        },
        null,
        2
      )
    );
    process.exit(1);
  }
}

function positiveFlag(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) printUsageError("Expected a positive integer, got: " + value);
  return n;
}

function runInit(args: string[]): void {
  let parsed;
  try {
    parsed = parseArgs({ args, options: {
      dir: { type: "string" }, overwrite: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    }, strict: true, allowPositionals: false });
  } catch (err: any) {
    printUsageError(err.message);
  }
  if (parsed.values.help) {
    console.log("Usage: pixelproof init [--dir DIR] [--overwrite]\nCreates starter files in DIR (default: cwd). Add references/home-desktop.png before validating.");
    process.exit(0);
  }
  const result = initProject(parsed.values.dir, parsed.values.overwrite);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.status === "created" ? 0 : 1);
}

function printInstallSkillHelp(): void {
  console.log(`Install PixelProof agent skill instructions for AI coding agents.

Usage:
  pixelproof install-skill [options]

Options:
  --agent <agent>    Target agent: antigravity, claude, cursor, copilot, all (default: all)
  --dir <path>       Target project directory (default: current directory)
  --global           Install globally for current user (Antigravity default: ~/.gemini/config/skills/pixelproof)
  --help, -h         Show help for install-skill command
`);
  process.exit(0);
}

function runInstallSkill(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      agent: { type: "string", default: "all" },
      dir: { type: "string" },
      global: { type: "boolean", default: true },
      help: { type: "boolean", short: "h" },
    },
    strict: false,
    allowPositionals: true,
  });

  if (values.help) {
    printInstallSkillHelp();
  }

  const results = installSkill({
    agent: values.agent as SupportedAgent,
    projectDir: typeof values.dir === "string" ? values.dir : undefined,
    global: typeof values.global === "boolean" ? values.global : true,
  });

  console.log(JSON.stringify({ status: "completed", results }, null, 2));
  process.exit(0);
}

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  let configPath: string | undefined;
  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === "--config") {
      if (!rawArgs[i + 1] || rawArgs[i + 1].startsWith("--")) printUsageError("--config requires a path");
      configPath = rawArgs[i + 1];
      rawArgs.splice(i, 2);
      i--;
    } else if (rawArgs[i].startsWith("--config=")) {
      configPath = rawArgs[i].slice(9);
      rawArgs.splice(i--, 1);
    }
  }
  try {
    config = loadConfig(configPath);
  } catch (err: any) {
    console.log(JSON.stringify({ status: "failed", error: makeError("config_invalid", err.message) }, null, 2));
    process.exit(1);
  }

  if (rawArgs.length === 0) {
    printUsageError(
      "Missing required command. Supported commands: init, validate, inspect, capture, compare, report, iterate, progress, doctor. Use --help for usage."
    );
  }

  const firstArg = rawArgs[0];

  if (firstArg === "--help" || firstArg === "-h") {
    printRootHelp();
  }

  if (firstArg === "init") {
    runInit(rawArgs.slice(1));
    return;
  }

  if (firstArg === "validate") {
    await runValidate(rawArgs.slice(1));
    return;
  }

  if (firstArg === "inspect") {
    await runInspect(rawArgs.slice(1));
    return;
  }

  if (firstArg === "capture") {
    await runCapture(rawArgs.slice(1));
    return;
  }

  if (firstArg === "compare") {
    await runCompare(rawArgs.slice(1));
    return;
  }

  if (firstArg === "report") {
    await runReport(rawArgs.slice(1));
    return;
  }

  if (firstArg === "iterate") {
    await runIterate(rawArgs.slice(1));
    return;
  }

  if (firstArg === "progress") {
    await runProgress(rawArgs.slice(1));
    return;
  }

  if (firstArg === "doctor") {
    await runDoctor(rawArgs.slice(1));
    return;
  }

  if (firstArg === "install-skill" || firstArg === "setup") {
    runInstallSkill(rawArgs.slice(1));
    return;
  }

  printUsageError(
    `Unknown command: '${firstArg}'. Supported commands: init, validate, inspect, capture, compare, report, iterate, progress, doctor.`
  );
}

main();
