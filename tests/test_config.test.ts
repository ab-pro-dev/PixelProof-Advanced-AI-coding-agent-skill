import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { BUILTIN_DEFAULTS, loadConfig, validateConfig } from "../src/core/config.js";

const root = resolve(".");
const cli = join(root, "dist/src/cli/index.js");
function run(args: string[], cwd = root) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, PYTHONPATH: root },
  });
  return { code: result.status, doc: JSON.parse(result.stdout) };
}
test("built-in defaults exactly match config/default.json; missing file falls back", () => {
  assert.deepEqual(BUILTIN_DEFAULTS, JSON.parse(readFileSync("config/default.json", "utf8")));
  assert.deepEqual(loadConfig(join(mkdtempSync(join(tmpdir(), "pp-config-")), "absent")), loadConfig());
});
test("manual config checks match optional schema fields and reject wrong nested types", () => {
  for (const value of [{}, { extra: 1 }, { browser: {} }]) assert.doesNotThrow(() => validateConfig(value));
  for (const value of [null, [], { maxIterations: 0 }, { maxIterations: true },
    { browser: { timeoutMs: 1.5 } }, { browser: { waitUntil: "invalid" } },
    { browser: { engine: 1 } }, { comparison: { generateDiff: 1 } },
    { comparison: { thresholds: { maxHighSeverityIssues: -1 } } },
    { workflow: { verifyAffectedRoutes: null } }, { report: { format: [1] } }]) {
    assert.throws(() => validateConfig(value));
  }
});
test("invalid config returns failed JSON with config_invalid and hint", () => {
  const file = join(mkdtempSync(join(tmpdir(), "pp-config-")), "bad.json");
  for (const content of ['{"maxIterations":0}', '{']) {
    writeFileSync(file, content);
    const result = run(["iterate", "--config", file]);
    assert.equal(result.code, 1);
    assert.equal(result.doc.error.code, "config_invalid");
    assert.ok(result.doc.error.hint);
  }
});
test("iterate uses default config, explicit config, flag override and missing-file defaults", () => {
  const cwd = mkdtempSync(join(tmpdir(), "pp-config-"));
  mkdirSync(join(cwd, "config"));
  const file = join(cwd, "config/default.json");
  writeFileSync(file, JSON.stringify({ maxIterations: 2, browser: { waitUntil: "load", timeoutMs: 123 } }));
  assert.deepEqual(loadConfig(file).browser, { waitUntil: "load", timeoutMs: 123 });
  const base = ["iterate", "--manifest", join(root, "examples/sample-project/references/references.json"),
    "--actual-dir", join(root, "examples/sample-project/references"), "--overwrite"];
  for (const [name, flags, expected] of [
    ["default", [], 2],
    ["explicit", ["--config", file], 2],
    ["override", ["--config", file, "--max-iterations", "3"], 3],
    ["missing", ["--config", join(cwd, "absent")], 5],
  ] as [string, string[], number][]) {
    const out = join(cwd, name);
    for (let i = 1; i <= 2; i++) {
      const result = run([...base, "--out", out, ...flags], cwd);
      assert.equal(result.code, 0);
      assert.equal(result.doc.iterationsRemaining, expected - i);
      if (name === "explicit") console.log("config maxIterations=2: iteration " + i + ", iterationsRemaining=" + result.doc.iterationsRemaining);
    }
  }
});

test("capture defaults use configured wait strategy and timeout; CLI flags override both", async () => {
  const { createServer } = await import("node:http");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execute = promisify(execFile);
  const server = createServer((_req, res) => {
    setTimeout(() => { res.end("<html><body>capture config test</body></html>"); }, 250);
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const cwd = mkdtempSync(join(tmpdir(), "pp-capture-config-"));
  try {
    const address = server.address() as { port: number };
    const manifest = JSON.parse(readFileSync("examples/sample-project/references/references.json", "utf8"));
    for (const ref of manifest.references) copyFileSync(resolve("examples/sample-project/references", ref.image), join(cwd, ref.image));
    const file = join(cwd, "references.json");
    writeFileSync(file, JSON.stringify(manifest));
    const configFile = join(cwd, "settings.json");
    writeFileSync(configFile, JSON.stringify({ browser: { waitUntil: "networkidle", timeoutMs: 50 } }));
    const args = [cli, "capture", "--manifest", file, "--out", join(cwd, "captures"),
      "--base-url", "http://127.0.0.1:" + address.port, "--config", configFile, "--overwrite"];
    let failed: any;
    try { await execute(process.execPath, args); } catch (err: any) { failed = JSON.parse(err.stdout); }
    assert.ok(failed.failed > 0);
    assert.equal(failed.results[0].error.code, "timeout");
    const { stdout } = await execute(process.execPath, [...args, "--timeout-ms", "5000", "--wait-until", "load"]);
    const passed = JSON.parse(stdout);
    assert.equal(passed.failed, 0);
    assert.equal(passed.captured, manifest.references.length);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
