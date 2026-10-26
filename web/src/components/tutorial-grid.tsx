import { useState } from 'react';
import { Play } from 'lucide-react';
import { track } from '@/lib/analytics';

// One entry of web/src/data/tutorials.json (written by scripts/update-tutorials.mjs).
export type Tutorial = {
  id: string;
  title: string;
  channel: string;
  channelId?: string | null;
  publishedAt: string | null;
  durationSeconds: number;
  views: number;
  description?: string;
  firstSeen: string;
};

export type SortKey = 'newest' | 'popular';

/** 604 → "10:04"; 3723 → "1:02:03". */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

const trimZero = (s: string) => s.replace(/\.0$/, '');

/** 9208 → "9.2K views"; 1 → "1 view". */
export function formatViews(n: number): string {
  const v = Math.max(0, Math.floor(n));
  const short = v >= 1_000_000 ? `${trimZero((v / 1_000_000).toFixed(1))}M` : v >= 1000 ? `${trimZero((v / 1000).toFixed(1))}K` : String(v);
  return `${short} ${v === 1 ? 'view' : 'views'}`;
}

/** "2018-03-11" → "Mar 2018" (UTC, so the month never shifts with the viewer's time zone). */
export function formatMonth(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function sortTutorials(list: readonly Tutorial[], by: SortKey): Tutorial[] {
  const byDate = (a: Tutorial, b: Tutorial) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
  const byViews = (a: Tutorial, b: Tutorial) => b.views - a.views;
  return [...list].sort(by === 'popular' ? (a, b) => byViews(a, b) || byDate(a, b) : (a, b) => byDate(a, b) || byViews(a, b));
}

/** Published within the 90 days before `asOf` (the list's updatedAt, so the prerender and the browser agree). */
export function isNew(video: Tutorial, asOf: string): boolean {
  if (!video.publishedAt) return false;
  const age = new Date(asOf).getTime() - new Date(`${video.publishedAt}T00:00:00Z`).getTime();
  return age >= 0 && age <= 90 * 86_400_000;
}

/**
 * The videos the homepage showcases: the most watched ones, one per channel so a
 * prolific family history center does not fill every slot. Falls back to the next
 * most watched when there are fewer channels than slots.
 */
export function pickFeatured(list: readonly Tutorial[], n = 3): Tutorial[] {
  const sorted = sortTutorials(list, 'popular');
  const picked: Tutorial[] = [];
  const channels = new Set<string>();
  for (const v of sorted) {
    if (picked.length >= n) break;
    if (channels.has(v.channel)) continue;
    channels.add(v.channel); picked.push(v);
  }
  for (const v of sorted) {
    if (picked.length >= n) break;
    if (!picked.includes(v)) picked.push(v);
  }
  return picked;
}

export function TutorialGrid({ tutorials, asOf }: { tutorials: readonly Tutorial[]; asOf: string }) {
  const [sort, setSort] = useState<SortKey>('newest');
  const [playing, setPlaying] = useState<string | null>(null);
  const channels = new Set(tutorials.map(t => t.channel)).size;
  const play = (id: string) => { setPlaying(id); track('tutorial_played', { video: id }); };
  return <>
    <div className="tutorial-toolbar">
      <span>{tutorials.length} videos from {channels} channels</span>
      <div className="sort-toggle" role="group" aria-label="Sort videos">
        <button type="button" aria-pressed={sort === 'newest'} onClick={() => setSort('newest')}>Newest</button>
        <button type="button" aria-pressed={sort === 'popular'} onClick={() => setSort('popular')}>Most watched</button>
      </div>
    </div>
    <div className="tutorial-grid">{sortTutorials(tutorials, sort).map(v => <TutorialCard key={v.id} video={v} fresh={isNew(v, asOf)} playing={playing === v.id} onPlay={() => play(v.id)} />)}</div>
  </>;
}

/** A row of featured videos for the homepage; titles are h3 under the section's h2. */
export function TutorialShowcase({ tutorials, asOf }: { tutorials: readonly Tutorial[]; asOf: string }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const play = (id: string) => { setPlaying(id); track('tutorial_played', { video: id, placement: 'home' }); };
  return <div className="tutorial-grid tutorial-showcase">{tutorials.map(v => <TutorialCard key={v.id} video={v} fresh={isNew(v, asOf)} playing={playing === v.id} onPlay={() => play(v.id)} headingLevel="h3" />)}</div>;
}

// The thumbnail is a plain image until it is clicked, so the page loads no YouTube
// code (or cookies) for videos nobody plays.
export function TutorialCard({ video, fresh, playing, onPlay, headingLevel: Heading = 'h2' }: { video: Tutorial; fresh: boolean; playing: boolean; onPlay: () => void; headingLevel?: 'h2' | 'h3' }) {
  return <article className="tutorial-card">
    <div className="tutorial-media">
      {playing
        ? <iframe src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        : <button type="button" className="tutorial-thumb" onClick={onPlay} aria-label={`Play ${video.title}`}>
            <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" width={480} height={270} loading="lazy" />
            <span className="tutorial-play" aria-hidden="true"><Play /></span>
            {video.durationSeconds > 0 && <span className="tutorial-duration">{formatDuration(video.durationSeconds)}</span>}
            {fresh && <span className="tutorial-new">New</span>}
          </button>}
    </div>
    <div className="tutorial-body">
      <Heading><a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">{video.title}</a></Heading>
      <p className="tutorial-meta">{video.channel}{video.publishedAt && ` · ${formatMonth(video.publishedAt)}`}{video.views > 0 && ` · ${formatViews(video.views)}`}</p>
    </div>
  </article>;
}
