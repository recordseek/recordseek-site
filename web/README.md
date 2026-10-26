# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Homepage stats

The "sources saved" / "family historians" numbers on the homepage come from `web/src/data/stats.json`
and are baked into the prerendered HTML at build time (shown rounded down to the thousand, e.g. `2,142,000+`).

- Totals = a fixed Google Analytics 4 baseline (2023-06-16 to 2026-10-14) + PostHog counts since 2026-10-15.
- `.github/workflows/update-stats.yml` runs at 07:17 UTC on the 1st of each month. It runs
  `scripts/update-stats.mjs` (HogQL over `fs_source_created`, `zotero_saved`, `geni_saved`), appends/replaces the
  month's row in `metrics/stats-monthly.csv`, rebuilds only the marketing site (`SKIP_SHARE=1 scripts/release.sh`),
  and pushes to `site`, which GitHub Pages republishes.
- Needs the repo secret `POSTHOG_API_KEY` (PostHog personal API key, `query:read`). Optional env:
  `POSTHOG_HOST` (default `https://us.posthog.com`), `POSTHOG_PROJECT_ID` (default `665976`).
- Run manually: `gh workflow run update-stats.yml`. Locally: `POSTHOG_API_KEY=... node scripts/update-stats.mjs --dry-run`
  (drop `--dry-run` to write the files). Re-running in the same month replaces that month's row.
- Tests: `node --test scripts/update-stats.test.mjs` and `cd web && npx vitest run`.

## Tutorials page

`/tutorials` lists every YouTube video about RecordSeek (and its old nickname TreeConnect) that we can find,
from `web/src/data/tutorials.json`, baked into the prerendered HTML at build time. Thumbnails are plain images;
the YouTube player loads only when a video is clicked.

- `.github/workflows/update-tutorials.yml` runs Mondays at 07:23 UTC. It runs `scripts/update-tutorials.mjs`,
  which searches YouTube for a few phrasings (`QUERIES` in the script), keeps hits whose title or description
  mention RecordSeek/TreeConnect, re-fetches every listed video's metadata (title, channel, date, length, views),
  drops videos that are gone or private, and rewrites the JSON newest first. Then it rebuilds only the marketing
  site (`SKIP_SHARE=1 scripts/release.sh`) and pushes to `site`.
- Optional repo secret `YOUTUBE_API_KEY` (a YouTube Data API v3 key; ~200 quota units per run). With it the
  script uses the official API. Without it, it reads YouTube's public search and watch pages. From GitHub's
  runners YouTube answers watch pages with a sign-in bot check, so there the script treats a video as
  "unverified": a listed video keeps its last metadata, and a new search hit is added from the search page's
  own details (marked `approximate: true`, refined by the next verified run). A run that would drop more than
  a few videos at once is refused, so a blocked check can never empty the list (it did once, 2026-10-26).
- `web/src/data/tutorials.curation.json`: `include` pins video ids the search misses; `exclude` hides false
  positives. `firstSeen` in the data survives refreshes.
- Run manually: `gh workflow run update-tutorials.yml`. Locally: `node scripts/update-tutorials.mjs --dry-run`.
- Tests: `node --test scripts/update-tutorials.test.mjs` and `cd web && npx vitest run`.
