import { describe, expect, it } from 'vitest';
import { createGa, GA_MEASUREMENT_ID } from './ga';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

function setup(start = 1_700_000_000_000) {
  const storage = memoryStorage();
  const sent: URLSearchParams[] = [];
  let t = start;
  const opts = {
    storage,
    send: (url: string) => {
      expect(url.startsWith('https://www.google-analytics.com/g/collect?')).toBe(true);
      sent.push(new URL(url).searchParams);
    },
    now: () => t,
    random: () => 0.5,
    language: 'en-us',
    screen: '390x844',
  };
  return { storage, sent, opts, advance: (ms: number) => (t += ms), ga: createGa(opts) };
}

describe('createGa', () => {
  it('sends a first page view with session start, first visit and the given location only', () => {
    const { ga, sent } = setup();
    ga.pageView('https://recordseek.com/share/#/fs-search', 'RecordSeek', 'https://www.ancestry.com');
    expect(sent).toHaveLength(1);
    const q = sent[0]!;
    expect(q.get('tid')).toBe(GA_MEASUREMENT_ID);
    expect(q.get('en')).toBe('page_view');
    expect(q.get('dl')).toBe('https://recordseek.com/share/#/fs-search');
    expect(q.get('dr')).toBe('https://www.ancestry.com');
    expect(q.get('_ss')).toBe('1');
    expect(q.get('_fv')).toBe('1');
    expect(q.get('cid')).toMatch(/^\d+\.\d+$/);
    expect(q.get('sid')).toBe('1700000000');
    expect(q.get('sct')).toBe('1');
  });

  it('keeps the client id across instances (localStorage, no cookie) and only marks the first visit once', () => {
    const { ga, sent, opts } = setup();
    ga.pageView('https://recordseek.com/', 'RecordSeek');
    ga.event('x');
    const again = createGa(opts);
    again.event('y');
    expect(sent[1]!.get('_fv')).toBeNull();
    expect(sent[2]!.get('_fv')).toBeNull();
    expect(sent[2]!.get('cid')).toBe(sent[0]!.get('cid'));
    expect(sent[2]!.get('_ss')).toBeNull();
    expect(sent[2]!.get('_s')).toBe('3');
  });

  it('starts a new session after 30 idle minutes', () => {
    const { ga, sent, advance } = setup();
    ga.pageView('https://recordseek.com/', 'RecordSeek');
    advance(31 * 60 * 1000);
    ga.event('later');
    expect(sent[1]!.get('_ss')).toBe('1');
    expect(sent[1]!.get('sct')).toBe('2');
    expect(sent[1]!.get('_s')).toBe('1');
  });

  it('marks the session engaged after two page views', () => {
    const { ga, sent } = setup();
    ga.pageView('https://recordseek.com/share/#/', 'RecordSeek');
    ga.pageView('https://recordseek.com/share/#/fs-search', 'RecordSeek');
    expect(sent[0]!.get('seg')).toBe('0');
    expect(sent[1]!.get('seg')).toBe('1');
  });

  it('adds persisted defaults to every event, typed by value, and can clear them', () => {
    const { ga, sent, opts } = setup();
    ga.setDefaults({ capture_client: 'ios_app', referrer_host: 'findagrave.com' });
    ga.event('capture_opened', { has_notes: false, count: 3, empty: '' });
    const q = sent[0]!;
    expect(q.get('ep.capture_client')).toBe('ios_app');
    expect(q.get('ep.referrer_host')).toBe('findagrave.com');
    expect(q.get('ep.has_notes')).toBe('false');
    expect(q.get('epn.count')).toBe('3');
    expect(q.has('ep.empty')).toBe(false);

    const reloaded = createGa(opts);
    reloaded.setDefaults({ capture_client: 'chrome_extension' }, ['referrer_host']);
    reloaded.event('fs_source_created');
    expect(sent[1]!.get('ep.capture_client')).toBe('chrome_extension');
    expect(sent[1]!.has('ep.referrer_host')).toBe(false);
  });

  it('reports visible time as engagement and pauses while hidden', () => {
    const { ga, sent, advance } = setup();
    ga.pageView('https://recordseek.com/', 'RecordSeek');
    advance(12_000);
    ga.pause();
    expect(sent[1]!.get('en')).toBe('user_engagement');
    expect(sent[1]!.get('_et')).toBe('12000');
    expect(sent[1]!.get('seg')).toBe('1');
    advance(60_000);
    ga.resume();
    advance(2_000);
    ga.event('back');
    expect(sent[2]!.get('_et')).toBe('2000');
  });

  it('still sends when storage throws', () => {
    const sent: string[] = [];
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {},
    };
    const ga = createGa({ storage: broken, send: (u) => sent.push(u), language: '', screen: '' });
    ga.event('x');
    expect(sent).toHaveLength(1);
  });
});
