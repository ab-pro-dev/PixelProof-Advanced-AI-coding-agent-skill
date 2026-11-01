import assert from "node:assert";
import { execFile, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test, { after, before, describe } from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function runCli(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const cliPath = path.resolve("dist/src/cli/index.js");
    const proc = spawn(process.execPath, [cliPath, ...args]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    proc.on("close", (code) => {
      resolve({ stdout, stderr, code: code ?? 0 });
    });
  });
}

describe("TypeScript CLI wrappers (validate & inspect)", () => {
  let tmpDir: string;
  const sampleProjectDir = path.resolve("examples/sample-project");
  const validManifestPath = path.resolve("examples/sample-project/references/references.json");

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pixelproof-cli-wrappers-"));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("validate on a valid manifest exits 0 with status valid", async () => {
    const { stdout, code } = await runCli(["validate", "--manifest", validManifestPath]);
    assert.strictEqual(code, 0);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "valid");
    assert.strictEqual(parsed.referenceCount, 2);
  });

  test("validate on a manifest with wrong version exits 1 with status invalid", async () => {
    const invalidManifest = path.join(tmpDir, "invalid_version.json");
    fs.writeFileSync(
      invalidManifest,
      JSON.stringify({ version: 99, references: [] }, null, 2),
      "utf-8"
    );

    const { stdout, code } = await runCli(["validate", "--manifest", invalidManifest]);
    assert.strictEqual(code, 1);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "invalid");
    assert(Array.isArray(parsed.errors));
    assert(parsed.errors.length > 0);
  });

  test("inspect on committed examples/sample-project exits 0 with framework React", async () => {
    const { stdout, code } = await runCli(["inspect", "--project", sampleProjectDir]);
    assert.strictEqual(code, 0);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "inspected");
    assert.strictEqual(parsed.framework?.value, "React");
  });

  test("inspect on nonexistent dir exits 1 with not_a_directory", async () => {
    const nonexistent = path.join(tmpDir, "does_not_exist");
    const { stdout, code } = await runCli(["inspect", "--project", nonexistent]);
    assert.strictEqual(code, 1);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "failed");
    assert.strictEqual(parsed.error?.code, "not_a_directory");
  });

  test("validate with nonexistent --python command exits 1 with validator_unavailable", async () => {
    const { stdout, code } = await runCli([
      "validate",
      "--manifest",
      validManifestPath,
      "--python",
      "nonexistent_python_binary_xyz_12345",
    ]);
    assert.strictEqual(code, 1);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "failed");
    assert.strictEqual(parsed.error?.code, "validator_unavailable");
  });

  test("inspect with nonexistent --python command exits 1 with inspector_unavailable", async () => {
    const { stdout, code } = await runCli([
      "inspect",
      "--project",
      sampleProjectDir,
      "--python",
      "nonexistent_python_binary_xyz_12345",
    ]);
    assert.strictEqual(code, 1);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "failed");
    assert.strictEqual(parsed.error?.code, "inspector_unavailable");
  });

  test("stdout from validate and inspect wrappers is byte-identical to Python CLI", async () => {
    // 1. Validate byte-identity
    const { stdout: tsValidateStdout } = await runCli(["validate", "--manifest", validManifestPath]);
    const pyValidateRes = await execFileAsync("python", [
      "-m",
      "pixelproof_image.cli",
      "validate",
      "--manifest",
      validManifestPath,
    ]);
    assert.strictEqual(tsValidateStdout, pyValidateRes.stdout);

    // 2. Inspect byte-identity
    const { stdout: tsInspectStdout } = await runCli(["inspect", "--project", sampleProjectDir]);
    const pyInspectRes = await execFileAsync("python", [
      "-m",
      "pixelproof_image.cli",
      "inspect",
      "--project",
      sampleProjectDir,
    ]);
    assert.strictEqual(tsInspectStdout, pyInspectRes.stdout);
  });

  test("stdout from validate wrapper on invalid manifest is byte-identical to Python CLI", async () => {
    const invalidManifest = path.join(tmpDir, "invalid_version_byte.json");
    fs.writeFileSync(
      invalidManifest,
      JSON.stringify({ version: 99, references: [] }, null, 2),
      "utf-8"
    );

    const { stdout: tsValidateStdout, code: tsCode } = await runCli(["validate", "--manifest", invalidManifest]);
    assert.strictEqual(tsCode, 1);

    let pyStdout = "";
    let pyCode = 0;
    try {
      const res = await execFileAsync("python", [
        "-m",
        "pixelproof_image.cli",
        "validate",
        "--manifest",
        invalidManifest,
      ]);
      pyStdout = res.stdout;
    } catch (err: any) {
      pyStdout = err.stdout;
      pyCode = err.code;
    }
    assert.strictEqual(pyCode, 1);
    assert.strictEqual(tsValidateStdout, pyStdout);
  });
});
