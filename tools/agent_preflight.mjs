#!/usr/bin/env node
// Read-only environment check, not a certification of a model's reasoning ability.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, recovery } from './task_checkpoint.mjs';

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--ssh' || !/^[a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+$/.test(args[1]))) {
  console.error('Usage: node tools/agent_preflight.mjs [--ssh user@host]');
  process.exit(1);
}
const results = [];
function check(name, fn) {
  try { results.push({ name, ok: true, evidence: fn() }); }
  catch (error) { results.push({ name, ok: false, error: error.message }); }
}
function run(file, argv) {
  return execFileSync(file, argv, { cwd: ROOT, encoding: 'utf8', timeout: 12000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
check('runtime', () => ({ node: process.version, platform: process.platform, root: ROOT, invokingShell: 'Not inferred from Node. Check client tool instructions.' }));
check('context routes', () => {
  const files = ['START_HERE.md', 'AGENTS.md', 'identity/COLLABORATION.md', 'MEMORY_PROTOCOL.md', 'docs/HOMELAB_QUICK_REFERENCE.md', 'docs/INTERRUPTION_RECOVERY.md'];
  for (const file of files) if (!existsSync(resolve(ROOT, file))) throw Error(`Missing ${file}`);
  return files;
});
check('git', () => run('git', ['status', '--short', '--branch']));
check('checkpoints', () => {
  const tasks = recovery();
  const broken = tasks.filter(t => t.error || t.artifacts.length);
  if (broken.length) throw Error(JSON.stringify(broken.map(t => ({ id: t.id, error: t.error, artifacts: t.artifacts }))));
  return { active: tasks.filter(t => t.state?.status === 'active').map(t => t.id), note: 'Read recovery briefing before actions; active does not imply safe to replay.' };
});
if (args.length) check('SSH read-only probe', () => run('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', '-o', 'StrictHostKeyChecking=yes', args[1], 'hostname']));
console.log(JSON.stringify({ results, limitation: 'Checks tools and local context availability only. Does not test judgment, authorize mutations, or prove service health.' }, null, 2));
if (results.some(r => !r.ok)) process.exitCode = 1;
