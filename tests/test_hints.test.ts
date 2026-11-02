/**
 * Tests for actionable error hints in TypeScript (spec §11).
 *
 * Verifies TypeScript hint mappings, dynamic source coverage, lack of stack traces,
 * real failing run categories (TS capture unreachable, TS usage error),
 * and wrapper stdout byte-identity on failing compare.
 */

import assert from "node:assert";
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

import { captureUrl } from "../src/browser/capture.js";
import { HINTS, hintFor, makeError } from "../src/core/hints.js";

const execFileAsync = promisify(execFile);
const REPO_ROOT = path.resolve(".");
const CLI_PATH = path.join(REPO_ROOT, "dist", "src", "cli", "index.js");

function runCli(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile("node", [CLI_PATH, ...args], (err: any, stdout, stderr) => {
      const code = typeof err?.code === "number" ? err.code : (err ? 1 : 0);
      resolve({ stdout: stdout ?? "", stderr: stderr ?? "", code });
    });
  });
}

function extractTsSourceCodes(): Set<string> {
  const codes = new Set<string>();
  const srcDir = path.join(REPO_ROOT, "src");

  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".ts") && entry.name !== "hints.ts") {
        const text = fs.readFileSync(full, "utf-8");
        for (const m of text.matchAll(/makeError(?:\s*<[^>]+>)?\(\s*"([a-zA-Z0-9_-]+)"/g)) {
          codes.add(m[1]);
        }
        for (const m of text.matchAll(/isTimeout\s*\?\s*"([a-zA-Z0-9_-]+)"\s*:\s*"([a-zA-Z0-9_-]+)"/g)) {
          codes.add(m[1]);
          codes.add(m[2]);
        }
        for (const m of text.matchAll(/unavailableCode:\s*"([a-zA-Z0-9_-]+)"/g)) {
          codes.add(m[1]);
        }
        for (const m of text.matchAll(/unavailableCode\s*=\s*opts\?\.unavailableCode\s*\?\?\s*"([a-zA-Z0-9_-]+)"/g)) {
          codes.add(m[1]);
        }
        for (const m of text.matchAll(/code:\s*"([a-zA-Z0-9_-]+)"/g)) {
          if (!["string", "code", "error"].includes(m[1])) {
            codes.add(m[1]);
          }
        }
      }
    }
  }

  walk(srcDir);
  return codes;
}

test("every TS source error code has non-empty hint", () => {
  const sourceCodes = extractTsSourceCodes();
  assert.ok(sourceCodes.size >= 15, `Expected at least 15 TS codes, found ${sourceCodes.size}`);

  const missing: string[] = [];
  const empty: string[] = [];

  for (const code of Array.from(sourceCodes).sort()) {
    const hint = hintFor(code);
    if (hint === undefined) {
      missing: missing.push(code);
    } else if (typeof hint !== "string" || hint.trim().length === 0) {
      empty.push(code);
    }
  }

  assert.deepStrictEqual(missing, [], `Missing hints for TS codes: ${missing.join(", ")}`);
  assert.deepStrictEqual(empty, [], `Empty hints for TS codes: ${empty.join(", ")}`);
});

test("unknown code returns undefined in hintFor", () => {
  assert.strictEqual(hintFor("nonexistent_unknown_code"), undefined);
  assert.strictEqual(hintFor(""), undefined);
});

test("hints have no stack traces or env var patterns", () => {
  const envPattern = /\$[A-Za-z_]+|%[A-Za-z_]+%|process\.env|os\.environ/;
  for (const [code, hint] of Object.entries(HINTS)) {
    assert.ok(!hint.includes("Traceback"), `Hint for ${code} contains Traceback`);
    assert.ok(!hint.includes("at Object."), `Hint for ${code} contains at Object.`);
    assert.ok(!envPattern.test(hint), `Hint for ${code} contains env var pattern`);
    assert.ok(hint.endsWith("."), `Hint for ${code} should end with period`);
    assert.ok(hint.length > 10, `Hint for ${code} is too short`);
  }
});

test("makeError attaches hint when mapped, omits when unknown", () => {
  const errKnown = makeError("navigation_failed", "Connection refused");
  assert.strictEqual(errKnown.code, "navigation_failed");
  assert.strictEqual(errKnown.message, "Connection refused");
  assert.strictEqual(errKnown.hint, hintFor("navigation_failed"));

  const errUnknown = makeError("unmapped_test_code", "Something happened");
  assert.strictEqual(errUnknown.code, "unmapped_test_code");
  assert.strictEqual(errUnknown.message, "Something happened");
  assert.strictEqual("hint" in errUnknown, false);
});

test("real failing run Category 3: TS capture unreachable shows hint", async () => {
  const tmpDir = path.join(REPO_ROOT, "node_modules", ".cache", "test_hints_cap");
  fs.mkdirSync(tmpDir, { recursive: true });
  const outPath = path.join(tmpDir, "unreachable.png");

  // Attempt capture against a closed port
  const res = await captureUrl({
    url: "http://127.0.0.1:9/",
    outputPath: outPath,
    viewport: { width: 100, height: 100 },
    overwrite: true,
  });

  assert.strictEqual(res.status, "failed");
  assert.strictEqual(res.error.code, "navigation_failed");
  assert.strictEqual(typeof res.error.hint, "string");
  assert.strictEqual(res.error.hint, hintFor("navigation_failed"));
});

test("real failing run Category 4: TS usage error shows hint", async () => {
  const { stdout, code } = await runCli(["capture"]);
  assert.strictEqual(code, 2);
  const parsed = JSON.parse(stdout);
  assert.strictEqual(parsed.status, "failed");
  assert.strictEqual(parsed.error.code, "usage_error");
  assert.strictEqual(typeof parsed.error.hint, "string");
  assert.strictEqual(parsed.error.hint, hintFor("usage_error"));
});

test("TS wrapper byte-identical to Python CLI for failing compare", async () => {
  const tmpDir = path.join(REPO_ROOT, "node_modules", ".cache", "test_hints_byte");
  fs.mkdirSync(tmpDir, { recursive: true });

  const refPath = path.join(tmpDir, "ref.png");
  const actPath = path.join(tmpDir, "act.png");
  const outTs = path.join(tmpDir, "out_ts");
  const outPy = path.join(tmpDir, "out_py");

  // Create 4x4 vs 5x4 images using python
  await execFileAsync("python", [
    "-c",
    `from PIL import Image; Image.new('RGB', (4, 4), 'white').save('${refPath}'); Image.new('RGB', (5, 4), 'black').save('${actPath}')`,
  ]);

  const { stdout: tsStdout, code: tsCode } = await runCli([
    "compare",
    "--id",
    "mismatch-hint",
    "--reference",
    refPath,
    "--actual",
    actPath,
    "--out",
    outTs,
  ]);
  assert.strictEqual(tsCode, 1);

  let pyStdout = "";
  try {
    const res = await execFileAsync("python", [
      "-m",
      "pixelproof_image.cli",
      "compare",
      "--id",
      "mismatch-hint",
      "--reference",
      refPath,
      "--actual",
      actPath,
      "--out",
      outPy,
    ]);
    pyStdout = res.stdout;
  } catch (err: any) {
    pyStdout = err.stdout;
  }

  assert.strictEqual(tsStdout, pyStdout);
  const parsed = JSON.parse(tsStdout);
  assert.strictEqual(parsed.error.code, "dimension_mismatch");
  assert.strictEqual(parsed.error.hint, hintFor("dimension_mismatch"));
});
