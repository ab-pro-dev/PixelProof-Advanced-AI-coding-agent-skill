import assert from "node:assert/strict";
import { test } from "node:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const cli = path.resolve("dist/src/cli/index.js");
const root = process.cwd();
const temporary = () => fs.mkdtempSync(path.join(tmpdir(), "pixelproof-init-"));
function run(args: string[], cwd = root) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, PYTHONPATH: root },
  });
  assert.equal(result.error, undefined);
  return { code: result.status, doc: JSON.parse(result.stdout) };
}
test("init creates starter files in cwd and real validate reports image_missing", () => {
  const dir = temporary();
  const result = run(["init"], dir);
  assert.equal(result.code, 0);
  assert.equal(result.doc.status, "created");
  assert.deepEqual(result.doc.createdFiles, ["references.json", "references/.gitkeep", "pixelproof.config.json"]);
  assert.match(result.doc.hint, /image_missing/);
  assert.deepEqual(fs.readdirSync(path.join(dir, "references")), [".gitkeep"]);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "references.json"), "utf8"));
  assert.equal(manifest.version, 1);
  assert.equal(manifest.project.baseUrl, "http://127.0.0.1:3000");
  assert.deepEqual(manifest.references, [{
    id: "home-desktop", route: "/", viewport: { width: 1280, height: 720 },
    captureType: "viewport", image: "references/home-desktop.png",
  }]);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "pixelproof.config.json"), "utf8")),
    JSON.parse(fs.readFileSync("config/default.json", "utf8")));
  const validated = run(["validate", "--manifest", path.join(dir, "references.json")]);
  assert.equal(validated.code, 1);
  assert.equal(validated.doc.status, "invalid");
  assert.deepEqual(validated.doc.errors.map((e: any) => e.code), ["image_missing"]);
});
test("init refuses second run without changing files; overwrite recreates starters", () => {
  const dir = path.join(temporary(), "nested", "project");
  assert.equal(run(["init", "--dir", dir]).code, 0);
  fs.writeFileSync(path.join(dir, "references.json"), "owner content");
  const refused = run(["init", "--dir", dir]);
  assert.equal(refused.code, 1);
  assert.equal(refused.doc.status, "failed");
  assert.equal(refused.doc.error.code, "output_exists");
  assert.ok(refused.doc.error.hint);
  assert.equal(fs.readFileSync(path.join(dir, "references.json"), "utf8"), "owner content");
  assert.equal(run(["init", "--dir", dir, "--overwrite"]).code, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, "references.json"), "utf8")).version, 1);
});
test("init rejects symlink path escapes with and without overwrite before writing", () => {
  for (const name of ["references", "references.json", "pixelproof.config.json", "references/.gitkeep"]) {
    for (const flags of [[], ["--overwrite"]]) {
      const dir = temporary();
      const outside = temporary();
      if (name.includes("/")) fs.mkdirSync(path.join(dir, "references"));
      fs.symlinkSync(name === "references" ? outside : path.join(outside, "untouched"), path.join(dir, name));
      const result = run(["init", "--dir", dir, ...flags]);
      assert.equal(result.code, 1);
      assert.equal(result.doc.error.code, "path_escape");
      assert.ok(result.doc.error.hint);
      assert.deepEqual(fs.readdirSync(outside), []);
      assert.ok(fs.lstatSync(path.join(dir, name)).isSymbolicLink());
    }
  }
});
test("init preflights all files and does not follow hard links on overwrite", () => {
  const dir = temporary();
  const outside = path.join(temporary(), "owner.json");
  fs.writeFileSync(outside, "keep");
  fs.linkSync(outside, path.join(dir, "pixelproof.config.json"));
  assert.equal(run(["init", "--dir", dir]).doc.error.code, "output_exists");
  assert.equal(fs.existsSync(path.join(dir, "references.json")), false);
  assert.equal(run(["init", "--dir", dir, "--overwrite"]).code, 0);
  assert.equal(fs.readFileSync(outside, "utf8"), "keep");
});
