import assert from "node:assert";
import { spawn } from "node:child_process";
import * as path from "node:path";
import test, { describe } from "node:test";

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

describe("CLI help commands listing", () => {
  test("--help output lists all 9 commands by name", async () => {
    const res = await runCli(["--help"]);
    assert.strictEqual(res.code, 0);

    const expectedCommands = [
      "init",
      "validate",
      "inspect",
      "capture",
      "compare",
      "report",
      "iterate",
      "progress",
      "doctor",
    ];

    for (const cmd of expectedCommands) {
      const pattern = new RegExp(`^  ${cmd}\\b`, "m");
      assert.match(
        res.stdout,
        pattern,
        `Expected --help output to list command '${cmd}' under Available Commands`
      );
    }

    const commandLines = res.stdout
      .split("\n")
      .filter((line) => /^  [a-z]/.test(line));
    assert.strictEqual(
      commandLines.length,
      9,
      `Expected exactly 9 commands matching '^  [a-z]', got: ${JSON.stringify(commandLines)}`
    );
  });
});
