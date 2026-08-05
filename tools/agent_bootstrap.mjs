#!/usr/bin/env node
/*
 * agent_bootstrap.mjs — compact startup packet for AI agents entering Amir OS.
 *
 * Read-only. Uses Node because Node is already part of the TARS runtime on both
 * the Windows development machine and the Raspberry Pi.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

function runGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const stderr = error.stderr ? String(error.stderr).trim() : "";
    return `ERROR: ${stderr || error.message}`;
  }
}

function lines(value) {
  return value
    ? value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : [];
}

function loadProjectState() {
  const statePath = resolve(repoRoot, "PROJECT_STATE.json");
  if (!existsSync(statePath)) return {};
  return JSON.parse(readFileSync(statePath, "utf8"));
}

function collectState() {
  const tagOutput = runGit(["tag", "--sort=-creatordate", "--format", "%(refname:short)", "--merged", "HEAD"]);
  const tags = lines(tagOutput).filter((line) => !line.startsWith("ERROR:"));

  return {
    repoRoot,
    branchStatus: runGit(["status", "--short", "--branch"]),
    head: runGit(["rev-parse", "HEAD"]),
    latestCommit: runGit(["log", "-1", "--oneline", "--decorate"]),
    recentCommits: lines(runGit(["log", "--oneline", "--decorate", "-8"])),
    latestMergedTag: tags[0] || "",
    stagedFiles: lines(runGit(["diff", "--cached", "--name-only"])),
    dirtyFiles: lines(runGit(["status", "--porcelain"])),
    projectState: loadProjectState(),
  };
}

function printTextPacket(state) {
  const projectState = state.projectState || {};
  const tars = projectState.tars || {};
  const entrypoints = projectState.agent_entrypoints || {};

  console.log("# Amir OS Agent Bootstrap Packet");
  console.log();
  console.log("## Live Git State");
  console.log();
  console.log(`- Repo root: \`${state.repoRoot}\``);
  console.log(`- HEAD: \`${state.head}\``);
  console.log(`- Latest commit: \`${state.latestCommit}\``);
  console.log(`- Latest merged tag: \`${state.latestMergedTag || "none"}\``);
  console.log();
  console.log("```text");
  console.log(state.branchStatus);
  console.log("```");
  console.log();
  console.log("## TARS State Pointer");
  console.log();
  console.log(`- Latest release: \`${tars.latest_release || "unknown"}\``);
  console.log(`- Current phase: \`${tars.current_phase || "unknown"}\``);
  console.log(`- Phase status: \`${tars.phase_status || "unknown"}\``);
  console.log(`- Production host: \`${tars.production_host || "unknown"}\``);
  console.log();
  console.log("## Required Reads");
  console.log();
  console.log("- `AGENTS.md`");
  console.log("- `HEAD.md`");
  console.log("- `RELEASE_STATE.md`");
  console.log("- `ROADMAP_RECONCILIATION.md`");
  console.log("- `KNOWN_ISSUES.md`");
  if (Array.isArray(entrypoints.tars_project)) {
    for (const entry of entrypoints.tars_project) console.log(`- \`${entry}\``);
  }
  console.log();
  console.log("## Guardrails");
  console.log();
  console.log("- Historical memory files are context only unless referenced by `HEAD.md`.");
  console.log("- Verify production separately on `tars.local` before runtime claims.");
  console.log("- Do not use `git add .` for governance or docs-only work.");
  console.log("- Run `node tools/check_staged_files.mjs` before committing.");
  console.log();
  console.log("## Workspace Changes");
  console.log();
  if (state.dirtyFiles.length) {
    console.log("```text");
    console.log(state.dirtyFiles.join("\n"));
    console.log("```");
  } else {
    console.log("Clean working tree.");
  }
}

const asJson = process.argv.includes("--json");
const state = collectState();

if (asJson) {
  console.log(JSON.stringify(state, null, 2));
} else {
  printTextPacket(state);
}
