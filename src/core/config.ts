import { readFileSync } from "node:fs";
import type { WaitUntilStrategy } from "../browser/capture.js";

export const BUILTIN_DEFAULTS = {
  maxIterations: 5,
  browser: { engine: "chromium", timeoutMs: 30000, waitUntil: "networkidle" },
  comparison: {
    generateOverlay: true, generateDiff: true, calculateMAE: true, calculateSSIM: false,
    thresholds: { maxHighSeverityIssues: 0 },
  },
  workflow: { preserveExistingChanges: true, verifyAffectedRoutes: true, stopWhenImprovementStalls: true },
  report: { format: ["json", "markdown"] },
};

// Only maxIterations, browser.waitUntil and browser.timeoutMs are wired.
// All other configuration settings: NOT BUILT YET.
type Rule = string | { [key: string]: Rule };
const rules: Rule = {
  maxIterations: "positive",
  browser: { engine: "string", timeoutMs: "positive", waitUntil: "waitUntil" },
  comparison: {
    generateOverlay: "boolean", generateDiff: "boolean", calculateMAE: "boolean",
    calculateSSIM: "boolean", thresholds: { maxHighSeverityIssues: "nonnegative" },
  },
  workflow: { preserveExistingChanges: "boolean", verifyAffectedRoutes: "boolean", stopWhenImprovementStalls: "boolean" },
  report: { format: "strings" },
};

// Mirrors schemas/config.schema.json: no required fields; additional properties allowed.
export function validateConfig(value: unknown, rule: Rule = rules, path = "config"): void {
  if (typeof rule === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(path + " must be an object");
    }
    for (const [key, child] of Object.entries(rule)) {
      if (Object.hasOwn(value, key)) validateConfig((value as Record<string, unknown>)[key], child, path + "." + key);
    }
    return;
  }
  const valid = rule === "positive" || rule === "nonnegative"
    ? typeof value === "number" && Number.isInteger(value) && value >= (rule === "positive" ? 1 : 0)
    : rule === "waitUntil" ? ["load", "domcontentloaded", "networkidle"].includes(value as string)
    : rule === "strings" ? Array.isArray(value) && value.every(v => typeof v === "string")
    : typeof value === rule;
  if (!valid) throw new Error(path + " has an invalid value");
}

export function loadConfig(configPath = "config/default.json") {
  let data: any = {};
  try {
    data = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (err: any) {
    if (err.code !== "ENOENT") throw err;
  }
  validateConfig(data);
  return {
    maxIterations: data.maxIterations ?? BUILTIN_DEFAULTS.maxIterations,
    browser: {
      timeoutMs: data.browser?.timeoutMs ?? BUILTIN_DEFAULTS.browser.timeoutMs,
      waitUntil: (data.browser?.waitUntil ?? BUILTIN_DEFAULTS.browser.waitUntil) as WaitUntilStrategy,
    },
  };
}
