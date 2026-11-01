/**
 * PixelProof manifest loader and validator bridge.
 *
 * Architecture notes:
 * - Status conventions and CLI-bridge invocation are AGENT PROPOSALS (pending Q2, Q4, Q5).
 * - TypeScript delegates all manifest validation to the Python validate CLI per spec §2
 *   (components communicate via JSON files and CLIs). Validation is NEVER performed in TypeScript.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface LoadManifestOptions {
  pythonCommand?: string; // default "python" (AGENT PROPOSAL)
}

export interface ValidManifestResult {
  status: "valid";
  manifestPath: string;
  referenceCount: number;
  references: Array<{
    id: string;
    route: string;
    captureType: string;
    viewport: { width: number; height: number };
    deviceScaleFactor?: number;
    image: string;
    notes?: string;
  }>;
}

export interface InvalidManifestResult {
  status: "invalid";
  errors: Array<{
    code: string;
    path: string;
    message: string;
  }>;
}

export interface ValidatorUnavailableResult {
  status: "failed";
  error: {
    code: "validator_unavailable";
    message: string;
  };
}

export type ManifestResult =
  | ValidManifestResult
  | InvalidManifestResult
  | ValidatorUnavailableResult;

export interface PythonCliExecutionResult {
  status: "success" | "failed";
  stdout: string;
  exitCode: number;
  parsedJson?: any;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Execute a pixelproof_image.cli subcommand via child_process.execFile (no shell).
 *
 * Architecture note:
 * - Reusable Python CLI invocation bridge (AGENT PROPOSAL, pending Q2).
 * - Enforces { shell: false }, captures exit code and stdout, and checks for valid JSON.
 */
export async function runPythonCli(
  cliArgs: string[],
  opts?: {
    pythonCommand?: string;
    unavailableCode?: string;
  }
): Promise<PythonCliExecutionResult> {
  const pythonCommand = opts?.pythonCommand ?? "python";
  const unavailableCode = opts?.unavailableCode ?? "validator_unavailable";
  let stdout = "";
  let exitCode = 0;

  try {
    const res = await execFileAsync(
      pythonCommand,
      ["-m", "pixelproof_image.cli", ...cliArgs],
      { shell: false }
    );
    stdout = res.stdout;
    exitCode = 0;
  } catch (err: any) {
    if (typeof err?.stdout === "string" && err.stdout.trim().length > 0) {
      stdout = err.stdout;
      exitCode = typeof err.status === "number" ? err.status : (typeof err.code === "number" ? err.code : 1);
    } else {
      return {
        status: "failed",
        stdout: "",
        exitCode: 1,
        error: {
          code: unavailableCode,
          message: err?.message ?? String(err),
        },
      };
    }
  }

  try {
    const parsed = JSON.parse(stdout);
    return {
      status: "success",
      stdout,
      exitCode,
      parsedJson: parsed,
    };
  } catch (parseErr: any) {
    return {
      status: "failed",
      stdout,
      exitCode: 1,
      error: {
        code: unavailableCode,
        message: `Failed to parse Python stdout as JSON: ${parseErr?.message ?? String(parseErr)}`,
      },
    };
  }
}

/**
 * Load and validate a reference manifest by invoking the Python validate CLI.
 *
 * @param manifestPath Path to the references.json manifest file.
 * @param opts Optional execution settings including custom pythonCommand.
 * @returns Parsed JSON output from the validator CLI.
 */
export async function loadManifest(
  manifestPath: string,
  opts?: LoadManifestOptions
): Promise<ManifestResult> {
  const res = await runPythonCli(["validate", "--manifest", manifestPath], {
    pythonCommand: opts?.pythonCommand,
    unavailableCode: "validator_unavailable",
  });

  if (res.status === "failed") {
    return {
      status: "failed",
      error: res.error as any,
    };
  }

  return res.parsedJson;
}
