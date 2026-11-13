import assert from "node:assert";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test, { describe, beforeEach, afterEach } from "node:test";
import {
  installForAntigravity,
  installForClaude,
  installForCursor,
  installSkill,
} from "../src/core/install-skill.js";

describe("install-skill tool", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pixelproof-test-install-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test("installForClaude creates CLAUDE.md with workflow snippet", () => {
    const res = installForClaude(tmpDir);
    assert.strictEqual(res.status, "installed");
    assert.ok(fs.existsSync(res.targetPath));

    const content = fs.readFileSync(res.targetPath, "utf8");
    assert.match(content, /PixelProof Visual Verification/);
    assert.match(content, /pixelproof compare/);
  });

  test("installForCursor creates .cursor/rules/pixelproof.mdc", () => {
    const res = installForCursor("# Fake Skill Content", tmpDir);
    assert.strictEqual(res.status, "installed");
    assert.ok(fs.existsSync(res.targetPath));

    const content = fs.readFileSync(res.targetPath, "utf8");
    assert.match(content, /description: PixelProof/);
    assert.match(content, /Fake Skill Content/);
  });

  test("installForAntigravity in local mode creates .gemini/skills/pixelproof/SKILL.md", () => {
    const res = installForAntigravity("# Antigravity Skill", false, tmpDir);
    assert.strictEqual(res.status, "installed");
    assert.ok(fs.existsSync(res.targetPath));

    const content = fs.readFileSync(res.targetPath, "utf8");
    assert.match(content, /Antigravity Skill/);
  });

  test("installSkill installs for all specified agents", () => {
    const results = installSkill({ agent: "all", projectDir: tmpDir, global: false });
    assert.strictEqual(results.length, 3);
    assert.ok(results.every((r) => r.status === "installed" || r.status === "updated"));
  });
});
