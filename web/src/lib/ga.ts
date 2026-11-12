// Google Analytics 4 without gtag.js and without cookies.
//
// Hits go straight to GA's collect endpoint (the one gtag.js itself uses), so
// GA receives only what is passed here: a sanitized page location, the event
// name and coarse parameters. That keeps three promises gtag.js would break:
//  - no cookies (the visitor id lives in localStorage, like PostHog's; the
//    extension clears recordseek.com cookies before every capture, which would
//    otherwise mint a new GA user each time);
//  - no URL query strings (share URLs carry the record's URL, title, citation
//    and notes, and OAuth codes);
//  - no enhanced-measurement auto events (site search, form and outbound-link
//    events read raw URLs).
// The marketing site keeps a copy of this file (recordseek-site
// web/src/lib/ga.ts); both run on recordseek.com and share one localStorage,
// so a visitor's site → /share/ journey is one GA user.

export const GA_MEASUREMENT_ID = 'G-02811KS5T3';
const ENDPOINT = 'https://www.google-analytics.com/g/collect';

export type GaParam = string | number | boolean | null | undefined;
export type GaParams = Record<string, GaParam>;

const CID_KEY = 'rs_ga_cid';
const SESSION_KEY = 'rs_ga_session';
const DEFAULTS_KEY = 'rs_ga_defaults';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const ENGAGED_MS = 10_000;

interface Session {
  /** Session id: the session's start time in seconds (what gtag.js uses). */
  id: number;
  /** How many sessions this visitor has had, this one included. */
  count: number;
  /** Time of the last hit, in ms. */
  last: number;
  /** Hits sent in this session (GA's `_s` sequence). */
  hits: number;
  pageViews: number;
  engagedMs: number;
  engaged: boolean;
}

export interface GaOptions {
  measurementId?: string;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  /** Sends one hit; defaults to sendBeacon, falling back to fetch keepalive. */
  send?: (url: string) => void;
  now?: () => number;
  random?: () => number;
  language?: string;
  screen?: string;
}

export interface Ga {
  pageView(location: string, title: string, referrer?: string): void;
  event(name: string, params?: GaParams): void;
  /** Parameters added to every later event (like PostHog super properties); persisted. */
  setDefaults(set: GaParams, unset?: readonly string[]): void;
  /** Visible time since the last hit counts toward engagement; call when the page hides/shows. */
  pause(): void;
  resume(): void;
  clientId(): string;
}

function safeGet(storage: GaOptions['storage'], key: string): string | null {
  try {
    return storage ? storage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(storage: GaOptions['storage'], key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // Private mode / blocked storage: the hit still goes out, just unlinked.
  }
}

function defaultSend(url: string): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon && navigator.sendBeacon(url)) return;
  } catch {
    // fall through
  }
  try {
    void fetch(url, { method: 'POST', keepalive: true, mode: 'no-cors', credentials: 'omit' }).catch(() => {});
  } catch {
    // Analytics must never break the page.
  }
}

/** GA4 caps parameter names at 40 chars and values at 100. */
function paramEntries(params: GaParams): [string, string | number][] {
  const out: [string, string | number][] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    const name = key.slice(0, 40);
    if (typeof value === 'number') {
      if (Number.isFinite(value)) out.push([`epn.${name}`, value]);
    } else {
      out.push([`ep.${name}`, String(value).slice(0, 100)]);
    }
  }
  return out;
}

export function createGa(options: GaOptions = {}): Ga {
  const tid = options.measurementId ?? GA_MEASUREMENT_ID;
  const storage = options.storage === undefined ? (typeof localStorage !== 'undefined' ? localStorage : null) : options.storage;
  const send = options.send ?? defaultSend;
  const now = options.now ?? (() => Date.now());
  const random = options.random ?? Math.random;
  const language = options.language ?? (typeof navigator !== 'undefined' ? navigator.language?.toLowerCase() ?? '' : '');
  const screenRes = options.screen ?? (typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '');

  let firstVisit = false;
  let cid = safeGet(storage, CID_KEY);
  if (!cid || !/^\d+\.\d+$/.test(cid)) {
    cid = `${Math.floor(random() * 2_147_483_647)}.${Math.floor(now() / 1000)}`;
    safeSet(storage, CID_KEY, cid);
    firstVisit = true;
  }

  let defaults: GaParams = {};
  try {
    const raw = safeGet(storage, DEFAULTS_KEY);
    if (raw) defaults = JSON.parse(raw) as GaParams;
  } catch {
    defaults = {};
  }

  let page = { location: '', title: '', referrer: '' };
  let visibleSince: number | null = now();

  function loadSession(): Session | null {
    try {
      const raw = safeGet(storage, SESSION_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }

  /** Visible milliseconds since the last hit (GA's `_et`). */
  function takeEngagement(): number {
    if (visibleSince === null) return 0;
    const t = now();
    const ms = Math.max(0, t - visibleSince);
    visibleSince = t;
    return ms;
  }

  function hit(name: string, params: GaParams, isPageView: boolean, engagement?: number): void {
    const t = now();
    const et = engagement ?? takeEngagement();
    let session = loadSession();
    let sessionStart = false;
    if (!session || t - session.last > SESSION_TIMEOUT_MS) {
      session = {
        id: Math.floor(t / 1000),
        count: (session?.count ?? 0) + 1,
        last: t,
        hits: 0,
        pageViews: 0,
        engagedMs: 0,
        engaged: false,
      };
      sessionStart = true;
    }
    session.hits += 1;
    session.last = t;
    session.engagedMs += et;
    if (isPageView) session.pageViews += 1;
    if (session.pageViews >= 2 || session.engagedMs >= ENGAGED_MS) session.engaged = true;
    safeSet(storage, SESSION_KEY, JSON.stringify(session));

    const q = new URLSearchParams();
    q.set('v', '2');
    q.set('tid', tid);
    q.set('_p', String(Math.floor(random() * 2_147_483_647)));
    q.set('cid', cid as string);
    if (language) q.set('ul', language);
    if (screenRes) q.set('sr', screenRes);
    q.set('sid', String(session.id));
    q.set('sct', String(session.count));
    q.set('seg', session.engaged ? '1' : '0');
    q.set('_s', String(session.hits));
    if (sessionStart) q.set('_ss', '1');
    if (firstVisit) {
      q.set('_fv', '1');
      firstVisit = false;
    }
    if (page.location) q.set('dl', page.location);
    if (page.title) q.set('dt', page.title);
    if (page.referrer) q.set('dr', page.referrer);
    q.set('en', name);
    if (et > 0) q.set('_et', String(et));
    for (const [key, value] of paramEntries({ ...defaults, ...params })) q.set(key, String(value));
    send(`${ENDPOINT}?${q.toString()}`);
  }

  return {
    pageView(location, title, referrer = '') {
      page = { location, title, referrer };
      hit('page_view', {}, true);
    },
    event(name, params = {}) {
      hit(name.slice(0, 40), params, false);
    },
    setDefaults(set, unset = []) {
      const next: GaParams = { ...defaults };
      for (const key of unset) delete next[key];
      for (const [key, value] of Object.entries(set)) {
        if (value === null || value === undefined || value === '') delete next[key];
        else next[key] = value;
      }
      defaults = next;
      safeSet(storage, DEFAULTS_KEY, JSON.stringify(defaults));
    },
    pause() {
      if (visibleSince === null) return;
      const ms = takeEngagement();
      visibleSince = null;
      if (ms >= 1000) hit('user_engagement', {}, false, ms);
    },
    resume() {
      if (visibleSince === null) visibleSince = now();
    },
    clientId() {
      return cid as string;
    },
  };
}
