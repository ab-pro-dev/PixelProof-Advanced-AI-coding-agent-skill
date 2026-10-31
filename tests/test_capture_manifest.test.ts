import assert from "node:assert";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import test, { after, before, describe } from "node:test";
import { captureFromManifest } from "../src/browser/capture-manifest.js";

/**
 * Extract PNG dimensions from the 24-byte IHDR header without external dependencies.
 */
function getPngDimensions(filePath: string): { width: number; height: number } {
  const buffer = fs.readFileSync(filePath);
  assert.strictEqual(
    buffer.subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
    "File must start with PNG magic bytes"
  );
  assert.strictEqual(
    buffer.subarray(12, 16).toString("ascii"),
    "IHDR",
    "First chunk must be IHDR"
  );
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

describe("captureFromManifest", () => {
  let server: http.Server;
  let baseUrl: string;
  let tmpDir: string;
  let closedPort: number;
  let sampleProjectDir: string;

  before(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pixelproof-manifest-test-"));
    sampleProjectDir = path.resolve("examples/sample-project/references");

    // Start local HTTP server on random port serving different solid color routes
    server = http.createServer((req, res) => {
      if (req.url === "/not-found") {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<!DOCTYPE html><html><body><h1>404 Not Found</h1></body></html>");
        return;
      }

      if (req.url === "/dashboard") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!DOCTYPE html>
<html>
<head><style>body { margin: 0; background: rgb(0, 128, 0); width: 100vw; height: 100vh; }</style></head>
<body><div>Dashboard Page</div></body>
</html>`);
        return;
      }

      // Default route
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html>
<html>
<head><style>body { margin: 0; background: rgb(0, 0, 255); width: 100vw; height: 100vh; }</style></head>
<body><div>Landing Page</div></body>
</html>`);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const addr = server.address();
    assert(addr && typeof addr === "object");
    baseUrl = `http://127.0.0.1:${addr.port}`;

    // Discover unused closed port
    const dummyServer = http.createServer();
    await new Promise<void>((resolve) => {
      dummyServer.listen(0, "127.0.0.1", () => {
        const dAddr = dummyServer.address();
        assert(dAddr && typeof dAddr === "object");
        closedPort = dAddr.port;
        dummyServer.close(() => resolve());
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("manifest with 2 references captures both with matching dimensions", async () => {
    const fixtureDir = path.join(tmpDir, "fixture_valid");
    fs.mkdirSync(fixtureDir, { recursive: true });

    // Copy reference images from committed sample project
    fs.copyFileSync(
      path.join(sampleProjectDir, "landing.png"),
      path.join(fixtureDir, "landing.png")
    );
    fs.copyFileSync(
      path.join(sampleProjectDir, "dashboard.png"),
      path.join(fixtureDir, "dashboard.png")
    );

    const manifestData = {
      version: 1,
      project: {
        name: "test-valid",
        baseUrl,
      },
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

    const outDir = path.join(tmpDir, "out_valid");
    const result = await captureFromManifest({
      manifestPath,
      outputDir: outDir,
    });

    assert.strictEqual(result.status, "completed");
    if (result.status === "completed") {
      assert.strictEqual(result.total, 2);
      assert.strictEqual(result.captured, 2);
      assert.strictEqual(result.failed, 0);
      assert.strictEqual(result.results.length, 2);

      const landingRes = result.results.find((r) => r.referenceId === "landing");
      assert(landingRes && landingRes.status === "captured");
      assert(landingRes.outputPath && fs.existsSync(landingRes.outputPath));
      const landingDims = getPngDimensions(landingRes.outputPath);
      assert.strictEqual(landingDims.width, 100);
      assert.strictEqual(landingDims.height, 80);

      const dashRes = result.results.find((r) => r.referenceId === "dashboard");
      assert(dashRes && dashRes.status === "captured");
      assert(dashRes.outputPath && fs.existsSync(dashRes.outputPath));
      const dashDims = getPngDimensions(dashRes.outputPath);
      assert.strictEqual(dashDims.width, 200);
      assert.strictEqual(dashDims.height, 160);
    }
  });

  test("route returning HTTP 404 captures normally", async () => {
    const fixtureDir = path.join(tmpDir, "fixture_404");
    fs.mkdirSync(fixtureDir, { recursive: true });

    fs.copyFileSync(
      path.join(sampleProjectDir, "landing.png"),
      path.join(fixtureDir, "notfound.png")
    );

    const manifestData = {
      version: 1,
      project: {
        name: "test-404",
        baseUrl,
      },
      references: [
        {
          id: "notfound",
          route: "/not-found",
          captureType: "viewport",
          viewport: { width: 100, height: 80 },
          deviceScaleFactor: 1,
          image: "notfound.png",
        },
      ],
    };

    const manifestPath = path.join(fixtureDir, "references.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), "utf-8");

    const outDir = path.join(tmpDir, "out_404");
    const result = await captureFromManifest({
      manifestPath,
      outputDir: outDir,
    });

    assert.strictEqual(result.status, "completed");
    if (result.status === "completed") {
      assert.strictEqual(result.total, 1);
      assert.strictEqual(result.captured, 1);
      assert.strictEqual(result.failed, 0);
      const res = result.results[0];
      assert.strictEqual(res.status, "captured");
      assert(res.outputPath && fs.existsSync(res.outputPath));
    }
  });

  test("unreachable baseUrl makes all results failed/navigation_failed with completed status", async () => {
    const fixtureDir = path.join(tmpDir, "fixture_closed");
    fs.mkdirSync(fixtureDir, { recursive: true });

    fs.copyFileSync(
      path.join(sampleProjectDir, "landing.png"),
      path.join(fixtureDir, "landing.png")
    );

    const manifestData = {
      version: 1,
      project: {
        name: "test-closed",
        baseUrl: `http://127.0.0.1:${closedPort}`,
      },
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

    const outDir = path.join(tmpDir, "out_closed");
    const result = await captureFromManifest({
      manifestPath,
      outputDir: outDir,
    });

    assert.strictEqual(result.status, "completed");
    if (result.status === "completed") {
      assert.strictEqual(result.total, 1);
      assert.strictEqual(result.captured, 0);
      assert.strictEqual(result.failed, 1);
      assert.strictEqual(result.results[0].status, "failed");
      assert.strictEqual(result.results[0].error?.code, "navigation_failed");
    }
  });

  test("invalid manifest (wrong version) returns manifest_invalid and writes no files", async () => {
    const fixtureDir = path.join(tmpDir, "fixture_invalid");
    fs.mkdirSync(fixtureDir, { recursive: true });

    const manifestData = {
      version: 99, // invalid version
      references: [],
    };

    const manifestPath = path.join(fixtureDir, "references.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), "utf-8");

    const outDir = path.join(tmpDir, "out_invalid");
    const result = await captureFromManifest({
      manifestPath,
      outputDir: outDir,
    });

    assert.strictEqual(result.status, "failed");
    assert.strictEqual(result.error.code, "manifest_invalid");
    assert(Array.isArray((result as any).errors));
    assert(!fs.existsSync(path.join(outDir, "final")));
  });

  test("missing baseUrl everywhere returns base_url_missing", async () => {
    const fixtureDir = path.join(tmpDir, "fixture_nobase");
    fs.mkdirSync(fixtureDir, { recursive: true });

    fs.copyFileSync(
      path.join(sampleProjectDir, "landing.png"),
      path.join(fixtureDir, "landing.png")
    );

    const manifestData = {
      version: 1,
      project: {
        name: "test-nobase",
      },
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

    const outDir = path.join(tmpDir, "out_nobase");
    const result = await captureFromManifest({
      manifestPath,
      outputDir: outDir,
    });

    assert.strictEqual(result.status, "failed");
    assert.strictEqual(result.error.code, "base_url_missing");
  });

  test("baseUrl https://example.com returns url_not_allowed for all references", async () => {
    const fixtureDir = path.join(tmpDir, "fixture_ext");
    fs.mkdirSync(fixtureDir, { recursive: true });

    fs.copyFileSync(
      path.join(sampleProjectDir, "landing.png"),
      path.join(fixtureDir, "landing.png")
    );

    const manifestData = {
      version: 1,
      project: {
        name: "test-ext",
        baseUrl: "https://example.com",
      },
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

    const outDir = path.join(tmpDir, "out_ext");
    const start = performance.now();
    const result = await captureFromManifest({
      manifestPath,
      outputDir: outDir,
    });
    const duration = performance.now() - start;

    assert.strictEqual(result.status, "completed");
    if (result.status === "completed") {
      assert.strictEqual(result.total, 1);
      assert.strictEqual(result.captured, 0);
      assert.strictEqual(result.failed, 1);
      assert.strictEqual(result.results[0].status, "failed");
      assert.strictEqual(result.results[0].error?.code, "url_not_allowed");
      assert(duration < 500, `Expected fast return without browser launch, took ${duration}ms`);
      assert(!fs.existsSync(path.join(outDir, "final", "landing.png")));
    }
  });

  test("nonexistent python command returns validator_unavailable", async () => {
    const fixtureDir = path.join(tmpDir, "fixture_nopy");
    fs.mkdirSync(fixtureDir, { recursive: true });

    const manifestPath = path.join(fixtureDir, "references.json");
    fs.writeFileSync(manifestPath, JSON.stringify({ version: 1 }, null, 2), "utf-8");

    const outDir = path.join(tmpDir, "out_nopy");
    const result = await captureFromManifest({
      manifestPath,
      outputDir: outDir,
      pythonCommand: "nonexistent_python_binary_xyz_12345",
    });

    assert.strictEqual(result.status, "failed");
    assert.strictEqual(result.error.code, "validator_unavailable");
  });
});
