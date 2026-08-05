#!/usr/bin/env node
/*
 * check_staged_files.mjs — staged-file safety guard for Amir OS.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

const docsOnly = process.argv.includes("--docs-only");

const forbiddenStagePatterns = [
  "projects/tars-face/minimal_test.html",
  "projects/tars-face/simple_test.html",
  "projects/tars-face/tars_debug.html",
  "projects/tars-face/test.html",
  "projects/tars-face/test1_fcss_sbody.html",
  "projects/tars-face/test2_scss_fbody.html",
  "projects/tars-face/*debug*.html",
  "projects/tars-face/test*.html",
];

const appCodePatterns = [
  "projects/tars-face/tars_face_v1.html",
  "projects/tars-face/pi-server/*.js",
  "projects/tars-face/pi-server/**/*.js",
  "projects/tars-face/config/*.json",
  "projects/tars-face/Dockerfile",
  "projects/tars-face/docker-compose.yml",
];

const governanceFiles = [
  "HEAD.md",
  "RELEASE_STATE.md",
  "ROADMAP_RECONCILIATION.md",
];

const unsafeAuthorityPhrases = [
  "Current repository HEAD",
  "Current development HEAD",
  "Current production runtime SHA",
];

function runGit(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function globToRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DOUBLE_STAR__/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function matchesAny(path, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(path));
}

function stagedFiles() {
  const output = runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB"]);
  return output ? output.split(/\r?\n/).map((path) => path.replace(/\\/g, "/")).filter(Boolean) : [];
}

function stagedContent(path) {
  try {
    return runGit(["show", `:${path}`]);
  } catch {
    return "";
  }
}

function diffCheckErrors() {
  const result = spawnSync("git", ["diff", "--cached", "--check"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status === 0) return [];
  return `${result.stdout || ""}${result.stderr || ""}`.split(/\r?\n/).filter(Boolean);
}

const files = stagedFiles();
const errors = [];
const warnings = [];

if (!files.length) {
  console.log("No staged files.");
  process.exit(0);
}

for (const file of files) {
  if (matchesAny(file, forbiddenStagePatterns)) {
    errors.push(`Forbidden scratch/debug file staged: ${file}`);
  }
  if (docsOnly && matchesAny(file, appCodePatterns)) {
    errors.push(`App/runtime file staged during docs-only check: ${file}`);
  }
}

for (const file of governanceFiles) {
  if (!files.includes(file)) continue;
  const content = stagedContent(file);
  for (const phrase of unsafeAuthorityPhrases) {
    if (content.includes(phrase)) {
      errors.push(`Unsafe mutable authority phrase in ${file}: ${phrase}`);
    }
  }
}

if (!docsOnly) {
  const appCode = files.filter((file) => matchesAny(file, appCodePatterns));
  if (appCode.length) {
    warnings.push("App/runtime files are staged. If intentional, validate with proportionate tests.");
  }
}

errors.push(...diffCheckErrors());

console.log("Staged files:");
for (const file of files) console.log(`  - ${file}`);

for (const warning of warnings) console.log(`WARNING: ${warning}`);

if (errors.length) {
  console.log();
  console.log("FAILED staged-file guard:");
  for (const error of errors) console.log(`  - ${error}`);
  process.exit(1);
}

console.log();
console.log("Staged-file guard passed.");
