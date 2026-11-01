#!/usr/bin/env node
/**
 * Phase 2 end-to-end demonstration script for PixelProof.
 *
 * Connect-only demonstration:
 * Starts a local HTTP server serving two routes ("/" and "/dashboard"),
 * captures baseline references using the real capture CLI,
 * updates "/dashboard" to introduce a known 300-pixel difference,
 * executes the complete CLI toolchain (validate, capture, compare, report),
 * and verifies expected visual metrics and report outcome.
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";

const cliPath = path.resolve("dist/src/cli/index.js");

function runCli(args) {
  return new Promise((resolve) => {
    execFile(process.execPath, [cliPath, ...args], { shell: false }, (err, stdout, stderr) => {
      const code = err ? (typeof err.code === "number" ? err.code : 1) : 0;
      let parsed = null;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        // non-JSON stdout
      }
      resolve({ code, stdout, stderr, parsed });
    });
  });
}

async function main() {
  let dashboardSquareSize = 10;

  // Step 1.a: Start local HTTP server on random 127.0.0.1 port
  const server = http.createServer((req, res) => {
    if (req.url === "/dashboard") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background-color: #00ff00; }
    #square {
      position: absolute;
      top: 0;
      left: 0;
      width: ${dashboardSquareSize}px;
      height: ${dashboardSquareSize}px;
      background-color: #ff0000;
    }
  </style>
</head>
<body>
  <div id="square"></div>
</body>
</html>`);
      return;
    }

    // Default route: "/"
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background-color: #0000ff; }
  </style>
</head>
<body></body>
</html>`);
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pixelproof-demo2-"));
  const refsDir = path.join(tmpDir, "references");
  const baselineOutDir = path.join(tmpDir, "baseline_out");
  const actualsOutDir = path.join(tmpDir, "actuals_out");
  const compareOutDir = path.join(tmpDir, "out");

  fs.mkdirSync(refsDir, { recursive: true });

  try {
    // Bootstrap initial reference files with committed samples so loadManifest passes
    const sampleRefsDir = path.resolve("examples/sample-project/references");
    fs.copyFileSync(path.join(sampleRefsDir, "landing.png"), path.join(refsDir, "landing.png"));
    fs.copyFileSync(path.join(sampleRefsDir, "dashboard.png"), path.join(refsDir, "dashboard.png"));

    // Step 1.b: Generate reference PNGs by capturing baseline pages through real capture CLI
    const manifestData = {
      version: 1,
      project: {
        name: "demo-phase2",
        baseUrl,
      },
      references: [
        {
          id: "landing",
          route: "/",
          captureType: "viewport",
          viewport: { width: 100, height: 80 },
          deviceScaleFactor: 1,
          image: "references/landing.png",
        },
        {
          id: "dashboard",
          route: "/dashboard",
          captureType: "viewport",
          viewport: { width: 200, height: 160 },
          deviceScaleFactor: 1,
          image: "references/dashboard.png",
        },
      ],
    };
    const manifestPath = path.join(tmpDir, "references.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), "utf-8");

    const pBaseline = await runCli([
      "capture",
      "--manifest",
      manifestPath,
      "--out",
      baselineOutDir,
    ]);
    if (pBaseline.code !== 0 || pBaseline.parsed?.status !== "completed") {
      console.error("Baseline capture failed:", pBaseline.stdout || pBaseline.stderr);
      process.exitCode = 1;
      return;
    }

    // Replace bootstrap files with real captured baseline PNGs
    fs.copyFileSync(path.join(baselineOutDir, "final", "landing.png"), path.join(refsDir, "landing.png"));
    fs.copyFileSync(path.join(baselineOutDir, "final", "dashboard.png"), path.join(refsDir, "dashboard.png"));

    // Step 1.c: Change server so /dashboard serves 20x20 square (a known 300-pixel difference)
    dashboardSquareSize = 20;

    // Run the real chain: validate, capture, compare x2, report
    // 1. validate
    const pVal = await runCli(["validate", "--manifest", manifestPath]);
    const valData = pVal.parsed || {};
    console.log(`validate: exit ${pVal.code}, status=${valData.status}, references=${valData.referenceCount}`);

    // 2. capture
    const pCap = await runCli([
      "capture",
      "--manifest",
      manifestPath,
      "--out",
      actualsOutDir,
    ]);
    const capData = pCap.parsed || {};
    console.log(`capture: exit ${pCap.code}, status=${capData.status}, captured=${capData.captured}, failed=${capData.failed}`);

    // 3. compare per reference (ids from manifest, not retyped)
    const compResults = {};
    const compCodes = [];
    for (const ref of manifestData.references) {
      const refId = ref.id;
      const refPath = path.join(tmpDir, ref.image);
      const actualPath = path.join(actualsOutDir, "final", `${refId}.png`);

      const pComp = await runCli([
        "compare",
        "--id",
        refId,
        "--reference",
        refPath,
        "--actual",
        actualPath,
        "--out",
        compareOutDir,
      ]);
      const compData = pComp.parsed || {};
      compResults[refId] = compData;
      compCodes.push(pComp.code);

      console.log(
        `compare (${refId}): exit ${pComp.code}, status=${compData.status}, mae=${compData.metrics?.mae}, differingPixels=${compData.differingPixels}`
      );
    }

    // 4. build run_summary.json
    const valState = pVal.code === 0 ? "passed" : "failed";
    const capState = pCap.code === 0 ? "passed" : "failed";
    const compState = compCodes.every((c) => c === 0) ? "passed" : "failed";

    const runSummary = {
      project: { name: manifestData.project?.name || "demo-phase2" },
      references: manifestData.references.map((ref) => compResults[ref.id]),
      checks: [
        {"name": "manifest-validation", "state": valState, "detail": "Manifest validated"},
        {"name": "browser-capture", "state": capState, "detail": "Browser captures completed"},
        {"name": "image-comparison", "state": compState, "detail": "Image comparison completed"},
      ],
      iterations: 1,
      limitations: [],
      observations: ["Landing reference identical; dashboard has 300 differing pixels"],
    };

    const summaryPath = path.join(tmpDir, "run_summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(runSummary, null, 2), "utf-8");

    // 5. report
    const pRep = await runCli([
      "report",
      "--summary",
      summaryPath,
      "--out",
      compareOutDir,
    ]);
    const repData = pRep.parsed || {};

    const reportJsonPath = path.join(compareOutDir, "reports", "report.json");
    const reportMdPath = path.join(compareOutDir, "reports", "report.md");

    let overallStatus = "UNKNOWN";
    if (fs.existsSync(reportJsonPath)) {
      try {
        const reportContent = JSON.parse(fs.readFileSync(reportJsonPath, "utf-8"));
        overallStatus = reportContent.overall || "UNKNOWN";
      } catch {
        // unparseable
      }
    }

    console.log(`report: exit ${pRep.code}, status=${repData.status}, overall=${overallStatus}`);

    // Step 2 assertions
    const reportWritten =
      pRep.code === 0 &&
      repData.status === "written" &&
      fs.existsSync(reportJsonPath) &&
      fs.existsSync(reportMdPath);

    const landing = compResults["landing"];
    const dashboard = compResults["dashboard"];

    const landingOk = landing?.metrics?.mae === 0 && landing?.differingPixels === 0;
    const dashboardOk =
      dashboard?.differingPixels === 300 &&
      typeof dashboard?.metrics?.mae === "number" &&
      dashboard?.metrics?.mae > 0;
    const overallOk = overallStatus === "OVERALL: COMPLETE (tool execution only, visual quality not judged)";

    if (!landingOk) {
      console.error("Assertion failed: landing mae == 0 and differingPixels == 0");
      process.exitCode = 1;
    } else if (!dashboardOk) {
      console.error("Assertion failed: dashboard differingPixels == 300 and mae > 0");
      process.exitCode = 1;
    } else if (!overallOk) {
      console.error(`Assertion failed: expected OVERALL: COMPLETE..., got ${overallStatus}`);
      process.exitCode = 1;
    } else if (!reportWritten) {
      console.error("Assertion failed: report was not written");
      process.exitCode = 1;
    } else {
      process.exitCode = 0;
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // cleanup error ignored
    }
  }
}

main().catch((err) => {
  console.error("Unexpected failure:", err);
  process.exit(1);
});
