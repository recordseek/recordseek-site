#!/usr/bin/env node
// Updates the homepage stats from PostHog. See README ("Homepage stats").
// Env: POSTHOG_API_KEY (personal key, query:read), POSTHOG_HOST, POSTHOG_PROJECT_ID.
// Usage: node scripts/update-stats.mjs [--dry-run]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EVENTS = ['fs_source_created', 'zotero_saved', 'geni_saved'];
export const CSV_HEADER = 'month,sources_month,historians_month,sources_total,historians_total';

const pad = n => String(n).padStart(2, '0');
const day = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const hogTime = d => `toDateTime('${day(d)} 00:00:00', 'UTC')`;

/**
 * Window math. `since` is "YYYY-MM-DD" (UTC). Counts cover [since, end) where end is
 * the start of the current UTC month; the month increment covers the month before `now`.
 */
export function computeWindow(since, now = new Date()) {
  const sinceDate = new Date(`${since}T00:00:00Z`);
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const monthStart = prevMonth > sinceDate ? prevMonth : sinceDate;
  const empty = end <= sinceDate;
  const last = new Date(end.getTime() - 86400000);
  return {
    since: sinceDate,
    end,
    monthStart,
    empty,
    month: `${prevMonth.getUTCFullYear()}-${pad(prevMonth.getUTCMonth() + 1)}`,
    through: empty ? null : day(last),
  };
}

export function buildQueries(w) {
  const ev = EVENTS.map(e => `'${e}'`).join(', ');
  const sources = `SELECT count(), countIf(timestamp >= ${hogTime(w.monthStart)}) FROM events WHERE event IN (${ev}) AND timestamp >= ${hogTime(w.since)} AND timestamp < ${hogTime(w.end)}`;
  // A historian counts once, in the window of their FIRST such event (ever, not just in the window).
  const historians = `SELECT count(), countIf(first >= ${hogTime(w.monthStart)}) FROM (SELECT person_id, min(timestamp) AS first FROM events WHERE event IN (${ev}) AND timestamp < ${hogTime(w.end)} GROUP BY person_id HAVING first >= ${hogTime(w.since)})`;
  return { sources, historians };
}

/** totals = baseline + PostHog cumulative. */
export function mergeStats(prev, w, counts, now = new Date()) {
  const ph = { since: prev.posthog.since, sources: counts.sources, historians: counts.historians };
  return {
    ...prev,
    sources: prev.baseline.sources + ph.sources,
    historians: prev.baseline.historians + ph.historians,
    through: w.through ?? prev.through,
    posthog: ph,
    updatedAt: now.toISOString(),
  };
}

/** Insert or replace the row for row.month; keeps rows sorted by month. */
export function upsertCsv(text, row) {
  const lines = (text || '').split('\n').map(l => l.trim()).filter(l => l && l !== CSV_HEADER);
  const mine = [row.month, row.sources_month, row.historians_month, row.sources_total, row.historians_total].join(',');
  const rows = lines.filter(l => l.split(',')[0] !== row.month);
  rows.push(mine);
  rows.sort((a, b) => a.split(',')[0].localeCompare(b.split(',')[0]));
  return `${CSV_HEADER}\n${rows.join('\n')}\n`;
}

async function hogql(env, query) {
  const res = await fetch(`${env.host}/api/projects/${env.project}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  });
  if (!res.ok) throw new Error(`PostHog query failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const row = (await res.json()).results?.[0];
  if (!row) throw new Error('PostHog returned no rows');
  return row.map(Number);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const key = process.env.POSTHOG_API_KEY;
  if (!key) {
    console.error('POSTHOG_API_KEY is not set. Add a personal API key with query:read scope as a repository secret named POSTHOG_API_KEY.');
    process.exit(1);
  }
  const env = {
    key,
    host: (process.env.POSTHOG_HOST || 'https://us.posthog.com').replace(/\/$/, ''),
    project: process.env.POSTHOG_PROJECT_ID || '665976',
  };
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const statsPath = join(root, 'web/src/data/stats.json');
  const csvPath = join(root, 'metrics/stats-monthly.csv');
  const prev = JSON.parse(await readFile(statsPath, 'utf8'));
  const w = computeWindow(prev.posthog.since);

  let s = [0, 0], h = [0, 0];
  if (!w.empty) {
    const q = buildQueries(w);
    [s, h] = await Promise.all([hogql(env, q.sources), hogql(env, q.historians)]);
  }
  const next = mergeStats(prev, w, { sources: s[0], historians: h[0] });
  const row = { month: w.month, sources_month: s[1], historians_month: h[1], sources_total: next.sources, historians_total: next.historians };

  if (dryRun) {
    console.log(JSON.stringify({ window: { since: day(w.since), end: day(w.end), empty: w.empty }, stats: next, csvRow: row }, null, 2));
    return;
  }
  if (w.empty) {
    console.log('PostHog window is still empty; nothing to record.');
    return;
  }
  await writeFile(statsPath, JSON.stringify(next, null, 2) + '\n');
  await mkdir(dirname(csvPath), { recursive: true });
  const old = await readFile(csvPath, 'utf8').catch(() => '');
  await writeFile(csvPath, upsertCsv(old, row));
  console.log(`Updated stats through ${w.through}: ${next.sources} sources, ${next.historians} historians.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
