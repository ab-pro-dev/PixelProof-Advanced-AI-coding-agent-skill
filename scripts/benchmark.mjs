import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import * as fs from "node:fs";
import * as path from "node:path";
import { captureUrl } from "../dist/src/browser/capture.js";

const root = process.cwd();
const cli = path.join(root, "dist/src/cli/index.js");

function runCommand(args) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: root,
      env: { ...process.env, PYTHONPATH: root },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      const durationSec = (performance.now() - t0) / 1000;
      let json = null;
      try {
        json = JSON.parse(stdout);
      } catch {}
      resolve({ code, durationSec, stdout, stderr, json });
    });
    child.on("error", reject);
  });
}

async function main() {
  console.log("=== PixelProof Benchmark Runner ===");

  // Check 5173 (real-app)
  let realAppRunning = false;
  try {
    const res = await fetch("http://127.0.0.1:5173/");
    realAppRunning = res.ok;
  } catch {}

  console.log(`Site 1 (examples/real-app): ${realAppRunning ? "running on 5173" : "SKIPPED (dev server on 5173 not running)"}`);
  console.log(`Site 2 (examples/sample-project): SKIPPED (not served)`);
  console.log(`Site 3 (examples/plain-html): SERVING on 127.0.0.1:5174...`);

  // Start python server for plain-html
  const server = spawn("python3", ["-m", "http.server", "5174", "--bind", "127.0.0.1", "--directory", "examples/plain-html"], {
    cwd: root,
    stdio: "ignore",
  });
  await new Promise((r) => setTimeout(r, 1000));

  try {
    const manifestPath = "examples/plain-html/references/references.json";
    const refHome = "examples/plain-html/references/home-desktop.png";
    const refAbout = "examples/plain-html/references/about-desktop.png";

    // 1. Generate references
    console.log("Generating references via captureUrl...");
    await captureUrl({
      url: "http://127.0.0.1:5174/",
      outputPath: refHome,
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      overwrite: true,
    });
    await captureUrl({
      url: "http://127.0.0.1:5174/about",
      outputPath: refAbout,
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      overwrite: true,
    });

    const runBenchmarkChain = async (runNum) => {
      console.log(`\n--- Run ${runNum} ---`);
      const actualDir = `/tmp/bench-plain-html-actual-${runNum}`;
      const diffDir = `/tmp/bench-plain-html-diff-${runNum}`;
      const iterDir = `/tmp/bench-plain-html-iter-${runNum}`;

      // validate
      const valRes = await runCommand(["validate", "--manifest", manifestPath]);
      console.log(`validate: ${valRes.durationSec.toFixed(3)}s (code ${valRes.code})`);

      // capture
      const capRes = await runCommand(["capture", "--manifest", manifestPath, "--out", actualDir, "--overwrite"]);
      console.log(`capture: ${capRes.durationSec.toFixed(3)}s (captured ${capRes.json?.captured}/${capRes.json?.total})`);

      // compare home --regions
      const compHomeRes = await runCommand([
        "compare",
        "--id", "home-desktop",
        "--reference", refHome,
        "--actual", path.join(actualDir, "final/home-desktop.png"),
        "--out", path.join(diffDir, "home-desktop"),
        "--regions",
        "--overwrite",
      ]);
      console.log(`compare (home-desktop, --regions): ${compHomeRes.durationSec.toFixed(3)}s (diffPixels: ${compHomeRes.json?.differingPixels}, MAE: ${compHomeRes.json?.metrics?.mae})`);

      // compare about --regions
      const compAboutRes = await runCommand([
        "compare",
        "--id", "about-desktop",
        "--reference", refAbout,
        "--actual", path.join(actualDir, "final/about-desktop.png"),
        "--out", path.join(diffDir, "about-desktop"),
        "--regions",
        "--overwrite",
      ]);
      console.log(`compare (about-desktop, --regions): ${compAboutRes.durationSec.toFixed(3)}s (diffPixels: ${compAboutRes.json?.differingPixels}, MAE: ${compAboutRes.json?.metrics?.mae})`);

      // iterate
      const iterRes = await runCommand([
        "iterate",
        "--manifest", manifestPath,
        "--actual-dir", actualDir,
        "--out", iterDir,
        "--overwrite",
      ]);
      console.log(`iterate: ${iterRes.durationSec.toFixed(3)}s (iteration: ${iterRes.json?.iteration})`);

      return {
        validateSec: valRes.durationSec,
        captureSec: capRes.durationSec,
        compareHomeSec: compHomeRes.durationSec,
        compareAboutSec: compAboutRes.durationSec,
        iterateSec: iterRes.durationSec,
        homeDiffPixels: compHomeRes.json?.differingPixels,
        homeMae: compHomeRes.json?.metrics?.mae,
        aboutDiffPixels: compAboutRes.json?.differingPixels,
        aboutMae: compAboutRes.json?.metrics?.mae,
      };
    };

    const run1 = await runBenchmarkChain(1);
    const run2 = await runBenchmarkChain(2);

    console.log("\n=== Determinism Check ===");
    const homeDiffIdentical = run1.homeDiffPixels === run2.homeDiffPixels;
    const aboutDiffIdentical = run1.aboutDiffPixels === run2.aboutDiffPixels;
    const homeMaeIdentical = run1.homeMae === run2.homeMae;
    const aboutMaeIdentical = run1.aboutMae === run2.aboutMae;
    console.log(`home-desktop differingPixels identical: ${homeDiffIdentical} (${run1.homeDiffPixels} vs ${run2.homeDiffPixels})`);
    console.log(`about-desktop differingPixels identical: ${aboutDiffIdentical} (${run1.aboutDiffPixels} vs ${run2.aboutDiffPixels})`);
    console.log(`home-desktop MAE identical: ${homeMaeIdentical} (${run1.homeMae} vs ${run2.homeMae})`);
    console.log(`about-desktop MAE identical: ${aboutMaeIdentical} (${run1.aboutMae} vs ${run2.aboutMae})`);

    const summary = {
      site: "examples/plain-html",
      routes: ["/", "/about"],
      realAppSkipped: !realAppRunning,
      sampleProjectSkipped: true,
      run1,
      run2,
      deterministic: homeDiffIdentical && aboutDiffIdentical && homeMaeIdentical && aboutMaeIdentical,
    };
    fs.writeFileSync("/tmp/benchmark-summary.json", JSON.stringify(summary, null, 2));
  } finally {
    server.kill();
    // remove generated pngs so no pngs are committed
    try { fs.unlinkSync(path.join(root, refHome)); } catch {}
    try { fs.unlinkSync(path.join(root, refAbout)); } catch {}
    fs.rmSync("/tmp/bench-plain-html-actual-1", { recursive: true, force: true });
    fs.rmSync("/tmp/bench-plain-html-actual-2", { recursive: true, force: true });
    fs.rmSync("/tmp/bench-plain-html-diff-1", { recursive: true, force: true });
    fs.rmSync("/tmp/bench-plain-html-diff-2", { recursive: true, force: true });
    fs.rmSync("/tmp/bench-plain-html-iter-1", { recursive: true, force: true });
    fs.rmSync("/tmp/bench-plain-html-iter-2", { recursive: true, force: true });
  }
}

main().catch(console.error);
