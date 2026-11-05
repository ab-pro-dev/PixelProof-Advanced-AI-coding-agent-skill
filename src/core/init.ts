import * as fs from "node:fs";
import * as path from "node:path";
import { BUILTIN_DEFAULTS } from "./config.js";
import { makeError } from "./hints.js";

function pathEscape(message: string) {
  return { status: "failed", error: {
    ...makeError("path_escape", message),
    hint: "Remove symbolic links from output paths and keep generated files inside DIR.",
  } };
}

export function initProject(directory = ".", overwrite = false) {
  const dir = path.resolve(directory);
  const files = ["references.json", "references/.gitkeep", "pixelproof.config.json"];
  const manifest = {
    version: 1,
    project: { baseUrl: "http://127.0.0.1:3000" },
    references: [{
      id: "home-desktop", route: "/", viewport: { width: 1280, height: 720 },
      captureType: "viewport", image: "references/home-desktop.png",
    }],
  };
  const contents = [JSON.stringify(manifest, null, 2) + "\n", "", JSON.stringify(BUILTIN_DEFAULTS, null, 2) + "\n"];
  try {
    // Reject symlinks even with --overwrite, including dangling links. Preflight
    // every output before writing anything; never follow an output outside DIR.
    for (const relative of ["references", ...files]) {
      const target = path.resolve(dir, relative);
      if (!target.startsWith(dir + path.sep) && dir !== path.parse(dir).root) {
        return pathEscape("Output path escapes target directory.");
      }
      let stat: fs.Stats;
      try { stat = fs.lstatSync(target); } catch (err: any) {
        if (err.code === "ENOENT") continue;
        throw err;
      }
      if (stat.isSymbolicLink()) {
        return pathEscape("Refusing symbolic link: " + target);
      }
      if (relative === "references" && stat.isDirectory()) continue;
      if (!overwrite || !stat.isFile() || relative === "references") {
        return { status: "failed", error: makeError("output_exists", "Output already exists: " + target) };
      }
    }
    fs.mkdirSync(path.join(dir, "references"), { recursive: true });
    for (let i = 0; i < files.length; i++) {
      const target = path.join(dir, files[i]);
      // Unlink instead of truncating so overwriting a hard link cannot mutate
      // another file outside DIR. Exclusive creation rejects new symlinks.
      if (overwrite) {
        try { fs.unlinkSync(target); } catch (err: any) {
          if (err.code !== "ENOENT") throw err;
        }
      }
      fs.writeFileSync(target, contents[i], { flag: "wx" });
    }
    return {
      status: "created", directory: dir, createdFiles: files,
      hint: "Add your reference PNG at references/home-desktop.png. Until then, validate is expected to fail with image_missing. Use --config pixelproof.config.json to load the generated configuration.",
    };
  } catch (err: any) {
    return { status: "failed", error: makeError(err.code === "EEXIST" ? "output_exists" : "write_failed", err.message) };
  }
}
