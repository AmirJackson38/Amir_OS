import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, utimesSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { MemoryJournal } from './memory_hook_core.mjs';
import plugin from './opencode_memory_hooks.mjs';

function setup(t) {
  const root = mkdtempSync(resolve(tmpdir(), 'amir-hook-test-'));
  mkdirSync(resolve(root, 'memory'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, journal: new MemoryJournal(root) };
}
const input = { sessionID: 'ses_test', callID: 'call_test', tool: 'bash' };
const chain = { optional() { return this; }, int() { return this; }, min() { return this; } };
const tool = Object.assign(def => def, { schema: { string: () => chain, number: () => chain, enum: () => chain } });

test('pre-action persists without after hook; restart exposes uncertainty without storing command or output', t => {
  const { root, journal } = setup(t);
  journal.before(input, { command: 'secret-password-example' }, root);
  const restored = new MemoryJournal(root).status(input.sessionID);
  assert.equal(restored.pending[0].state, 'prepared-outcome-unknown');
  const file = resolve(root, '.amir-state/opencode/ses_test/calls/call_test/before.json');
  assert(!readFileSync(file, 'utf8').includes('secret-password-example'));
  journal.after(input, { output: 'another-sensitive-value', metadata: { exit: 1 } });
  assert.equal(journal.status(input.sessionID).pending[0].state, 'returned-unverified');
  assert.equal(journal.status(input.sessionID).pending[0].exitCode, 1);
  assert(!readFileSync(file.replace('before.json', 'after.json'), 'utf8').includes('another-sensitive-value'));
});

test('read tools are free of journal writes; duplicate calls preserve intent; conflicting IDs rejected', t => {
  const { root, journal } = setup(t);
  journal.before({ ...input, tool: 'read' }, { filePath: 'example' }, root);
  assert(!existsSync(resolve(root, '.amir-state')));
  journal.before(input, { command: 'example' }, root);
  journal.before(input, { command: 'example' }, root);
  assert.equal(journal.status(input.sessionID).pending.length, 1);
  assert.throws(() => journal.before(input, { command: 'different' }, root), /reused/);
});

test('stale acknowledgement rejected and late tool returns reopen a reviewed uncertain call', t => {
  const { root, journal } = setup(t);
  journal.before(input, {}, root);
  const old = journal.status(input.sessionID).snapshot;
  journal.before({ ...input, callID: 'call_second' }, {}, root);
  assert.throws(() => journal.complete(input.sessionID, { snapshot: old, disposition: 'read-only-or-no-change', evidence: 'Readback unchanged' }), /changed/);
  journal.complete(input.sessionID, { snapshot: journal.status(input.sessionID).snapshot, disposition: 'read-only-or-no-change', evidence: 'Inspected targets; no changes' });
  assert.equal(journal.status(input.sessionID).pending.length, 0);
  journal.after(input, { output: 'late result' });
  assert.equal(journal.status(input.sessionID).pending.length, 1);
});

test('critical record must exist, be current and stay within memory directory', t => {
  const { root, journal } = setup(t);
  journal.before(input, {}, root);
  const args = { snapshot: journal.status(input.sessionID).snapshot, disposition: 'recorded', evidence: 'Verified API response', record: 'memory/session.md' };
  assert.throws(() => journal.complete(input.sessionID, args));
  writeFileSync(resolve(root, 'outside.md'), 'note');
  assert.throws(() => journal.complete(input.sessionID, { ...args, record: 'outside.md' }), /inside/);
  const note = resolve(root, args.record);
  writeFileSync(note, '# Outcome\nEvidence: expected response.\nUncertainty: browser not observed.');
  utimesSync(note, 1, 1);
  assert.throws(() => journal.complete(input.sessionID, args), /predates/);
  writeFileSync(note, '# Outcome\nEvidence: verified. Next: user reload.');
  journal.complete(input.sessionID, args);
  assert.equal(journal.status(input.sessionID).pending.length, 0);
});

test('hook integration injects bounded recovery and supports concurrent calls and compaction', async t => {
  const { root, journal } = setup(t);
  const hooks = await plugin({ directory: root }, { root, tool });
  await Promise.all(['call_a', 'call_b'].map(callID => hooks['tool.execute.before']({ ...input, callID }, { args: {} })));
  const output = { system: ['existing prompt'] };
  await hooks['experimental.chat.system.transform']({ sessionID: input.sessionID }, output);
  assert.equal(output.system[0], 'existing prompt');
  assert.match(output.system[1], /2 unacknowledged calls/);
  assert(output.system[1].length < 3000);
  const compact = { context: [] };
  await hooks['experimental.session.compacting']({ sessionID: input.sessionID }, compact);
  assert.match(compact.context[0], /automatic continuity/);
  const status = JSON.parse(await hooks.tool.memory_status.execute({}, { sessionID: input.sessionID }));
  assert.equal(status.totalPending, 2);
  assert.equal(journal.status(input.sessionID).pending.length, 2);
});

test('pre-action journal failure blocks hook; post-action receipt failure warns without claiming rollback', async t => {
  const { root } = setup(t);
  const hooks = await plugin({ directory: root }, { root, tool });
  writeFileSync(resolve(root, '.amir-state'), 'blocked directory');
  await assert.rejects(hooks['tool.execute.before'](input, { args: {} }));
  const output = { output: 'tool already ran', metadata: {} };
  await hooks['tool.execute.after'](input, output);
  assert.match(output.output, /may already have run/);
});

test('rate limit detected in after hook; checkpoint created and rateLimited flag in status', t => {
  const { root, journal } = setup(t);
  journal.before(input, { command: 'api call' }, root);
  journal.after(input, { output: 'Rate limit exceeded. Please wait.', metadata: { exit: 429 } });
  const status = journal.status(input.sessionID);
  assert.equal(status.pending[0].rateLimited, true);
  assert.equal(status.pending[0].exitCode, 429);
  const afterFile = resolve(root, '.amir-state/opencode/ses_test/calls/call_test/after.json');
  const after = JSON.parse(readFileSync(afterFile, 'utf8'));
  assert.equal(after.rateLimited, true);
  const taskDir = resolve(root, '.amir-state/tasks/ratelimit-ses-test-call-test');
  assert(existsSync(taskDir), 'Rate limit checkpoint directory should exist');
  const taskFiles = readdirSync(taskDir).filter(f => f.endsWith('.json'));
  assert(taskFiles.length >= 1, 'Should have at least one checkpoint revision');
});

test('rate limit detected via output text (quota exceeded)', t => {
  const { root, journal } = setup(t);
  journal.before({ ...input, callID: 'call_quota' }, { command: 'api call' }, root);
  journal.after({ ...input, callID: 'call_quota' }, { output: 'quota exceeded for this period', metadata: { exit: 0 } });
  const status = journal.status(input.sessionID);
  const quotaCall = status.pending.find(p => p.call === 'call_quota');
  assert(quotaCall, 'Should find the quota call');
  assert.equal(quotaCall.rateLimited, true);
});

test('rate limit detected via exit code 128', t => {
  const { root, journal } = setup(t);
  journal.before({ ...input, callID: 'call_128' }, { command: 'git push' }, root);
  journal.after({ ...input, callID: 'call_128' }, { output: 'fatal: authentication failed', metadata: { exit: 128 } });
  const status = journal.status(input.sessionID);
  const call128 = status.pending.find(p => p.call === 'call_128');
  assert(call128, 'Should find the exit 128 call');
  assert.equal(call128.rateLimited, true);
});
