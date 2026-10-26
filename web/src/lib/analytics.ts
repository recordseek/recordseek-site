// PostHog analytics for the marketing site. Same project as the /share/ app, so
// a visitor's site → share journey is one anonymous person. Production builds
// only; the site never identifies anyone (/share/ identifies signed-in
// FamilySearch users by a hash of their user id). Autocapture is on here (it is off in /share/,
// which shows people's family records).
import type { PostHog } from 'posthog-js';

// Public client key (safe to ship); VITE_POSTHOG_KEY overrides it.
const POSTHOG_KEY = import.meta.env['VITE_POSTHOG_KEY'] || 'phc_AzZzdRdxntXqHxNiJ4nM9duEnprenXt8XnKA2NKEoeFG';

type Props = Record<string, string | number | boolean | null>;

/**
 * Which deployment served this page, from the hostname — matches the /share/
 * app's `deployEnv` so events from both surfaces share one `env` property.
 */
function deployEnv(): string {
  const h = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  if (h === 'recordseek.com' || h === 'www.recordseek.com') return 'production';
  if (h.endsWith('.github.io')) return 'stage';
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')) return 'development';
  return h || 'unknown';
}

// Site build version (git SHA), injected by scripts/release.sh; empty in dev.
const SITE_RELEASE = (import.meta.env['VITE_SITE_RELEASE'] as string | undefined) || '';

let client: PostHog | null = null;
const queued: [string, Props | undefined][] = [];

export function track(event: string, props?: Props): void {
  if (client) client.capture(event, props);
  else if (queued.length < 50) queued.push([event, props]);
}

const STORES: [RegExp, string][] = [
  [/chrome\.google\.com|chromewebstore\.google\.com/, 'Chrome'],
  [/addons\.mozilla\.org/, 'Firefox'],
  [/addons\.opera\.com/, 'Opera'],
  [/microsoftedge\.microsoft\.com/, 'Edge'],
  [/apps\.apple\.com/, 'Safari'],
];

function placement(el: Element): string {
  if (el.closest('.download-dialog')) return 'dialog';
  if (el.closest('#extensions')) return 'browsers_section';
  if (el.closest('header')) return 'header';
  return 'page';
}

// Named events come from delegated listeners keyed on links and class names, so
// the Lovable-generated markup needs no per-element changes.
function listen(): void {
  document.addEventListener('click', event => {
    const link = (event.target as Element | null)?.closest?.('a');
    if (!link) return;
    if (link.hasAttribute('data-bookmarklet')) {
      track('bookmarklet_clicked', { page: location.pathname });
      return;
    }
    const href = link.getAttribute('href') ?? '';
    const store = STORES.find(([pattern]) => pattern.test(href));
    // Chromium browsers all share the Chrome Web Store link, so the button names its browser.
    if (store) track('extension_store_clicked', { browser: link.dataset['browser'] ?? store[1], store: store[1], placement: placement(link) });
  }, true);
  document.addEventListener('dragstart', event => {
    const link = (event.target as Element | null)?.closest?.('a[data-bookmarklet]');
    if (link) track('bookmarklet_dragged', { page: location.pathname });
  }, true);
}

export function initAnalytics(): void {
  if (!import.meta.env.PROD || client || typeof window === 'undefined') return;
  listen();
  void import('posthog-js').then(({ default: posthog }) => {
    posthog.init(POSTHOG_KEY, {
      api_host: 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      // Not a cookie, matching /share/ (the extension clears recordseek.com cookies).
      persistence: 'localStorage',
      capture_pageview: 'history_change',
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: true,
      disable_surveys: true,
    });
    posthog.register({ app: 'site', env: deployEnv(), ...(SITE_RELEASE ? { app_version: SITE_RELEASE } : {}) });
    client = posthog;
    for (const [event, props] of queued.splice(0)) posthog.capture(event, props);
  });
}
