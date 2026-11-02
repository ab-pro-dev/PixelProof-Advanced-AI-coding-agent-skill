import assert from "node:assert";
import { execFile, spawn, execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test, { after, before, describe } from "node:test";
import { promisify } from "node:util";
import { setDefaultBrowserLauncher } from "../src/browser/capture.js";
import { chromium } from "playwright";

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

describe("TypeScript CLI wrappers (compare & report)", () => {
  let tmpDir: string;
  let imgIdentical1: string;
  let imgIdentical2: string;
  let imgMismatched: string;
  let validSummaryPath: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pixelproof-compare-report-test-"));
    imgIdentical1 = path.join(tmpDir, "img1.png");
    imgIdentical2 = path.join(tmpDir, "img2.png");
    imgMismatched = path.join(tmpDir, "img_mismatch.png");

    execSync(
      `python3 -c "from PIL import Image; Image.new('RGB', (10, 10), 'red').save('${imgIdentical1}'); Image.new('RGB', (10, 10), 'red').save('${imgIdentical2}'); Image.new('RGB', (10, 20), 'red').save('${imgMismatched}')"`
    );

    const summaryData = {
      project: { name: "test-report-cli" },
      references: [],
      checks: [
        { name: "test_check", state: "passed", detail: "Sample check detail" },
      ],
      iterations: 1,
      limitations: [],
    };
    validSummaryPath = path.join(tmpDir, "run_summary.json");
    fs.writeFileSync(validSummaryPath, JSON.stringify(summaryData, null, 2), "utf-8");
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("compare identical images exits 0 with status compared and mae 0", async () => {
    const outDir = path.join(tmpDir, "out_compare_identical");
    const { stdout, code } = await runCli([
      "compare",
      "--id",
      "test-identical",
      "--reference",
      imgIdentical1,
      "--actual",
      imgIdentical2,
      "--out",
      outDir,
    ]);

    assert.strictEqual(code, 0);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "compared");
    assert.strictEqual(parsed.metrics?.mae, 0);
  });

  test("compare mismatched sizes exits 1 with dimension_mismatch", async () => {
    const outDir = path.join(tmpDir, "out_compare_mismatch");
    const { stdout, code } = await runCli([
      "compare",
      "--id",
      "test-mismatch",
      "--reference",
      imgIdentical1,
      "--actual",
      imgMismatched,
      "--out",
      outDir,
    ]);

    assert.strictEqual(code, 1);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "failed");
    assert.strictEqual(parsed.error?.code, "dimension_mismatch");
  });

  test("report with a valid run_summary exits 0", async () => {
    const outDir = path.join(tmpDir, "out_report_valid");
    const { stdout, code } = await runCli([
      "report",
      "--summary",
      validSummaryPath,
      "--out",
      outDir,
    ]);

    assert.strictEqual(code, 0);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "written");
    assert(fs.existsSync(path.join(outDir, "reports", "report.json")));
    assert(fs.existsSync(path.join(outDir, "reports", "report.md")));
  });

  test("report again without --overwrite exits 1 with output_exists", async () => {
    const outDir = path.join(tmpDir, "out_report_valid");
    const { stdout, code } = await runCli([
      "report",
      "--summary",
      validSummaryPath,
      "--out",
      outDir,
    ]);

    assert.strictEqual(code, 1);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "failed");
    assert.strictEqual(parsed.error?.code, "output_exists");
  });

  test("compare with nonexistent --python exits 1 with compare_unavailable", async () => {
    const outDir = path.join(tmpDir, "out_compare_nopy");
    const { stdout, code } = await runCli([
      "compare",
      "--id",
      "test-nopy",
      "--reference",
      imgIdentical1,
      "--actual",
      imgIdentical2,
      "--out",
      outDir,
      "--python",
      "nonexistent_python_binary_xyz_12345",
    ]);

    assert.strictEqual(code, 1);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "failed");
    assert.strictEqual(parsed.error?.code, "compare_unavailable");
  });

  test("report with nonexistent --python exits 1 with report_unavailable", async () => {
    const outDir = path.join(tmpDir, "out_report_nopy");
    const { stdout, code } = await runCli([
      "report",
      "--summary",
      validSummaryPath,
      "--out",
      outDir,
      "--python",
      "nonexistent_python_binary_xyz_12345",
    ]);

    assert.strictEqual(code, 1);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "failed");
    assert.strictEqual(parsed.error?.code, "report_unavailable");
  });

  test("wrapper stdout byte-identical to Python CLI for compare", async () => {
    const outTs = path.join(tmpDir, "out_byte_ts");
    const outPy = path.join(tmpDir, "out_byte_py");

    const { stdout: tsStdout } = await runCli([
      "compare",
      "--id",
      "byte-compare",
      "--reference",
      imgIdentical1,
      "--actual",
      imgIdentical2,
      "--out",
      outTs,
    ]);

    const pyRes = await execFileAsync("python", [
      "-m",
      "pixelproof_image.cli",
      "compare",
      "--id",
      "byte-compare",
      "--reference",
      imgIdentical1,
      "--actual",
      imgIdentical2,
      "--out",
      outPy,
    ]);

    assert.strictEqual(tsStdout, pyRes.stdout);
  });

  test("wrapper stdout byte-identical to Python CLI for compare dimension_mismatch", async () => {
    const outTs = path.join(tmpDir, "out_byte_mismatch_ts");
    const outPy = path.join(tmpDir, "out_byte_mismatch_py");

    const { stdout: tsStdout, code: tsCode } = await runCli([
      "compare",
      "--id",
      "byte-mismatch",
      "--reference",
      imgIdentical1,
      "--actual",
      imgMismatched,
      "--out",
      outTs,
    ]);
    assert.strictEqual(tsCode, 1);

    let pyStdout = "";
    let pyCode = 0;
    try {
      const res = await execFileAsync("python", [
        "-m",
        "pixelproof_image.cli",
        "compare",
        "--id",
        "byte-mismatch",
        "--reference",
        imgIdentical1,
        "--actual",
        imgMismatched,
        "--out",
        outPy,
      ]);
      pyStdout = res.stdout;
    } catch (err: any) {
      pyStdout = err.stdout;
      pyCode = err.code;
    }
    assert.strictEqual(pyCode, 1);
    assert.strictEqual(tsStdout, pyStdout);
  });

  test("wrapper stdout byte-identical to Python CLI for compare --regions", async () => {
    const outTs = path.join(tmpDir, "out_byte_reg_ts");
    const outPy = path.join(tmpDir, "out_byte_reg_py");

    const { stdout: tsStdout, code: tsCode } = await runCli([
      "compare",
      "--id",
      "byte-reg",
      "--reference",
      imgIdentical1,
      "--actual",
      imgIdentical2,
      "--out",
      outTs,
      "--regions",
      "--grid",
      "2x2",
    ]);
    assert.strictEqual(tsCode, 0);

    const pyRes = await execFileAsync("python", [
      "-m",
      "pixelproof_image.cli",
      "compare",
      "--id",
      "byte-reg",
      "--reference",
      imgIdentical1,
      "--actual",
      imgIdentical2,
      "--out",
      outPy,
      "--regions",
      "--grid",
      "2x2",
    ]);

    assert.strictEqual(tsStdout, pyRes.stdout);
    const parsed = JSON.parse(tsStdout);
    assert(parsed.regions);
    assert.strictEqual(parsed.regions.grid.rows, 2);
    assert.strictEqual(parsed.regions.grid.cols, 2);
    assert.strictEqual(parsed.regions.items.length, 4);
    assert(Array.isArray(parsed.regions.ranking));
  });

  test("wrapper stdout byte-identical to Python CLI for compare --regions with differences and ranking", async () => {
    const outTs = path.join(tmpDir, "out_byte_reg_diff_ts");
    const outPy = path.join(tmpDir, "out_byte_reg_diff_py");

    const imgDiff1 = path.join(tmpDir, "img_diff1.png");
    const imgDiff2 = path.join(tmpDir, "img_diff2.png");
    execSync(
      `python3 -c "from PIL import Image; Image.new('RGB', (20, 20), 'red').save('${imgDiff1}'); img2 = Image.new('RGB', (20, 20), 'red'); img2.putpixel((0, 0), (0, 255, 0)); img2.save('${imgDiff2}')"`
    );

    const { stdout: tsStdout, code: tsCode } = await runCli([
      "compare",
      "--id",
      "byte-reg-diff",
      "--reference",
      imgDiff1,
      "--actual",
      imgDiff2,
      "--out",
      outTs,
      "--regions",
      "--grid",
      "2x2",
    ]);
    assert.strictEqual(tsCode, 0);

    const pyRes = await execFileAsync("python", [
      "-m",
      "pixelproof_image.cli",
      "compare",
      "--id",
      "byte-reg-diff",
      "--reference",
      imgDiff1,
      "--actual",
      imgDiff2,
      "--out",
      outPy,
      "--regions",
      "--grid",
      "2x2",
    ]);

    assert.strictEqual(tsStdout, pyRes.stdout);
    const parsed = JSON.parse(tsStdout);
    assert(parsed.regions);
    assert(Array.isArray(parsed.regions.ranking));
    assert.strictEqual(parsed.regions.ranking.length, 1);
    assert.strictEqual(parsed.regions.ranking[0].rank, 1);
    assert.strictEqual(parsed.regions.ranking[0].index, 0);
  });

  test("wrapper stdout byte-identical to Python CLI for compare --regions --weights", async () => {
    const outTs = path.join(tmpDir, "out_byte_reg_w_ts");
    const outPy = path.join(tmpDir, "out_byte_reg_w_py");
    const imgDiff1 = path.join(tmpDir, "img_diff_w1.png");
    const imgDiff2 = path.join(tmpDir, "img_diff_w2.png");
    execSync(
      `python3 -c "from PIL import Image; Image.new('RGB', (20, 20), 'red').save('${imgDiff1}'); img2 = Image.new('RGB', (20, 20), 'red'); img2.putpixel((0, 0), (0, 255, 0)); img2.save('${imgDiff2}')"`
    );
    const weightsPath = path.join(tmpDir, "test_weights.json");
    fs.writeFileSync(
      weightsPath,
      JSON.stringify({
        grid: { rows: 2, cols: 2 },
        weights: [
          [3.0, 1.0],
          [1.0, 1.0],
        ],
      })
    );

    const { stdout: tsStdout, code: tsCode } = await runCli([
      "compare",
      "--id",
      "byte-reg-w",
      "--reference",
      imgDiff1,
      "--actual",
      imgDiff2,
      "--out",
      outTs,
      "--regions",
      "--grid",
      "2x2",
      "--weights",
      weightsPath,
    ]);
    assert.strictEqual(tsCode, 0);

    const pyRes = await execFileAsync("python", [
      "-m",
      "pixelproof_image.cli",
      "compare",
      "--id",
      "byte-reg-w",
      "--reference",
      imgDiff1,
      "--actual",
      imgDiff2,
      "--out",
      outPy,
      "--regions",
      "--grid",
      "2x2",
      "--weights",
      weightsPath,
    ]);

    assert.strictEqual(tsStdout, pyRes.stdout);
    const parsed = JSON.parse(tsStdout);
    assert(parsed.regions);
    assert(parsed.regions.weighted);
    assert(Array.isArray(parsed.regions.weighted.ranking));
    assert.strictEqual(parsed.regions.weighted.ranking.length, 1);
    assert.strictEqual(parsed.regions.weighted.ranking[0].weight, 3.0);
  });

  test("wrapper compare with --weights without --regions exits 1 with weights_require_regions", async () => {
    const outTs = path.join(tmpDir, "out_bad_weights_req");
    const weightsPath = path.join(tmpDir, "dummy_weights.json");
    fs.writeFileSync(
      weightsPath,
      JSON.stringify({
        grid: { rows: 2, cols: 2 },
        weights: [
          [1.0, 1.0],
          [1.0, 1.0],
        ],
      })
    );
    const { stdout, code } = await runCli([
      "compare",
      "--id",
      "test-bad-weights-req",
      "--reference",
      imgIdentical1,
      "--actual",
      imgIdentical2,
      "--out",
      outTs,
      "--weights",
      weightsPath,
    ]);
    assert.strictEqual(code, 1);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "failed");
    assert.strictEqual(parsed.error?.code, "weights_require_regions");
  });

  test("wrapper compare with invalid --grid exits 1 with invalid_grid", async () => {
    const outTs = path.join(tmpDir, "out_bad_grid");
    const { stdout, code } = await runCli([
      "compare",
      "--id",
      "test-bad-grid",
      "--reference",
      imgIdentical1,
      "--actual",
      imgIdentical2,
      "--out",
      outTs,
      "--regions",
      "--grid",
      "0x4",
    ]);
    assert.strictEqual(code, 1);
    const parsed = JSON.parse(stdout);
    assert.strictEqual(parsed.status, "failed");
    assert.strictEqual(parsed.error?.code, "invalid_grid");
  });

  test("calling setDefaultBrowserLauncher with NODE_ENV unset throws", () => {
    const prev = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    try {
      assert.throws(
        () => setDefaultBrowserLauncher(async (opts) => chromium.launch(opts)),
        /restricted to test environments/
      );
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
