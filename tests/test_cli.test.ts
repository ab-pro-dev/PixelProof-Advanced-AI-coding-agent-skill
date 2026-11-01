import assert from "node:assert";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import test, { after, before, describe } from "node:test";

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

describe("TypeScript CLI (pixelproof)", () => {
  let server: http.Server;
  let baseUrl: string;
  let tmpDir: string;
  let closedPort: number;
  let sampleProjectDir: string;

  before(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pixelproof-cli-test-"));
    sampleProjectDir = path.resolve("examples/sample-project/references");

    server = http.createServer((req, res) => {
      if (req.url === "/dashboard") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<!DOCTYPE html><html><body style='margin:0;background:green;'>Dashboard</body></html>");
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<!DOCTYPE html><html><body style='margin:0;background:blue;'>Landing</body></html>");
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const addr = server.address();
    assert(addr && typeof addr === "object");
    baseUrl = `http://127.0.0.1:${addr.port}`;

    const dummy = http.createServer();
    await new Promise<void>((resolve) => {
      dummy.listen(0, "127.0.0.1", () => {
        const dAddr = dummy.address();
        assert(dAddr && typeof dAddr === "object");
        closedPort = dAddr.port;
        dummy.close(() => resolve());
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("success run exits 0, produces parseable stdout JSON and screenshot files", async () => {
    const fixtureDir = path.join(tmpDir, "fixture_success");
    fs.mkdirSync(fixtureDir, { recursive: true });

    fs.copyFileSync(path.join(sampleProjectDir, "landing.png"), path.join(fixtureDir, "landing.png"));
    fs.copyFileSync(path.join(sampleProjectDir, "dashboard.png"), path.join(fixtureDir, "dashboard.png"));

    const manifestData = {
      version: 1,
      project: { name: "cli-success", baseUrl },
      references: [
        {
          id: "landing",
          route: "/",
          captureType: "viewport",
          viewport: { width: 100, height: 80 },
          deviceScaleFactor: 1,
          image: "landing.png",
        },
        {
          id: "dashboard",
          route: "/dashboard",
          captureType: "viewport",
          viewport: { width: 200, height: 160 },
          deviceScaleFactor: 1,
          image: "dashboard.png",
        },
      ],
    };

    const manifestPath = path.join(fixtureDir, "references.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), "utf-8");

    const outDir = path.join(tmpDir, "out_success");
    const { stdout, code } = await runCli(["capture", "--manifest", manifestPath, "--out", outDir]);

    assert.strictEqual(code, 0);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "completed");
    assert.strictEqual(parsed.total, 2);
    assert.strictEqual(parsed.captured, 2);
    assert.strictEqual(parsed.failed, 0);

    assert(fs.existsSync(path.join(outDir, "final", "landing.png")));
    assert(fs.existsSync(path.join(outDir, "final", "dashboard.png")));
  });

  test("unreachable base-url exits 1 with failed===total in JSON", async () => {
    const fixtureDir = path.join(tmpDir, "fixture_unreachable");
    fs.mkdirSync(fixtureDir, { recursive: true });

    fs.copyFileSync(path.join(sampleProjectDir, "landing.png"), path.join(fixtureDir, "landing.png"));

    const manifestData = {
      version: 1,
      project: { name: "cli-unreachable", baseUrl: `http://127.0.0.1:${closedPort}` },
      references: [
        {
          id: "landing",
          route: "/",
          captureType: "viewport",
          viewport: { width: 100, height: 80 },
          deviceScaleFactor: 1,
          image: "landing.png",
        },
      ],
    };

    const manifestPath = path.join(fixtureDir, "references.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), "utf-8");

    const outDir = path.join(tmpDir, "out_unreachable");
    const { stdout, code } = await runCli(["capture", "--manifest", manifestPath, "--out", outDir]);

    assert.strictEqual(code, 1);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "completed");
    assert.strictEqual(parsed.total, 1);
    assert.strictEqual(parsed.captured, 0);
    assert.strictEqual(parsed.failed, 1);
    assert.strictEqual(parsed.failed, parsed.total);
    assert.strictEqual(parsed.results[0].status, "failed");
    assert.strictEqual(parsed.results[0].error?.code, "navigation_failed");
  });

  test("missing --manifest exits 2 with usage_error JSON", async () => {
    const outDir = path.join(tmpDir, "out_missing_manifest");
    const { stdout, code } = await runCli(["capture", "--out", outDir]);

    assert.strictEqual(code, 2);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "failed");
    assert.strictEqual(parsed.error.code, "usage_error");
    assert.match(parsed.error.message, /Missing required flag: --manifest/);
  });

  test("unknown command exits 2 with usage_error JSON", async () => {
    const { stdout, code } = await runCli(["unknown-command"]);

    assert.strictEqual(code, 2);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "failed");
    assert.strictEqual(parsed.error.code, "usage_error");
    assert.match(parsed.error.message, /Unknown command/);
  });

  test("bogus --wait-until value exits 2 with usage_error JSON", async () => {
    const outDir = path.join(tmpDir, "out_bogus_wait");
    const { stdout, code } = await runCli([
      "capture",
      "--manifest",
      "some/path.json",
      "--out",
      outDir,
      "--wait-until",
      "bogus",
    ]);

    assert.strictEqual(code, 2);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "failed");
    assert.strictEqual(parsed.error.code, "usage_error");
    assert.match(parsed.error.message, /Invalid --wait-until value: 'bogus'/);
  });

  test("--help flag exits 0 with usage text", async () => {
    const rootHelp = await runCli(["--help"]);
    assert.strictEqual(rootHelp.code, 0);
    assert.match(rootHelp.stdout, /Usage:/);
    assert.match(rootHelp.stdout, /capture/);

    const captureHelp = await runCli(["capture", "--help"]);
    assert.strictEqual(captureHelp.code, 0);
    assert.match(captureHelp.stdout, /--manifest/);
    assert.match(captureHelp.stdout, /--out/);
    assert.match(captureHelp.stdout, /--base-url/);
  });

  test("existing output without --overwrite exits 1 and preserves original file", async () => {
    const fixtureDir = path.join(tmpDir, "fixture_no_overwrite");
    fs.mkdirSync(fixtureDir, { recursive: true });

    fs.copyFileSync(path.join(sampleProjectDir, "landing.png"), path.join(fixtureDir, "landing.png"));

    const manifestData = {
      version: 1,
      project: { name: "cli-no-overwrite", baseUrl },
      references: [
        {
          id: "landing",
          route: "/",
          captureType: "viewport",
          viewport: { width: 100, height: 80 },
          deviceScaleFactor: 1,
          image: "landing.png",
        },
      ],
    };

    const manifestPath = path.join(fixtureDir, "references.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), "utf-8");

    const outDir = path.join(tmpDir, "out_no_overwrite");
    const finalDir = path.join(outDir, "final");
    fs.mkdirSync(finalDir, { recursive: true });
    const targetFile = path.join(finalDir, "landing.png");
    const originalContent = "ORIGINAL_UNTOUCHED_CONTENT";
    fs.writeFileSync(targetFile, originalContent, "utf-8");

    const { stdout, code } = await runCli(["capture", "--manifest", manifestPath, "--out", outDir]);

    assert.strictEqual(code, 1);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "completed");
    assert.strictEqual(parsed.failed, 1);
    assert.strictEqual(parsed.results[0].status, "failed");
    assert.strictEqual(parsed.results[0].error?.code, "output_exists");

    // Assert original file content is completely preserved
    assert.strictEqual(fs.readFileSync(targetFile, "utf-8"), originalContent);
  });
});
