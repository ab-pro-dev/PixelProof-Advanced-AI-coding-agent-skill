import assert from "node:assert";
import { spawn } from "node:child_process";
import * as path from "node:path";
import test, { describe } from "node:test";
import {
  checkEnvironment,
  probeChromium,
  probeDist,
  probeNode,
  probePython,
} from "../src/core/check-environment.js";

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

describe("Environment doctor (pixelproof doctor)", () => {
  test("probeNode returns passed for >= 20 and failed with action for < 20", () => {
    const passed20 = probeNode("v20.18.0");
    assert.strictEqual(passed20.state, "passed");
    assert.match(passed20.detail, /v20\.18\.0/);

    const passed22 = probeNode("v22.13.0");
    assert.strictEqual(passed22.state, "passed");

    const failed18 = probeNode("v18.19.0");
    assert.strictEqual(failed18.state, "failed");
    assert.ok(failed18.action?.includes("Upgrade Node.js"));
  });

  test("probePython returns passed for valid Python >= 3.12 and failed for nonexistent", async () => {
    const passedPy = await probePython("python");
    assert.strictEqual(passedPy.state, "passed");
    assert.match(passedPy.detail, /Python 3\.(1[2-9]|[2-9]\d)/);

    const failedPy = await probePython("/nonexistent/python");
    assert.strictEqual(failedPy.state, "failed");
    assert.match(failedPy.detail, /not found or not executable/);
    assert.ok(failedPy.action?.includes("Install Python >= 3.12"));
  });

  test("probeChromium reports failed when browser launch throws", async () => {
    const simulatedFailure = await probeChromium(async () => {
      throw new Error("Chromium launch failure simulated");
    });
    assert.strictEqual(simulatedFailure.state, "failed");
    assert.match(simulatedFailure.detail, /Chromium launch failure simulated/);
    assert.ok(simulatedFailure.action?.includes("playwright install chromium"));
  });

  test("probeDist returns passed when file exists and failed when missing", () => {
    const valid = probeDist(path.resolve("package.json"));
    assert.strictEqual(valid.state, "passed");

    const missing = probeDist(path.resolve("nonexistent-file.js"));
    assert.strictEqual(missing.state, "failed");
    assert.ok(missing.action?.includes("npm run build"));
  });

  test("checkEnvironment with injected probes proves each state path and required exit status", async () => {
    // 1. All required pass -> status passed
    const allPass = await checkEnvironment({
      probes: {
        checkNode: () => ({ name: "node", required: true, state: "passed", detail: "ok" }),
        checkPython: () => ({ name: "python", required: true, state: "passed", detail: "ok" }),
        checkPackages: () => ({ name: "python_packages", required: true, state: "passed", detail: "ok" }),
        checkChromium: () => ({ name: "chromium", required: true, state: "passed", detail: "ok" }),
        checkDist: () => ({ name: "dist", required: true, state: "passed", detail: "ok" }),
        checkGit: () => ({ name: "git", required: false, state: "passed", detail: "ok" }),
        checkGitRepo: () => ({ name: "git_repo", required: false, state: "passed", detail: "ok" }),
      },
    });
    assert.strictEqual(allPass.status, "passed");
    assert.strictEqual(allPass.allRequiredPassed, true);

    // 2. One required failed -> status failed
    const oneFailed = await checkEnvironment({
      probes: {
        checkNode: () => ({ name: "node", required: true, state: "passed", detail: "ok" }),
        checkPython: () => ({ name: "python", required: true, state: "failed", detail: "bad" }),
        checkPackages: () => ({ name: "python_packages", required: true, state: "passed", detail: "ok" }),
        checkChromium: () => ({ name: "chromium", required: true, state: "passed", detail: "ok" }),
        checkDist: () => ({ name: "dist", required: true, state: "passed", detail: "ok" }),
      },
    });
    assert.strictEqual(oneFailed.status, "failed");
    assert.strictEqual(oneFailed.allRequiredPassed, false);

    // 3. One required unavailable -> status failed
    const oneUnavail = await checkEnvironment({
      probes: {
        checkNode: () => ({ name: "node", required: true, state: "passed", detail: "ok" }),
        checkPython: () => ({ name: "python", required: true, state: "passed", detail: "ok" }),
        checkPackages: () => ({ name: "python_packages", required: true, state: "unavailable", detail: "missing" }),
        checkChromium: () => ({ name: "chromium", required: true, state: "passed", detail: "ok" }),
        checkDist: () => ({ name: "dist", required: true, state: "passed", detail: "ok" }),
      },
    });
    assert.strictEqual(oneUnavail.status, "failed");
    assert.strictEqual(oneUnavail.allRequiredPassed, false);

    // 4. Non-required (informational) unavailable while all required pass -> status passed
    const infoUnavail = await checkEnvironment({
      probes: {
        checkNode: () => ({ name: "node", required: true, state: "passed", detail: "ok" }),
        checkPython: () => ({ name: "python", required: true, state: "passed", detail: "ok" }),
        checkPackages: () => ({ name: "python_packages", required: true, state: "passed", detail: "ok" }),
        checkChromium: () => ({ name: "chromium", required: true, state: "passed", detail: "ok" }),
        checkDist: () => ({ name: "dist", required: true, state: "passed", detail: "ok" }),
        checkGit: () => ({ name: "git", required: false, state: "unavailable", detail: "git missing" }),
        checkGitRepo: () => ({ name: "git_repo", required: false, state: "unavailable", detail: "not a git repo" }),
      },
    });
    assert.strictEqual(infoUnavail.status, "passed");
    assert.strictEqual(infoUnavail.allRequiredPassed, true);
  });

  test("real run of checkEnvironment on this machine passes all required checks", async () => {
    const report = await checkEnvironment();
    assert.strictEqual(report.status, "passed");
    assert.strictEqual(report.allRequiredPassed, true);
    for (const c of report.checks) {
      if (c.required) {
        assert.strictEqual(c.state, "passed", `Required check ${c.name} did not pass`);
      }
    }
  });

  test("CLI doctor exits 0 with human-readable output on this machine", async () => {
    const { stdout, code } = await runCli(["doctor"]);
    assert.strictEqual(code, 0);
    assert.match(stdout, /PixelProof Environment Doctor/);
    assert.match(stdout, /\[passed\]\s+node:/);
    assert.match(stdout, /\[passed\]\s+python:/);
    assert.match(stdout, /\[passed\]\s+chromium:/);
    assert.match(stdout, /Result: All required environment checks passed\./);
  });

  test("CLI doctor --json output is parseable and contains every check name", async () => {
    const { stdout, code } = await runCli(["doctor", "--json"]);
    assert.strictEqual(code, 0);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "passed");
    assert.strictEqual(parsed.allRequiredPassed, true);
    assert.ok(Array.isArray(parsed.checks));
    const checkNames = parsed.checks.map((c: any) => c.name);
    assert.deepStrictEqual(checkNames, [
      "node",
      "python",
      "python_packages",
      "chromium",
      "dist",
      "git",
      "git_repo",
    ]);
  });

  test("CLI doctor with missing python command yields failed with actionable message and exit 1", async () => {
    const { stdout, code } = await runCli(["doctor", "--python", "/nonexistent"]);
    assert.strictEqual(code, 1);
    assert.match(stdout, /\[failed\]\s+python:/);
    assert.match(stdout, /Action:\s+Install Python >= 3\.12/);
    assert.match(stdout, /Result:.*failed/);
  });

  test("CLI doctor with invalid options or unexpected positional arguments exits 2 with usage error", async () => {
    const resBadFlag = await runCli(["doctor", "--bogus-flag"]);
    assert.strictEqual(resBadFlag.code, 2);
    const parsedBadFlag = JSON.parse(resBadFlag.stdout);
    assert.strictEqual(parsedBadFlag.status, "failed");
    assert.strictEqual(parsedBadFlag.error?.code, "usage_error");

    const resBadPos = await runCli(["doctor", "unexpected-positional"]);
    assert.strictEqual(resBadPos.code, 2);
    const parsedBadPos = JSON.parse(resBadPos.stdout);
    assert.strictEqual(parsedBadPos.status, "failed");
    assert.strictEqual(parsedBadPos.error?.code, "usage_error");
  });
});
