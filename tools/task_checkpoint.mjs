#!/usr/bin/env node
// Local, append-only checkpoints. Never executes recorded commands or replays work.
import { mkdirSync, readdirSync, readFileSync, existsSync, openSync, writeFileSync, fsyncSync, closeSync, renameSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const idPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
function text(value, name) {
  if (typeof value !== 'string' || !value.trim() || value.length > 1200) throw Error(`${name}: required, maximum 1200 characters`);
  return value;
}
function taskDir(root, id) {
  if (!idPattern.test(id || '')) throw Error('Task ID must be lowercase letters/digits/hyphens (1–64 characters)');
  return resolve(root, '.amir-state', 'tasks', id);
}
export function loadTask(root, id) {
  const dir = taskDir(root, id);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter(f => /^\d{8}\.json$/.test(f)).sort();
  let state = null;
  for (let i = 0; i < files.length; i++) {
    const row = JSON.parse(readFileSync(resolve(dir, files[i]), 'utf8'));
    if (row.schema !== 1 || row.id !== id || row.revision !== i + 1 || files[i] !== `${String(i + 1).padStart(8, '0')}.json`
      || !['active', 'closed'].includes(row.status) || !Array.isArray(row.steps)
      || typeof row.goal !== 'string' || typeof row.next !== 'string'
      || row.steps.some(s => !idPattern.test(s.id || '') || !['uncertain', 'verified', 'not-applied', 'failed'].includes(s.status)
        || ['action', 'target', 'verify', 'rollback'].some(k => typeof s[k] !== 'string'))
      || row.steps.filter(s => s.status === 'uncertain').length > 1
      || (row.status === 'closed' && row.steps.some(s => s.status === 'uncertain'))) throw Error(`Invalid checkpoint: ${id}/${files[i]}; inspect, do not replay`);
    state = row;
  }
  return state;
}
export function transition(previous, command, args) {
  if (command === 'begin') {
    if (previous) throw Error('Task already exists; inspect status');
    return { schema: 1, id: args.id, revision: 1, status: 'active', goal: text(args.goal, 'goal'), next: text(args.next, 'next'), steps: [] };
  }
  if (!previous) throw Error('Task does not exist');
  if (String(previous.revision) !== String(args.rev)) throw Error(`Stale/missing --rev; current revision is ${previous.revision}. Read status first.`);
  if (previous.status === 'closed') throw Error('Task is closed; start a new task');
  const state = structuredClone(previous);
  state.revision++;
  const pending = state.steps.find(s => s.status === 'uncertain');
  if (command === 'prepare') {
    if (pending) throw Error('Resolve the uncertain step before preparing another');
    if (!idPattern.test(args.step || '') || state.steps.some(s => s.id === args.step)) throw Error('Step ID invalid or already used');
    state.steps.push({ id: args.step, status: 'uncertain', action: text(args.action, 'action'), target: text(args.target, 'target'), verify: text(args.verify, 'verify'), rollback: text(args.rollback, 'rollback') });
    state.next = 'Inspect the prepared action target; it may or may not have executed. Never blindly replay.';
  } else if (command === 'resolve') {
    if (!pending || pending.id !== args.step) throw Error('No matching uncertain step');
    if (!['verified', 'not-applied', 'failed'].includes(args.result)) throw Error('result must be verified, not-applied, or failed');
    pending.status = args.result;
    pending.evidence = text(args.evidence, 'evidence');
    state.next = text(args.next, 'next');
  } else if (command === 'close') {
    if (pending) throw Error('Cannot close with an uncertain step');
    state.outcome = text(args.outcome, 'outcome');
    state.record = text(args.record, 'record');
    state.status = 'closed';
    state.next = 'Closed. Historical record is not permission to repeat work.';
  } else throw Error(`Unknown mutation: ${command}`);
  return state;
}
export function mutate(root, command, args) {
  const dir = taskDir(root, args.id);
  mkdirSync(dir, { recursive: true });
  const lock = resolve(dir, 'writer.lock');
  let fd;
  try { fd = openSync(lock, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') throw Error(`Writer lock exists: ${lock}. Inspect owner/process before manual removal; no automatic stale-lock deletion.`); throw error; }
  try {
    writeFileSync(fd, JSON.stringify({ pid: process.pid, time: new Date().toISOString() }));
    fsyncSync(fd);
    const state = transition(loadTask(root, args.id), command, args);
    state.updated = new Date().toISOString();
    const target = resolve(dir, `${String(state.revision).padStart(8, '0')}.json`);
    const temp = resolve(dir, `.pending-${randomUUID()}`);
    const out = openSync(temp, 'wx', 0o600);
    try { writeFileSync(out, JSON.stringify(state, null, 2) + '\n'); fsyncSync(out); } finally { closeSync(out); }
    // Same-directory rename publishes a complete snapshot. Older revisions remain intact.
    renameSync(temp, target);
    return state;
  } finally { closeSync(fd); unlinkSync(lock); }
}
export function recovery(root = ROOT) {
  const base = resolve(root, '.amir-state', 'tasks');
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true }).filter(e => e.isDirectory() && idPattern.test(e.name)).map(e => {
    try {
      const state = loadTask(root, e.name);
      const dir = resolve(base, e.name);
      const artifacts = readdirSync(dir).filter(f => f === 'writer.lock' || f.startsWith('.pending-'));
      return { id: e.name, state, artifacts };
    } catch (error) { return { id: e.name, error: error.message }; }
  });
}
export function printRecovery(root = ROOT) {
  const tasks = recovery(root).filter(t => t.error || t.artifacts?.length || t.state?.status === 'active');
  console.log('## Local interruption recovery');
  if (!tasks.length) { console.log('No active checkpoints. This does not prove no unrecorded work exists.'); return; }
  for (const t of tasks.slice(0, 5)) {
    console.log(`- ${t.id}: ${t.error || `revision ${t.state?.revision ?? 0}`}`);
    if (t.artifacts?.length) console.log(`  Inspect interrupted writer artifacts: ${t.artifacts.join(', ')}`);
    if (!t.state) continue;
    console.log(`  Goal: ${t.state.goal.slice(0, 240)}`);
    const pending = t.state.steps.find(s => s.status === 'uncertain');
    if (pending) {
      console.log(`  UNCERTAIN ${pending.id}: ${pending.action.slice(0, 240)}`);
      console.log(`  Target: ${pending.target.slice(0, 240)}`);
      console.log(`  Verify BEFORE replay: ${pending.verify.slice(0, 300)}`);
    }
    console.log(`  Next: ${t.state.next.slice(0, 300)}`);
  }
  if (tasks.length > 5) console.log(`${tasks.length - 5} more tasks; use task_checkpoint.mjs status.`);
  console.log('Checkpoints are reported evidence, not live runtime proof. Confirm current user intent.');
}
function main() {
  const [command = 'brief', ...tokens] = process.argv.slice(2);
  const args = {};
  for (let i = 0; i < tokens.length; i += 2) {
    if (!tokens[i].startsWith('--') || tokens[i + 1] === undefined || tokens[i + 1].startsWith('--')) throw Error('Expected --name value pairs');
    const key = tokens[i].slice(2);
    if (Object.hasOwn(args, key)) throw Error(`Duplicate option: ${key}`);
    args[key] = tokens[i + 1];
  }
  const allowed = {
    begin: ['id', 'goal', 'next'], prepare: ['id', 'rev', 'step', 'action', 'target', 'verify', 'rollback'],
    resolve: ['id', 'rev', 'step', 'result', 'evidence', 'next'], close: ['id', 'rev', 'outcome', 'record'],
    status: ['id'], brief: [],
  };
  if (!allowed[command] || Object.keys(args).some(k => !allowed[command].includes(k))) throw Error('Unknown command/option. See docs/INTERRUPTION_RECOVERY.md');
  if (command === 'brief') printRecovery();
  else if (command === 'status') console.log(JSON.stringify(args.id ? loadTask(ROOT, args.id) : recovery(), null, 2));
  else {
    const state = mutate(ROOT, command, args);
    console.log(JSON.stringify({ id: state.id, revision: state.revision, status: state.status, lastStep: state.steps.at(-1)?.id, lastStepStatus: state.steps.at(-1)?.status, next: state.next }, null, 2));
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
