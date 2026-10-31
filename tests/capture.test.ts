import assert from "node:assert";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import test, { after, before, describe } from "node:test";
import { captureUrl, type BrowserLauncher } from "../src/browser/capture.js";
import { chromium } from "playwright";

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

function computeSha256(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

describe("Browser capture (Playwright)", () => {
  let server: http.Server;
  let baseUrl: string;
  let tmpDir: string;
  let closedPort: number;

  before(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pixelproof-capture-test-"));

    // 1. Start local HTTP server on random available port with multiple test routes
    server = http.createServer((req, res) => {
      if (req.url === "/animated") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #ffffff; }
    @keyframes moveBox {
      from { transform: translateX(0px); }
      to { transform: translateX(200px); }
    }
    .moving {
      width: 50px;
      height: 50px;
      background: #ff0000;
      animation: moveBox 0.5s linear infinite;
    }
  </style>
</head>
<body><div class="moving"></div></body>
</html>`);
        return;
      }

      if (req.url === "/delayed-ready") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!DOCTYPE html>
<html>
<head><style>body { margin: 0; background: #228b22; width: 100vw; height: 100vh; }</style></head>
<body>
  <div id="loading">Loading...</div>
  <script>
    setTimeout(() => {
      const el = document.createElement("div");
      el.id = "ready";
      el.textContent = "App is ready";
      document.body.appendChild(el);
    }, 400);
  </script>
</body>
</html>`);
        return;
      }

      // Default route
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html>
<html>
<head><style>body { margin: 0; background: rgb(34, 139, 34); width: 100vw; height: 100vh; }</style></head>
<body><div id="content">PixelProof Test Page</div></body>
</html>`);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const addr = server.address();
    assert(addr && typeof addr === "object");
    baseUrl = `http://127.0.0.1:${addr.port}`;

    // 2. Discover an unused closed port by starting and immediately stopping a server
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

  test("viewport 400x300 DSF 1 produces exact 400x300 pixel PNG", async () => {
    const outPath = path.join(tmpDir, "shot_400x300_dsf1.png");
    const result = await captureUrl({
      url: `${baseUrl}/`,
      outputPath: outPath,
      viewport: { width: 400, height: 300 },
      deviceScaleFactor: 1,
    });

    assert.strictEqual(result.status, "captured");
    assert.strictEqual(result.outputPath, outPath);
    assert.strictEqual(result.deviceScaleFactor, 1);
    assert.deepStrictEqual(result.viewport, { width: 400, height: 300 });
    assert(typeof result.timestamp === "string");
    assert(Array.isArray(result.consoleErrors));

    assert(fs.existsSync(outPath));
    const dims = getPngDimensions(outPath);
    assert.strictEqual(dims.width, 400);
    assert.strictEqual(dims.height, 300);
  });

  test("viewport 200x150 DSF 2 produces exact 400x300 pixel PNG", async () => {
    const outPath = path.join(tmpDir, "shot_200x150_dsf2.png");
    const result = await captureUrl({
      url: `${baseUrl}/`,
      outputPath: outPath,
      viewport: { width: 200, height: 150 },
      deviceScaleFactor: 2,
    });

    assert.strictEqual(result.status, "captured");
    assert.strictEqual(result.deviceScaleFactor, 2);
    assert.deepStrictEqual(result.viewport, { width: 200, height: 150 });

    assert(fs.existsSync(outPath));
    const dims = getPngDimensions(outPath);
    assert.strictEqual(dims.width, 400);
    assert.strictEqual(dims.height, 300);
  });

  test("closed port returns failed / navigation_failed", async () => {
    const outPath = path.join(tmpDir, "closed_port.png");
    const result = await captureUrl({
      url: `http://127.0.0.1:${closedPort}/`,
      outputPath: outPath,
      viewport: { width: 100, height: 100 },
    });

    assert.strictEqual(result.status, "failed");
    assert.strictEqual(result.error.code, "navigation_failed");
    assert(typeof result.error.message === "string");
    assert(!fs.existsSync(outPath));
  });

  test("https://example.com returns url_not_allowed without launching browser", async () => {
    const outPath = path.join(tmpDir, "example_com.png");
    let launchCount = 0;
    const spyLauncher: BrowserLauncher = async (opts) => {
      launchCount++;
      return chromium.launch(opts);
    };

    const result = await captureUrl({
      url: "https://example.com",
      outputPath: outPath,
      viewport: { width: 100, height: 100 },
      launcher: spyLauncher,
    });

    assert.strictEqual(result.status, "failed");
    assert.strictEqual(result.error.code, "url_not_allowed");
    assert.match(result.error.message, /Host 'example\.com' is not allowed by default/);
    assert(!fs.existsSync(outPath));
    assert.strictEqual(launchCount, 0);
  });

  test("file:///etc/passwd returns url_not_allowed even with allowExternal:true", async () => {
    const outPath = path.join(tmpDir, "file_passwd.png");
    let launchCount = 0;
    const spyLauncher: BrowserLauncher = async (opts) => {
      launchCount++;
      return chromium.launch(opts);
    };

    const result = await captureUrl({
      url: "file:///etc/passwd",
      outputPath: outPath,
      viewport: { width: 100, height: 100 },
      allowExternal: true,
      launcher: spyLauncher,
    });

    assert.strictEqual(result.status, "failed");
    assert.strictEqual(result.error.code, "url_not_allowed");
    assert.match(result.error.message, /Scheme 'file:' is not allowed/);
    assert(!fs.existsSync(outPath));
    assert.strictEqual(launchCount, 0);
  });

  test("existing output without overwrite returns output_exists and preserves file", async () => {
    const outPath = path.join(tmpDir, "existing_file.png");
    const initialContent = "EXISTING_RAW_DATA_PRESERVED";
    fs.writeFileSync(outPath, initialContent, "utf-8");

    const result = await captureUrl({
      url: `${baseUrl}/`,
      outputPath: outPath,
      viewport: { width: 100, height: 100 },
      overwrite: false,
    });

    assert.strictEqual(result.status, "failed");
    assert.strictEqual(result.error.code, "output_exists");
    assert.match(result.error.message, /already exists/);

    // Verify existing file was not modified
    assert.strictEqual(fs.readFileSync(outPath, "utf-8"), initialContent);
  });

  test("infinite CSS animation captures produce byte-identical PNGs with default settings", async () => {
    const outPath1 = path.join(tmpDir, "anim_capture_1.png");
    const outPath2 = path.join(tmpDir, "anim_capture_2.png");

    const res1 = await captureUrl({
      url: `${baseUrl}/animated`,
      outputPath: outPath1,
      viewport: { width: 300, height: 200 },
    });
    assert.strictEqual(res1.status, "captured");

    // Wait 250ms to allow CSS animation timeline to progress if animations were running
    await new Promise((r) => setTimeout(r, 250));

    const res2 = await captureUrl({
      url: `${baseUrl}/animated`,
      outputPath: outPath2,
      viewport: { width: 300, height: 200 },
    });
    assert.strictEqual(res2.status, "captured");

    const sha1 = computeSha256(outPath1);
    const sha2 = computeSha256(outPath2);
    assert.strictEqual(sha1, sha2, "Screenshots of animated page must be byte-identical when animations are disabled");
  });

  test("delayed element with readySelector succeeds with readyAfterMs >= 250 and browserVersion", async () => {
    const outPath = path.join(tmpDir, "delayed_ready.png");
    const result = await captureUrl({
      url: `${baseUrl}/delayed-ready`,
      outputPath: outPath,
      viewport: { width: 300, height: 200 },
      readySelector: "#ready",
    });

    assert.strictEqual(result.status, "captured");
    assert(result.readyAfterMs >= 250, `Expected readyAfterMs >= 250, got ${result.readyAfterMs}`);
    assert(typeof result.browserVersion === "string" && result.browserVersion.length > 0);
    assert.strictEqual(result.platform, process.platform);
    assert.strictEqual(result.waitUntil, "load");
    assert(fs.existsSync(outPath));
  });

  test("non-existent readySelector with timeoutMs 1500 returns readiness_timeout", async () => {
    const outPath = path.join(tmpDir, "non_existent_ready.png");
    const start = performance.now();
    const result = await captureUrl({
      url: `${baseUrl}/delayed-ready`,
      outputPath: outPath,
      viewport: { width: 300, height: 200 },
      readySelector: "#does-not-exist",
      timeoutMs: 1500,
    });
    const elapsed = performance.now() - start;

    assert.strictEqual(result.status, "failed");
    assert.strictEqual(result.error.code, "readiness_timeout");
    assert(elapsed >= 1400, `Expected elapsed >= 1400ms, took ${elapsed}ms`);
    assert(!fs.existsSync(outPath));
  });

  test("waitUntil networkidle is accepted explicitly and invalid waitUntil returns invalid_option", async () => {
    // 1. Explicit networkidle succeeds
    const outIdle = path.join(tmpDir, "networkidle_ok.png");
    const resIdle = await captureUrl({
      url: `${baseUrl}/`,
      outputPath: outIdle,
      viewport: { width: 200, height: 150 },
      waitUntil: "networkidle",
    });
    assert.strictEqual(resIdle.status, "captured");
    assert.strictEqual(resIdle.waitUntil, "networkidle");
    assert(fs.existsSync(outIdle));

    // 2. Invalid waitUntil fails before launching browser with invalid_option
    const outInvalid = path.join(tmpDir, "invalid_wait.png");
    let launchCount = 0;
    const spyLauncher: BrowserLauncher = async (opts) => {
      launchCount++;
      return chromium.launch(opts);
    };

    const resInvalid = await captureUrl({
      url: `${baseUrl}/`,
      outputPath: outInvalid,
      viewport: { width: 200, height: 150 },
      waitUntil: "invalid_strategy" as any,
      launcher: spyLauncher,
    });

    assert.strictEqual(resInvalid.status, "failed");
    assert.strictEqual(resInvalid.error.code, "invalid_option");
    assert.match(resInvalid.error.message, /Invalid waitUntil option: 'invalid_strategy'/);
    assert(!fs.existsSync(outInvalid));
    assert.strictEqual(launchCount, 0);
  });

  test("positive control: normal localhost capture with spy launcher gives launchCount === 1", async () => {
    const outPath = path.join(tmpDir, "positive_control.png");
    let launchCount = 0;
    const spyLauncher: BrowserLauncher = async (opts) => {
      launchCount++;
      return chromium.launch(opts);
    };

    const result = await captureUrl({
      url: `${baseUrl}/`,
      outputPath: outPath,
      viewport: { width: 200, height: 150 },
      launcher: spyLauncher,
    });

    assert.strictEqual(result.status, "captured");
    assert.strictEqual(launchCount, 1);
    assert(fs.existsSync(outPath));
  });
});
