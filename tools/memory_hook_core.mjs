import { mkdirSync, readdirSync, readFileSync, existsSync, openSync, writeFileSync, fsyncSync, closeSync, linkSync, unlinkSync, realpathSync, statSync } from 'node:fs';
import { resolve, relative, sep, isAbsolute } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { mutate, transition, loadTask } from './task_checkpoint.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const safeID = value => {
  if (typeof value !== 'string' || !/^[\w-]{1,160}$/.test(value)) throw Error('Missing/invalid OpenCode session or call ID');
  return value;
};
const readTools = new Set(['read', 'glob', 'grep', 'list', 'webfetch', 'websearch', 'skill', 'question', 'todowrite', 'memory_status', 'memory_complete']);
export function tracked(tool) { return !readTools.has(tool.split('.').at(-1)); }

function isRateLimited(output) {
  const text = String(output.output ?? '').toLowerCase();
  const exit = output.metadata?.exit ?? output.metadata?.exitCode;
  if (Number.isInteger(exit) && (exit === 429 || exit === 128)) return true;
  if (text.includes('rate limit') || text.includes('ratelimit') || text.includes('429') || text.includes('quota exceeded')) return true;
  return false;
}

function publish(path, value) {
  const temp = `${path}.${randomUUID()}.pending`;
  const fd = openSync(temp, 'wx', 0o600);
  try { writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fsyncSync(fd); } finally { closeSync(fd); }
  try { linkSync(temp, path); } finally { unlinkSync(temp); }
}
const read = path => JSON.parse(readFileSync(path, 'utf8'));

export class MemoryJournal {
  constructor(root) { this.root = root; this.base = resolve(root, '.amir-state', 'opencode'); }
  session(id) { return resolve(this.base, safeID(id)); }
  call(session, call) { return resolve(this.session(session), 'calls', safeID(call)); }
  before(input, args, directory) {
    if (!tracked(input.tool)) return;
    const dir = this.call(input.sessionID, input.callID);
    mkdirSync(dir, { recursive: true });
    const argsHash = digest(JSON.stringify(args ?? {}));
    const path = resolve(dir, 'before.json');
    if (existsSync(path)) {
      const previous = read(path);
      if (previous.argsHash !== argsHash || previous.tool !== input.tool) throw Error('Call ID reused with different input; journal refuses overwrite');
      return;
    }
    const row = { schema: 1, session: input.sessionID, call: input.callID, tool: input.tool, directory,
      argsHash, state: 'prepared-outcome-unknown', time: new Date().toISOString() };
    // No raw commands, arguments, patch contents, credentials or tool outputs stored.
    try { publish(path, row); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const existing = read(path);
      if (existing.argsHash !== argsHash || existing.tool !== input.tool) throw error;
    }
  }
  after(input, output) {
    if (!tracked(input.tool)) return;
    const dir = this.call(input.sessionID, input.callID);
    const before = resolve(dir, 'before.json');
    if (!existsSync(before)) throw Error('Missing pre-action receipt; investigate hook ordering');
    const path = resolve(dir, 'after.json');
    if (existsSync(path)) return;
    const exit = output.metadata?.exit ?? output.metadata?.exitCode;
    const rateLimited = isRateLimited(output);
    const row = { schema: 1, session: input.sessionID, call: input.callID, state: 'returned-unverified',
      time: new Date().toISOString(), outputHash: digest(String(output.output ?? '')),
      exitCode: Number.isInteger(exit) ? exit : null, rateLimited };
    try { publish(path, row); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    if (rateLimited) {
      const beforeData = read(before);
      const safeSession = input.sessionID.replace(/[^a-z0-9-]/g, '-');
      const safeCall = input.callID.replace(/[^a-z0-9-]/g, '-');
      const taskID = `ratelimit-${safeSession}-${safeCall}`;
      try {
        const existing = loadTask(this.root, taskID);
        if (!existing) {
          mutate(this.root, 'begin', { id: taskID, goal: `Rate limit during ${beforeData.tool} (call ${input.callID})`, next: 'Wait for rate limit to clear; verify target state before retry' });
        }
        mutate(this.root, 'prepare', { id: taskID, rev: existing ? existing.revision : 1, step: `retry-${safeCall}`, action: `Retry ${beforeData.tool} after rate limit`, target: beforeData.directory, verify: 'Confirm rate limit cleared; inspect target for partial effects', rollback: 'No rollback; original call may have partially executed' });
      } catch { /* checkpoint is best-effort; journal persists regardless */ }
    }
  }
  status(session) {
    const dir = this.session(session);
    if (!existsSync(dir)) return { session, pending: [], snapshot: digest('[]') };
    const callsDir = resolve(dir, 'calls');
    const receiptDir = resolve(dir, 'receipts');
    const completed = new Set();
    if (existsSync(receiptDir)) for (const f of readdirSync(receiptDir).filter(f => f.endsWith('.json'))) {
      const receipt = read(resolve(receiptDir, f));
      for (const fingerprint of receipt.fingerprints) completed.add(fingerprint);
    }
    const pending = [];
    if (existsSync(callsDir)) for (const entry of readdirSync(callsDir, { withFileTypes: true }).filter(e => e.isDirectory())) {
      const callDir = resolve(callsDir, entry.name);
      if (!existsSync(resolve(callDir, 'before.json'))) throw Error(`Incomplete journal publication for ${session}/${entry.name}; inspect pending files`);
      const before = read(resolve(callDir, 'before.json'));
      const afterPath = resolve(callDir, 'after.json');
      const after = existsSync(afterPath) ? read(afterPath) : null;
      const fingerprint = digest(JSON.stringify({ before, after }));
      if (!completed.has(fingerprint)) pending.push({ call: before.call, tool: before.tool, time: before.time,
        state: after?.state ?? before.state, exitCode: after?.exitCode ?? null, rateLimited: after?.rateLimited ?? false, fingerprint });
    }
    pending.sort((a, b) => a.time.localeCompare(b.time) || a.call.localeCompare(b.call));
    return { session, pending, snapshot: digest(JSON.stringify(pending.map(p => p.fingerprint))) };
  }
  all() {
    if (!existsSync(this.base)) return [];
    return readdirSync(this.base, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => this.status(e.name));
  }
  complete(session, { snapshot, disposition, evidence, record }) {
    if (!['recorded', 'read-only-or-no-change'].includes(disposition)) throw Error('Invalid disposition');
    if (typeof evidence !== 'string' || !evidence.trim() || evidence.length > 1200) throw Error('Concise verification evidence required (max 1200 characters); no credentials');
    const state = this.status(session);
    if (state.snapshot !== snapshot) throw Error('Journal changed; call memory_status and inspect new/returned actions before acknowledging');
    if (!state.pending.length) return 'Nothing pending';
    let note;
    if (disposition === 'recorded') {
      if (typeof record !== 'string' || !record) throw Error('A dated memory record is required');
      const memory = realpathSync(resolve(this.root, 'memory'));
      const file = realpathSync(resolve(this.root, record));
      const rel = relative(memory, file);
      if (rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel) || !file.endsWith('.md')) throw Error('Record must be a Markdown file inside Amir_OS/memory');
      const info = statSync(file);
      if (!info.isFile() || info.size === 0 || info.size > 1024 * 1024) throw Error('Record must be a nonempty Markdown file under 1 MiB');
      if (info.mtimeMs < Date.parse(state.pending.at(-1).time)) throw Error('Record predates pending actions; update it with current evidence first');
      note = { path: relative(this.root, file), sha256: digest(readFileSync(file)), bytes: info.size };
    }
    const dir = resolve(this.session(session), 'receipts');
    mkdirSync(dir, { recursive: true });
    // Snapshot-specific acknowledgement: later calls or later after-hooks remain pending.
    publish(resolve(dir, `${randomUUID()}.json`), { schema: 1, time: new Date().toISOString(), disposition,
      evidence, record: note, fingerprints: state.pending.map(p => p.fingerprint) });
    return 'Acknowledgement saved. This records supplied evidence; it does not independently prove the outcome.';
  }
}
