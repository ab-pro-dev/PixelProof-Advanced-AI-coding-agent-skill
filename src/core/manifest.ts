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
  const pythonCommand = opts?.pythonCommand ?? "python";
  let stdout = "";

  try {
    const res = await execFileAsync(
      pythonCommand,
      ["-m", "pixelproof_image.cli", "validate", "--manifest", manifestPath],
      { shell: false }
    );
    stdout = res.stdout;
  } catch (err: any) {
    if (typeof err?.stdout === "string" && err.stdout.trim().length > 0) {
      stdout = err.stdout;
    } else {
      return {
        status: "failed",
        error: {
          code: "validator_unavailable",
          message: err?.message ?? String(err),
        },
      };
    }
  }

  try {
    const parsed = JSON.parse(stdout);
    return parsed;
  } catch (parseErr: any) {
    return {
      status: "failed",
      error: {
        code: "validator_unavailable",
        message: `Failed to parse validator stdout as JSON: ${parseErr?.message ?? String(parseErr)}`,
      },
    };
  }
}
