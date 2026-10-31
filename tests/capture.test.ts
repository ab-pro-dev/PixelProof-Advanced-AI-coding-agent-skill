import assert from "node:assert";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import test, { after, before, describe } from "node:test";
import { captureUrl } from "../src/browser/capture.js";

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

describe("Browser capture (Playwright)", () => {
  let server: http.Server;
  let baseUrl: string;
  let tmpDir: string;
  let closedPort: number;

  before(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pixelproof-capture-test-"));

    // 1. Start local HTTP server on random available port
    server = http.createServer((_req, res) => {
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
    const result = await captureUrl({
      url: "https://example.com",
      outputPath: outPath,
      viewport: { width: 100, height: 100 },
    });

    assert.strictEqual(result.status, "failed");
    assert.strictEqual(result.error.code, "url_not_allowed");
    assert.match(result.error.message, /Host 'example\.com' is not allowed by default/);
    assert(!fs.existsSync(outPath));
  });

  test("file:///etc/passwd returns url_not_allowed even with allowExternal:true", async () => {
    const outPath = path.join(tmpDir, "file_passwd.png");
    const result = await captureUrl({
      url: "file:///etc/passwd",
      outputPath: outPath,
      viewport: { width: 100, height: 100 },
      allowExternal: true,
    });

    assert.strictEqual(result.status, "failed");
    assert.strictEqual(result.error.code, "url_not_allowed");
    assert.match(result.error.message, /Scheme 'file:' is not allowed/);
    assert(!fs.existsSync(outPath));
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
});
