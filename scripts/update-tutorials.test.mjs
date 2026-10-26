import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJson, isRelevant, mergeVideos, normalizeApiVideo, parseDuration, parseSearchPage, parseWatchPage, summarize, trimDescription } from './update-tutorials.mjs';

test('relevance: RecordSeek or TreeConnect in title or description, any spacing/case', () => {
  assert.equal(isRelevant({ title: 'How to use Recordseek' }), true);
  assert.equal(isRelevant({ title: 'Using "Record Seek" to Create Sources' }), true);
  assert.equal(isRelevant({ title: 'Adding sources', description: 'with Tree  Connect' }), true);
  assert.equal(isRelevant({ title: 'I SEEK JESUS - Soaking worship', description: 'Central Record' }), false);
});

test('ISO 8601 durations', () => {
  assert.equal(parseDuration('PT8M47S'), 527);
  assert.equal(parseDuration('PT1H2M3S'), 3723);
  assert.equal(parseDuration('PT32S'), 32);
  assert.equal(parseDuration('P1DT1S'), 86401);
  assert.equal(parseDuration(undefined), 0);
});

test('extractJson matches braces through strings and nested objects', () => {
  const html = `<script>var ytInitialData = {"a":{"b":"};{"},"c":[{"d":1}]};</script><script>var other = {"x":1};</script>`;
  assert.deepEqual(extractJson(html, 'ytInitialData'), { a: { b: '};{' }, c: [{ d: 1 }] });
  assert.deepEqual(extractJson(html, 'other'), { x: 1 });
  assert.equal(extractJson(html, 'missing'), null);
});

test('search page: every videoRenderer once, in order, with snippet text', () => {
  const renderer = (id, title) => ({ videoRenderer: { videoId: id, title: { runs: [{ text: title }] }, ownerText: { runs: [{ text: 'Chan', navigationEndpoint: { browseEndpoint: { browseId: 'UC1' } } }] }, detailedMetadataSnippets: [{ snippetText: { runs: [{ text: 'Uses ' }, { text: 'RecordSeek' }] } }] } });
  const data = { contents: [renderer('aaaaaaaaaaa', 'First'), { shelf: [renderer('bbbbbbbbbbb', 'Second'), renderer('aaaaaaaaaaa', 'Dup')] }] };
  const html = `<html><script>var ytInitialData = ${JSON.stringify(data)};</script></html>`;
  const hits = parseSearchPage(html);
  assert.deepEqual(hits.map(h => h.id), ['aaaaaaaaaaa', 'bbbbbbbbbbb']);
  assert.deepEqual(hits[0], { id: 'aaaaaaaaaaa', title: 'First', channel: 'Chan', channelId: 'UC1', description: 'Uses RecordSeek' });
  assert.throws(() => parseSearchPage('<html>consent page</html>'), /ytInitialData/);
});

test('watch page: playable video → record; private/removed → not ok', () => {
  const page = p => `<script>var ytInitialPlayerResponse = ${JSON.stringify(p)};var meta = {};</script>`;
  const ok = page({ playabilityStatus: { status: 'OK' }, videoDetails: { videoId: 'Nm2hNlILPuA', title: 'RecordSeek Tutorial', author: 'This Is Family History', channelId: 'UC-x', lengthSeconds: '604', viewCount: '428', shortDescription: 'Quick tutorial.\r\n\n\n\nMore.' }, microformat: { playerMicroformatRenderer: { publishDate: '2018-03-11T17:57:52-07:00' } } });
  assert.deepEqual(parseWatchPage(ok, 'Nm2hNlILPuA'), { ok: true, id: 'Nm2hNlILPuA', title: 'RecordSeek Tutorial', channel: 'This Is Family History', channelId: 'UC-x', publishedAt: '2018-03-11', durationSeconds: 604, views: 428, description: 'Quick tutorial.\n\nMore.' });
  assert.deepEqual(parseWatchPage(page({ playabilityStatus: { status: 'LOGIN_REQUIRED', reason: 'This is a private video' } }), 'xxxxxxxxxxx'), { id: 'xxxxxxxxxxx', ok: false, status: 'LOGIN_REQUIRED' });
  assert.throws(() => parseWatchPage('<html>bot check</html>', 'yyy'), /ytInitialPlayerResponse/);
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

test('merge keeps firstSeen, drops gone and excluded, sorts newest first', () => {
  const previous = [{ id: 'old', title: 'Old', publishedAt: '2015-01-01', firstSeen: '2026-10-26' }, { id: 'gone', title: 'Gone', publishedAt: '2016-01-01', firstSeen: '2026-10-26' }];
  const fetched = [
    { ok: true, id: 'old', title: 'Old (renamed)', publishedAt: '2015-01-01', views: 5 },
    { ok: false, id: 'gone', status: 'ERROR' },
    { ok: true, id: 'new', title: 'New', publishedAt: '2026-10-01', views: 1 },
    { ok: true, id: 'hidden', title: 'Hidden', publishedAt: '2026-10-02', views: 1 },
  ];
  const merged = mergeVideos(previous, fetched, { today: '2026-11-02', exclude: ['hidden'] });
  assert.deepEqual(merged.map(v => v.id), ['new', 'old']);
  assert.equal(merged[1].firstSeen, '2026-10-26');
  assert.equal(merged[1].title, 'Old (renamed)');
  assert.equal(merged[0].firstSeen, '2026-11-02');
  assert.equal('ok' in merged[0], false);
  const { added, removed } = summarize(previous, merged);
  assert.deepEqual(added.map(v => v.id), ['new']);
  assert.deepEqual(removed.map(v => v.id), ['gone']);
});
