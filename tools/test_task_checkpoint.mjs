import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { mutate, loadTask, recovery } from './task_checkpoint.mjs';

function fixture(t) {
  const root = mkdtempSync(resolve(tmpdir(), 'amir-checkpoint-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
const begin = { id: 'demo', goal: 'Repair a widget', next: 'Inspect actual records' };
const prepare = { id: 'demo', rev: 1, step: 'repair', action: 'Restore exact records', target: 'test database', verify: 'Check actual widget API', rollback: 'Restore backup if needed' };

test('prepared action survives reload as uncertain; evidence and current revision required', t => {
  const root = fixture(t);
  mutate(root, 'begin', begin);
  mutate(root, 'prepare', prepare);
  assert.equal(loadTask(root, 'demo').steps[0].status, 'uncertain');
  assert.throws(() => mutate(root, 'close', { id: 'demo', rev: 2, outcome: 'done', record: 'session.md' }), /uncertain/);
  assert.throws(() => mutate(root, 'resolve', { id: 'demo', rev: 1 }), /Stale/);
  assert.throws(() => mutate(root, 'prepare', { ...prepare, rev: 2, step: 'second' }), /uncertain/);
  assert.throws(() => mutate(root, 'resolve', { id: 'demo', rev: 2, step: 'repair', result: 'verified', next: 'done' }), /evidence/);
  const resolved = mutate(root, 'resolve', { id: 'demo', rev: 2, step: 'repair', result: 'verified', evidence: 'API returned expected rows', next: 'Record outcome' });
  assert.equal(resolved.revision, 3);
  mutate(root, 'close', { id: 'demo', rev: 3, outcome: 'recovered', record: 'memory/session.md' });
  assert.equal(loadTask(root, 'demo').status, 'closed');
  assert.throws(() => mutate(root, 'begin', begin), /already exists/);
  assert.ok(existsSync(resolve(root, '.amir-state/tasks/demo/00000001.json')));
});

test('partial unpublished write preserves prior checkpoint and is surfaced', t => {
  const root = fixture(t);
  mutate(root, 'begin', begin);
  const dir = resolve(root, '.amir-state/tasks/demo');
  const original = readFileSync(resolve(dir, '00000001.json'), 'utf8');
  writeFileSync(resolve(dir, '.pending-crash'), '{broken');
  writeFileSync(resolve(dir, 'writer.lock'), '{"pid":999999}');
  assert.equal(loadTask(root, 'demo').revision, 1);
  assert.equal(recovery(root)[0].artifacts.length, 2);
  assert.throws(() => mutate(root, 'prepare', prepare), /Writer lock exists/);
  assert.equal(readFileSync(resolve(dir, '00000001.json'), 'utf8'), original);
});

test('corrupt committed revision fails closed instead of silently reverting', t => {
  const root = fixture(t);
  mutate(root, 'begin', begin);
  writeFileSync(resolve(root, '.amir-state/tasks/demo/00000002.json'), '{broken');
  assert.throws(() => loadTask(root, 'demo'));
  assert.ok(recovery(root)[0].error);
  assert.throws(() => mutate(root, 'prepare', prepare));
});

test('duplicate response/retry cannot apply a second transition', t => {
  const root = fixture(t);
  mutate(root, 'begin', begin);
  mutate(root, 'prepare', prepare);
  assert.throws(() => mutate(root, 'prepare', prepare), /Stale/);
  assert.equal(loadTask(root, 'demo').revision, 2);
});

test('read-only discovery creates nothing; traversal rejected; failed action remains explicit', t => {
  const root = fixture(t);
  assert.deepEqual(recovery(root), []);
  assert.equal(existsSync(resolve(root, '.amir-state')), false);
  assert.throws(() => mutate(root, 'begin', { ...begin, id: '../escape' }), /Task ID/);
  mutate(root, 'begin', begin);
  mutate(root, 'prepare', prepare);
  mutate(root, 'resolve', { id: 'demo', rev: 2, step: 'repair', result: 'failed', evidence: 'Permission denied; readback unchanged', next: 'Inspect permissions; do not repeat syntax' });
  assert.equal(loadTask(root, 'demo').steps[0].status, 'failed');
});
