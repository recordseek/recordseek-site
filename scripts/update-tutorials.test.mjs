import test from 'node:test';
import assert from 'node:assert/strict';
import { approxDate, assertSaneRemovals, extractJson, isRelevant, mergeVideos, normalizeApiVideo, parseClock, parseDuration, parseSearchPage, parseViews, parseWatchPage, recordFromHit, summarize, trimDescription } from './update-tutorials.mjs';

test('relevance: RecordSeek or TreeConnect in title or description, any spacing/case', () => {
  assert.equal(isRelevant({ title: 'How to use Recordseek' }), true);
  assert.equal(isRelevant({ title: 'Using "Record Seek" to Create Sources' }), true);
  assert.equal(isRelevant({ title: 'Adding sources', description: 'with Tree  Connect' }), true);
  assert.equal(isRelevant({ title: 'I SEEK JESUS - Soaking worship', description: 'Central Record' }), false);
});

test('durations, clocks, view counts and relative dates', () => {
  assert.equal(parseDuration('PT8M47S'), 527);
  assert.equal(parseDuration('PT1H2M3S'), 3723);
  assert.equal(parseDuration('P1DT1S'), 86401);
  assert.equal(parseDuration(undefined), 0);
  assert.equal(parseClock('8:47'), 527);
  assert.equal(parseClock('1:02:03'), 3723);
  assert.equal(parseClock(''), 0);
  assert.equal(parseViews('9,208 views'), 9208);
  assert.equal(parseViews('1.2K views'), 1200);
  assert.equal(parseViews('No views'), 0);
  const now = new Date('2026-10-26T12:00:00Z');
  assert.equal(approxDate('8 years ago', now), '2018-10-26');
  assert.equal(approxDate('Streamed 3 weeks ago', now), '2026-10-05');
  assert.equal(approxDate('5 months ago', now), '2026-05-26');
  assert.equal(approxDate('2 hours ago', now), '2026-10-26');
  assert.equal(approxDate('', now), null);
});

test('extractJson matches braces through strings and nested objects', () => {
  const html = `<script>var ytInitialData = {"a":{"b":"};{"},"c":[{"d":1}]};</script><script>var other = {"x":1};</script>`;
  assert.deepEqual(extractJson(html, 'ytInitialData'), { a: { b: '};{' }, c: [{ d: 1 }] });
  assert.deepEqual(extractJson(html, 'other'), { x: 1 });
  assert.equal(extractJson(html, 'missing'), null);
});

const renderer = (id, title) => ({ videoRenderer: { videoId: id, title: { runs: [{ text: title }] }, ownerText: { runs: [{ text: 'Chan', navigationEndpoint: { browseEndpoint: { browseId: 'UC1' } } }] }, detailedMetadataSnippets: [{ snippetText: { runs: [{ text: 'Uses ' }, { text: 'RecordSeek' }] } }], publishedTimeText: { simpleText: '8 years ago' }, lengthText: { simpleText: '8:47' }, viewCountText: { simpleText: '9,208 views' } } });

test('search page: every videoRenderer once, in order, with the page details', () => {
  const data = { contents: [renderer('aaaaaaaaaaa', 'First'), { shelf: [renderer('bbbbbbbbbbb', 'Second'), renderer('aaaaaaaaaaa', 'Dup')] }] };
  const html = `<html><script>var ytInitialData = ${JSON.stringify(data)};</script></html>`;
  const hits = parseSearchPage(html);
  assert.deepEqual(hits.map(h => h.id), ['aaaaaaaaaaa', 'bbbbbbbbbbb']);
  assert.deepEqual(hits[0], { id: 'aaaaaaaaaaa', title: 'First', channel: 'Chan', channelId: 'UC1', description: 'Uses RecordSeek', publishedText: '8 years ago', lengthText: '8:47', viewText: '9,208 views' });
  assert.throws(() => parseSearchPage('<html>consent page</html>'), /ytInitialData/);
});

test('a record built from a search hit is marked approximate', () => {
  const [hit] = parseSearchPage(`<script>var ytInitialData = ${JSON.stringify({ c: [renderer('aaaaaaaaaaa', 'First')] })};</script>`);
  const r = recordFromHit(hit, new Date('2026-10-26T00:00:00Z'));
  assert.deepEqual(r, { ok: true, id: 'aaaaaaaaaaa', title: 'First', channel: 'Chan', channelId: 'UC1', publishedAt: '2018-10-26', durationSeconds: 527, views: 9208, description: 'Uses RecordSeek', approximate: true });
});

test('watch page: playable → record; private/removed → gone; bot check → unverified', () => {
  const page = p => `<script>var ytInitialPlayerResponse = ${JSON.stringify(p)};var meta = {};</script>`;
  const ok = page({ playabilityStatus: { status: 'OK' }, videoDetails: { videoId: 'Nm2hNlILPuA', title: 'RecordSeek Tutorial', author: 'This Is Family History', channelId: 'UC-x', lengthSeconds: '604', viewCount: '428', shortDescription: 'Quick tutorial.\r\n\n\n\nMore.' }, microformat: { playerMicroformatRenderer: { publishDate: '2018-03-11T17:57:52-07:00' } } });
  assert.deepEqual(parseWatchPage(ok, 'Nm2hNlILPuA'), { ok: true, id: 'Nm2hNlILPuA', title: 'RecordSeek Tutorial', channel: 'This Is Family History', channelId: 'UC-x', publishedAt: '2018-03-11', durationSeconds: 604, views: 428, description: 'Quick tutorial.\n\nMore.' });
  const priv = parseWatchPage(page({ playabilityStatus: { status: 'LOGIN_REQUIRED', reason: 'This is a private video. Please sign in to verify that you may see it.' } }), 'xxxxxxxxxxx');
  assert.equal(priv.ok, false); assert.equal(priv.gone, true);
  const removed = parseWatchPage(page({ playabilityStatus: { status: 'ERROR', reason: 'Video unavailable' } }), 'yyyyyyyyyyy');
  assert.equal(removed.gone, true);
  const bot = parseWatchPage(page({ playabilityStatus: { status: 'LOGIN_REQUIRED', reason: 'Sign in to confirm you’re not a bot' } }), 'zzzzzzzzzzz');
  assert.equal(bot.ok, false); assert.equal(bot.gone, false); assert.equal(bot.status, 'LOGIN_REQUIRED');
  const blank = parseWatchPage('<html>bot check</html>', 'wwwwwwwwwww');
  assert.deepEqual(blank, { id: 'wwwwwwwwwww', ok: false, gone: false, status: 'NO_PLAYER_RESPONSE' });
});

test('API video normalizes to the same shape', () => {
  const v = normalizeApiVideo({ id: 'GgRm53mhoNI', snippet: { title: 'RecordSeek by James Tanner', channelTitle: 'BYU', channelId: 'UC2', publishedAt: '2015-09-15T20:11:00Z', description: 'Intro' }, contentDetails: { duration: 'PT8M47S' }, statistics: { viewCount: '9208' } });
  assert.deepEqual(v, { ok: true, id: 'GgRm53mhoNI', title: 'RecordSeek by James Tanner', channel: 'BYU', channelId: 'UC2', publishedAt: '2015-09-15', durationSeconds: 527, views: 9208, description: 'Intro' });
});

test('descriptions are trimmed to a bounded length', () => {
  assert.equal(trimDescription('  hi  \n\n\n\nthere '), 'hi\n\nthere');
  const long = trimDescription('x'.repeat(1000));
  assert.ok(long.length <= 400 && long.endsWith('…'));
});

test('merge: fresh wins, unverified keeps the old record or uses the search hit, gone and excluded drop, newest first', () => {
  const previous = [
    { id: 'old', title: 'Old', channel: 'C', publishedAt: '2015-01-01', durationSeconds: 1, views: 5, firstSeen: '2026-10-26' },
    { id: 'gone', title: 'Gone', channel: 'C', publishedAt: '2016-01-01', durationSeconds: 1, views: 5, firstSeen: '2026-10-26' },
    { id: 'blocked', title: 'Blocked', channel: 'C', publishedAt: '2017-01-01', durationSeconds: 1, views: 5, firstSeen: '2026-10-26' },
  ];
  const fetched = [
    { ok: true, id: 'old', title: 'Old (renamed)', channel: 'C', publishedAt: '2015-01-01', durationSeconds: 1, views: 9 },
    { ok: false, gone: true, id: 'gone', status: 'ERROR' },
    { ok: false, gone: false, id: 'blocked', status: 'LOGIN_REQUIRED' },
    { ok: true, id: 'new', title: 'New', channel: 'C', publishedAt: '2026-10-01', durationSeconds: 1, views: 1 },
    { ok: false, gone: false, id: 'newblocked', status: 'LOGIN_REQUIRED' },
    { ok: false, gone: false, id: 'unknown', status: 'LOGIN_REQUIRED' },
    { ok: true, id: 'hidden', title: 'Hidden', channel: 'C', publishedAt: '2026-10-02', durationSeconds: 1, views: 1 },
  ];
  const hits = new Map([['newblocked', { id: 'newblocked', title: 'From search', channel: 'C', publishedText: '2 weeks ago', lengthText: '3:00', viewText: '12 views' }]]);
  const merged = mergeVideos(previous, fetched, { today: '2026-11-02', exclude: ['hidden'], hits, now: new Date('2026-11-02T00:00:00Z') });
  assert.deepEqual(merged.map(v => v.id), ['newblocked', 'new', 'blocked', 'old']);
  const byId = Object.fromEntries(merged.map(v => [v.id, v]));
  assert.equal(byId.old.title, 'Old (renamed)'); assert.equal(byId.old.views, 9); assert.equal(byId.old.firstSeen, '2026-10-26');
  assert.equal(byId.blocked.title, 'Blocked'); assert.equal(byId.blocked.firstSeen, '2026-10-26');
  assert.equal(byId.new.firstSeen, '2026-11-02');
  assert.deepEqual(byId.newblocked, { id: 'newblocked', title: 'From search', channel: 'C', channelId: null, publishedAt: '2026-10-19', durationSeconds: 180, views: 12, description: '', approximate: true, firstSeen: '2026-11-02' });
  assert.equal('ok' in byId.new, false);
  const { added, removed } = summarize(previous, merged);
  assert.deepEqual(added.map(v => v.id), ['newblocked', 'new']);
  assert.deepEqual(removed.map(v => v.id), ['gone']);
});

test('refuses to drop more than a couple of videos in one run', () => {
  const prev = Array.from({ length: 22 }, (_, i) => ({ id: `v${i}` }));
  assert.doesNotThrow(() => assertSaneRemovals(prev, prev.slice(0, 2)));
  assert.doesNotThrow(() => assertSaneRemovals(prev, prev.slice(0, 6)));
  assert.throws(() => assertSaneRemovals(prev, prev.slice(0, 7)), /Refusing to drop 7 of 22/);
  assert.throws(() => assertSaneRemovals(prev, prev), /Refusing/);
  assert.doesNotThrow(() => assertSaneRemovals([{ id: 'a' }, { id: 'b' }], [{ id: 'a' }, { id: 'b' }]));
});
