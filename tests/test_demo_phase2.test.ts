import assert from "node:assert";
import { execFile } from "node:child_process";
import * as path from "node:path";
import test, { describe } from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

describe("Phase 2 end-to-end demo script", () => {
  test("runs demo_phase2.mjs to completion and reports 300 differing pixels for dashboard", async () => {
    const scriptPath = path.resolve("scripts/demo_phase2.mjs");
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath], {
      timeout: 30000,
    });

    assert.match(
      stdout,
      /compare \(dashboard\): exit 0, .*differingPixels=300/,
      "Output must report dashboard differingPixels=300"
    );
    assert.match(
      stdout,
      /compare \(landing\): exit 0, .*differingPixels=0/,
      "Output must report landing differingPixels=0"
    );
    assert.match(
      stdout,
      /report: exit 0, .*OVERALL: COMPLETE \(tool execution only, visual quality not judged\)/,
      "Output must report overall complete banner"
    );
  });
});
