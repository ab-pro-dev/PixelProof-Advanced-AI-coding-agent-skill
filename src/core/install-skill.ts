/**
 * PixelProof skill installer for AI coding agents (Antigravity, Claude Code, Cursor, Copilot).
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type SupportedAgent = "antigravity" | "claude" | "cursor" | "copilot" | "all";

export interface InstallSkillOptions {
  agent?: SupportedAgent;
  global?: boolean;
  projectDir?: string;
}

export interface InstallResult {
  agent: string;
  targetPath: string;
  status: "installed" | "updated" | "failed";
  message: string;
}

export function getSkillContent(): string {
  // Try package root first
  const pkgRoot = path.resolve(__dirname, "../../..");
  const candidate = path.join(pkgRoot, "SKILL.md");
  if (fs.existsSync(candidate)) {
    return fs.readFileSync(candidate, "utf8");
  }
  // Try cwd
  const cwdCandidate = path.resolve(process.cwd(), "SKILL.md");
  if (fs.existsSync(cwdCandidate)) {
    return fs.readFileSync(cwdCandidate, "utf8");
  }
  throw new Error("Could not locate SKILL.md in package or current directory.");
}

export function installForAntigravity(skillContent: string, isGlobal = true, projectDir = process.cwd()): InstallResult {
  const targetDir = isGlobal
    ? path.join(os.homedir(), ".gemini", "config", "skills", "pixelproof")
    : path.join(projectDir, ".gemini", "skills", "pixelproof");
  const targetFile = path.join(targetDir, "SKILL.md");

  try {
    fs.mkdirSync(targetDir, { recursive: true });
    const exists = fs.existsSync(targetFile);
    fs.writeFileSync(targetFile, skillContent, "utf8");
    return {
      agent: "antigravity",
      targetPath: targetFile,
      status: exists ? "updated" : "installed",
      message: `Skill installed for Antigravity at: ${targetFile}`,
    };
  } catch (err: any) {
    return {
      agent: "antigravity",
      targetPath: targetFile,
      status: "failed",
      message: `Failed to install for Antigravity: ${err.message}`,
    };
  }
}

export function installForClaude(projectDir = process.cwd()): InstallResult {
  const targetFile = path.join(projectDir, "CLAUDE.md");
  const snippet = `\n\n## PixelProof Visual Verification Workflow\n` +
    `When reconstructing UI from screenshot references, use the PixelProof CLI:\n` +
    `- Validate: \`pixelproof validate --manifest <path>\`\n` +
    `- Inspect: \`pixelproof inspect --project <dir>\`\n` +
    `- Capture: \`pixelproof capture --manifest <path> --out <dir>\`\n` +
    `- Compare: \`pixelproof compare --id <id> --reference <path> --actual <path> --out <dir> --regions\`\n` +
    `- Iterate: \`pixelproof iterate --manifest <path> --actual-dir <dir> --out <dir>\`\n` +
    `- Progress: \`pixelproof progress --state <statePath>\`\n` +
    `- Report: \`pixelproof report --summary <summaryPath> --out <dir>\`\n`;

  try {
    if (fs.existsSync(targetFile)) {
      const existing = fs.readFileSync(targetFile, "utf8");
      if (!existing.includes("PixelProof Visual Verification")) {
        fs.appendFileSync(targetFile, snippet, "utf8");
      }
      return {
        agent: "claude",
        targetPath: targetFile,
        status: "updated",
        message: `Updated ${targetFile} with PixelProof instructions.`,
      };
    } else {
      fs.writeFileSync(targetFile, `# CLAUDE.md\n${snippet}`, "utf8");
      return {
        agent: "claude",
        targetPath: targetFile,
        status: "installed",
        message: `Created ${targetFile} with PixelProof instructions.`,
      };
    }
  } catch (err: any) {
    return {
      agent: "claude",
      targetPath: targetFile,
      status: "failed",
      message: `Failed to install for Claude: ${err.message}`,
    };
  }
}

export function installForCursor(skillContent: string, projectDir = process.cwd()): InstallResult {
  const targetDir = path.join(projectDir, ".cursor", "rules");
  const targetFile = path.join(targetDir, "pixelproof.mdc");

  const mdcContent = `---
description: PixelProof deterministic visual verification and screenshot reconstruction workflow
globs: *
alwaysApply: false
---

${skillContent}
`;

  try {
    fs.mkdirSync(targetDir, { recursive: true });
    const exists = fs.existsSync(targetFile);
    fs.writeFileSync(targetFile, mdcContent, "utf8");
    return {
      agent: "cursor",
      targetPath: targetFile,
      status: exists ? "updated" : "installed",
      message: `Installed Cursor rule at: ${targetFile}`,
    };
  } catch (err: any) {
    return {
      agent: "cursor",
      targetPath: targetFile,
      status: "failed",
      message: `Failed to install for Cursor: ${err.message}`,
    };
  }
}

export function installSkill(options: InstallSkillOptions = {}): InstallResult[] {
  const agent = options.agent ?? "all";
  const projectDir = options.projectDir ?? process.cwd();
  const isGlobal = options.global ?? true;
  const skillContent = getSkillContent();

  const results: InstallResult[] = [];

  if (agent === "antigravity" || agent === "all") {
    results.push(installForAntigravity(skillContent, isGlobal, projectDir));
  }
  if (agent === "claude" || agent === "all") {
    results.push(installForClaude(projectDir));
  }
  if (agent === "cursor" || agent === "all") {
    results.push(installForCursor(skillContent, projectDir));
  }

  return results;
}
