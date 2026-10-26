#!/usr/bin/env node
// Updates the Tutorials page's video list from YouTube. See README ("Tutorials page").
//
// Usage: node scripts/update-tutorials.mjs [--dry-run]
// Env:   YOUTUBE_API_KEY  optional YouTube Data API v3 key. With it, search + metadata come
//                         from the official API (~200 quota units/run). Without it, YouTube's
//                         public search and watch pages are read instead.
//
// Every run: search YouTube for each query, keep the hits that mention RecordSeek (or its old
// nickname TreeConnect), re-fetch metadata for every video already listed, drop videos that
// are gone or private, and write web/src/data/tutorials.json sorted newest first.
// `firstSeen` survives across runs; `web/src/data/tutorials.curation.json` pins or hides ids.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const QUERIES = ['recordseek', 'record seek', 'recordseek tutorial', 'recordseek familysearch', 'treeconnect familysearch'];
export const RELEVANT = /record\s*seek|tree\s*connect/i;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const DESCRIPTION_MAX = 400;

export const isRelevant = v => RELEVANT.test(`${v.title ?? ''}\n${v.description ?? ''}`);
const day = d => d.toISOString().slice(0, 10);
const pause = ms => new Promise(r => setTimeout(r, ms));

/** "PT1H2M3S" → 3723 */
export function parseDuration(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? '');
  if (!m) return 0;
  const [, d = 0, h = 0, min = 0, s = 0] = m;
  return Number(d) * 86400 + Number(h) * 3600 + Number(min) * 60 + Number(s);
}

/** Shortens a YouTube description to one trimmed paragraph-ish block. */
export function trimDescription(text) {
  const t = (text ?? '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return t.length > DESCRIPTION_MAX ? `${t.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…` : t;
}

/**
 * Pulls `var <name> = {...}` out of a YouTube page, matching braces (and skipping strings)
 * instead of trusting a regex, since the JSON contains "};" sequences of its own.
 */
export function extractJson(html, name) {
  const start = html.indexOf(`var ${name} = `);
  if (start < 0) return null;
  let i = html.indexOf('{', start);
  if (i < 0) return null;
  const from = i;
  let depth = 0, inString = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) {
      try { return JSON.parse(html.slice(from, i + 1)); } catch { return null; }
    }
  }
  return null;
}

const text = x => x?.simpleText ?? x?.runs?.map(r => r.text).join('') ?? '';

/** Search results page → [{ id, title, channel, channelId, description }] in page order. */
export function parseSearchPage(html) {
  const data = extractJson(html, 'ytInitialData');
  if (!data) throw new Error('YouTube search page had no ytInitialData (consent or bot check page?)');
  const out = [];
  const seen = new Set();
  const walk = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    const v = node.videoRenderer;
    if (v?.videoId && !seen.has(v.videoId)) {
      seen.add(v.videoId);
      out.push({
        id: v.videoId,
        title: text(v.title),
        channel: text(v.ownerText) || text(v.longBylineText),
        channelId: v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ?? null,
        description: (v.detailedMetadataSnippets ?? []).map(s => text(s.snippetText)).join(' '),
      });
    }
    for (const k in node) walk(node[k]);
  };
  walk(data);
  return out;
}

/** Watch page → video record, or { id, ok: false } when the video is gone/private/unplayable. */
export function parseWatchPage(html, id) {
  const p = extractJson(html, 'ytInitialPlayerResponse');
  if (!p) throw new Error(`YouTube watch page for ${id} had no ytInitialPlayerResponse (consent or bot check page?)`);
  const status = p.playabilityStatus?.status;
  const d = p.videoDetails;
  if (status !== 'OK' || !d?.videoId) return { id, ok: false, status: status ?? 'UNKNOWN' };
  const mf = p.microformat?.playerMicroformatRenderer ?? {};
  return {
    ok: true,
    id: d.videoId,
    title: d.title ?? '',
    channel: d.author ?? '',
    channelId: d.channelId ?? null,
    publishedAt: (mf.publishDate ?? mf.uploadDate ?? '').slice(0, 10) || null,
    durationSeconds: Number(d.lengthSeconds ?? 0),
    views: Number(d.viewCount ?? 0),
    description: trimDescription(d.shortDescription),
  };
}

/** videos.list item → video record (same shape as parseWatchPage). */
export function normalizeApiVideo(item) {
  const s = item.snippet ?? {};
  return {
    ok: true,
    id: item.id,
    title: s.title ?? '',
    channel: s.channelTitle ?? '',
    channelId: s.channelId ?? null,
    publishedAt: (s.publishedAt ?? '').slice(0, 10) || null,
    durationSeconds: parseDuration(item.contentDetails?.duration),
    views: Number(item.statistics?.viewCount ?? 0),
    description: trimDescription(s.description),
  };
}

/**
 * Fresh metadata wins; `firstSeen` is kept from the previous list; excluded ids are dropped;
 * the result is sorted newest first (ties by title) so the JSON diff stays readable.
 */
export function mergeVideos(previous, fetched, { today, exclude = [] }) {
  const prev = new Map(previous.map(v => [v.id, v]));
  const hide = new Set(exclude);
  const out = fetched
    .filter(v => v.ok && !hide.has(v.id))
    .map(({ ok, status, ...v }) => ({ ...v, firstSeen: prev.get(v.id)?.firstSeen ?? today }));
  out.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || a.title.localeCompare(b.title));
  return out;
}

export function summarize(previous, next) {
  const before = new Set(previous.map(v => v.id)), after = new Set(next.map(v => v.id));
  return { added: next.filter(v => !before.has(v.id)), removed: previous.filter(v => !after.has(v.id)) };
}

// ------------------------------------------------------------------ fetchers
async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', Cookie: 'CONSENT=YES+; SOCS=CAI' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

async function getJson(url) {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(`YouTube API ${res.status}: ${body.error?.message ?? 'request failed'}`);
  return body;
}

const api = key => ({
  async search(q) {
    const u = new URL('https://www.googleapis.com/youtube/v3/search');
    u.search = new URLSearchParams({ part: 'snippet', type: 'video', maxResults: '50', q, key });
    const body = await getJson(u);
    return (body.items ?? []).map(i => ({ id: i.id.videoId, title: i.snippet.title, channel: i.snippet.channelTitle, channelId: i.snippet.channelId, description: i.snippet.description }));
  },
  async details(ids) {
    const found = new Map();
    for (let i = 0; i < ids.length; i += 50) {
      const u = new URL('https://www.googleapis.com/youtube/v3/videos');
      u.search = new URLSearchParams({ part: 'snippet,contentDetails,statistics', id: ids.slice(i, i + 50).join(','), key });
      for (const item of (await getJson(u)).items ?? []) found.set(item.id, normalizeApiVideo(item));
    }
    return ids.map(id => found.get(id) ?? { id, ok: false, status: 'MISSING' });
  },
});

const scraper = () => ({
  async search(q) {
    return parseSearchPage(await getText(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=en&gl=US`));
  },
  async details(ids) {
    const out = [];
    for (const id of ids) {
      out.push(parseWatchPage(await getText(`https://www.youtube.com/watch?v=${id}&hl=en&gl=US`), id));
      await pause(400);
    }
    return out;
  },
});

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const dataPath = join(root, 'web/src/data/tutorials.json');
  const curationPath = join(root, 'web/src/data/tutorials.curation.json');
  const previous = JSON.parse(await readFile(dataPath, 'utf8').catch(() => '{"videos":[]}'));
  const curation = JSON.parse(await readFile(curationPath, 'utf8').catch(() => '{}'));
  const include = curation.include ?? [], exclude = new Set(curation.exclude ?? []);
  const source = process.env.YOUTUBE_API_KEY ? api(process.env.YOUTUBE_API_KEY) : scraper();
  console.log(process.env.YOUTUBE_API_KEY ? 'Using the YouTube Data API.' : 'No YOUTUBE_API_KEY; reading YouTube pages directly.');

  // Known ids are always re-checked; new search hits must look like they are about RecordSeek.
  const known = new Set([...previous.videos.map(v => v.id), ...include]);
  const candidates = new Set(known);
  for (const q of QUERIES) {
    const hits = await source.search(q);
    const fresh = hits.filter(h => !known.has(h.id) && !exclude.has(h.id) && isRelevant(h));
    fresh.forEach(h => candidates.add(h.id));
    console.log(`"${q}": ${hits.length} results, ${fresh.length} new relevant`);
  }

  const details = await source.details([...candidates].filter(id => !exclude.has(id)));
  // Re-check relevance on the full description; pinned and already-listed videos are exempt.
  const kept = details.filter(v => !v.ok || known.has(v.id) || isRelevant(v));
  for (const v of details) if (!v.ok) console.log(`Dropping ${v.id} (${v.status})`);

  const today = day(new Date());
  const videos = mergeVideos(previous.videos, kept, { today, exclude: [...exclude] });
  const { added, removed } = summarize(previous.videos, videos);
  for (const v of added) console.log(`+ ${v.id} ${v.publishedAt} ${v.channel} — ${v.title}`);
  for (const v of removed) console.log(`- ${v.id} ${v.channel} — ${v.title}`);
  console.log(`${videos.length} videos (${added.length} added, ${removed.length} removed).`);
  if (dryRun) return;
  const next = { updatedAt: new Date().toISOString(), queries: QUERIES, videos };
  await writeFile(dataPath, JSON.stringify(next, null, 2) + '\n');
  console.log(`Wrote ${dataPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
