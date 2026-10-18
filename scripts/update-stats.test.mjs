import test from 'node:test';
import assert from 'node:assert/strict';
import { computeWindow, mergeStats, upsertCsv, buildQueries, CSV_HEADER } from './update-stats.mjs';

test('window before first month end is empty', () => {
  const w = computeWindow('2026-10-15', new Date('2026-10-18T07:17:00Z'));
  assert.equal(w.empty, true);
});

test('first run on 1 Nov covers 15-31 Oct', () => {
  const w = computeWindow('2026-10-15', new Date('2026-11-01T07:17:00Z'));
  assert.equal(w.empty, false);
  assert.equal(w.month, '2026-10');
  assert.equal(w.through, '2026-10-31');
  assert.equal(w.monthStart.toISOString(), '2026-10-15T00:00:00.000Z');
  assert.equal(w.end.toISOString(), '2026-11-01T00:00:00.000Z');
});

test('later run uses the full previous month, across year end', () => {
  const w = computeWindow('2026-10-15', new Date('2027-01-01T07:17:00Z'));
  assert.equal(w.month, '2026-12');
  assert.equal(w.through, '2026-12-31');
  assert.equal(w.monthStart.toISOString(), '2026-12-01T00:00:00.000Z');
});

test('queries embed the window and events', () => {
  const q = buildQueries(computeWindow('2026-10-15', new Date('2026-11-01T00:00:00Z')));
  assert.match(q.sources, /'geni_saved'/);
  assert.match(q.historians, /HAVING first >= toDateTime\('2026-10-15/);
});

const prev = {
  sources: 10, historians: 5, through: '2026-10-14',
  baseline: { sources: 10, historians: 5 },
  posthog: { since: '2026-10-15', sources: 0, historians: 0 },
};

test('merge adds baseline and PostHog counts', () => {
  const w = computeWindow('2026-10-15', new Date('2026-11-01T00:00:00Z'));
  const m = mergeStats(prev, w, { sources: 7, historians: 3 }, new Date('2026-11-01T07:17:00Z'));
  assert.equal(m.sources, 17);
  assert.equal(m.historians, 8);
  assert.equal(m.through, '2026-10-31');
  assert.deepEqual(m.posthog, { since: '2026-10-15', sources: 7, historians: 3 });
  // idempotent: merging again from the result gives the same totals
  assert.equal(mergeStats(m, w, { sources: 7, historians: 3 }).sources, 17);
});

test('csv upsert creates, replaces and sorts', () => {
  const r = (month, n) => ({ month, sources_month: n, historians_month: 1, sources_total: n, historians_total: 1 });
  let csv = upsertCsv('', r('2026-11', 5));
  assert.equal(csv, `${CSV_HEADER}\n2026-11,5,1,5,1\n`);
  csv = upsertCsv(csv, r('2026-10', 2));
  csv = upsertCsv(csv, r('2026-11', 9));
  assert.equal(csv, `${CSV_HEADER}\n2026-10,2,1,2,1\n2026-11,9,1,9,1\n`);
});
