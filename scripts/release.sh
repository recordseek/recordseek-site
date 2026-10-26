#!/usr/bin/env bash
# Builds everything recordseek.com serves into the repo root (GitHub Pages serves
# the `site` branch root as-is):
#   1. the marketing site from web/ (TanStack Start, prerendered to static HTML)
#   2. the share app from recordseek/recordseek-app, built fresh into share/
#   3. the developer kit (packages/sdk) from the same checkout, into sdk/
#
# Usage: scripts/release.sh            # build both
#        SKIP_SHARE=1 scripts/release.sh   # site only
#        SKIP_SITE=1 scripts/release.sh    # share app only
#        APP_REF=some-branch scripts/release.sh
#        APP_ENV_FILE=path/to/.env scripts/release.sh
#
# The share app reads its FamilySearch app key, environment and Sentry DSN from
# a Vite .env file at build time. A fresh clone has none, so it is copied in
# from APP_ENV_FILE (default: the local recordseek-app checkout's).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_REPO="${APP_REPO:-https://github.com/recordseek/recordseek-app.git}"
APP_REF="${APP_REF:-master}"
APP_DIR="$ROOT/.release-cache/recordseek-app"
APP_ENV_FILE="${APP_ENV_FILE:-$ROOT/../recordseek-app/packages/web/.env}"
MANIFEST="$ROOT/.site-manifest"

log() { printf '\n==> %s\n' "$*"; }

# Fail before building anything if the share app would ship without an app key.
if [ -z "${SKIP_SHARE:-}" ]; then
  grep -qE '^VITE_FS_APP_KEY=.+' "$APP_ENV_FILE" 2>/dev/null || {
    echo "No VITE_FS_APP_KEY in $APP_ENV_FILE; set APP_ENV_FILE to the share app's .env" >&2
    exit 1
  }
fi

# ---------------------------------------------------------------- site
if [ -z "${SKIP_SITE:-}" ]; then
log "Building marketing site (web/)"
cd "$ROOT/web"
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules ]; then
  npm ci --no-audit --no-fund
fi
rm -rf .output
npm run build
OUT="$ROOT/web/.output/public"
[ -f "$OUT/index.html" ] || { echo "Site build produced no index.html" >&2; exit 1; }

# Remove what the previous release put in the root, then copy the new build.
if [ -f "$MANIFEST" ]; then
  while IFS= read -r entry; do
    case "$entry" in ""|share|sdk|web|scripts|.git*|CNAME) continue ;; esac
    rm -rf "${ROOT:?}/$entry"
  done < "$MANIFEST"
fi
( cd "$OUT" && ls -A ) > "$MANIFEST"
cp -R "$OUT"/. "$ROOT"/

# Old URLs from the previous site.
redirect() { # <path-relative-to-root> <target>
  mkdir -p "$(dirname "$ROOT/$1")"
  cat > "$ROOT/$1" <<EOF
<!doctype html><meta charset="utf-8"><title>RecordSeek</title>
<link rel="canonical" href="$2"><meta http-equiv="refresh" content="0; url=$2">
<script>location.replace("$2")</script><a href="$2">Continue to RecordSeek</a>
EOF
  echo "${1%%/*}" >> "$MANIFEST"
}
redirect get_started/index.html /bookmarklet/
redirect mobile/index.html /#mobile
redirect blog.html /
sort -u -o "$MANIFEST" "$MANIFEST"
fi

# ---------------------------------------------------------------- share
if [ -z "${SKIP_SHARE:-}" ]; then
  log "Building share app from $APP_REPO@$APP_REF"
  if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" fetch --quiet --depth 1 origin "$APP_REF"
    git -C "$APP_DIR" reset --quiet --hard FETCH_HEAD
    git -C "$APP_DIR" clean --quiet -fdx -e node_modules
  else
    git clone --quiet --depth 1 --branch "$APP_REF" "$APP_REPO" "$APP_DIR"
  fi
  APP_SHA="$(git -C "$APP_DIR" rev-parse --short HEAD)"
  cd "$APP_DIR"
  cp "$APP_ENV_FILE" packages/web/.env
  pnpm install --frozen-lockfile --silent

  # Pre-deploy gate: typecheck + lint + the full test suite, run against the
  # exact commit about to ship. `set -e` makes any failure abort the release
  # before a single file reaches share/, so a regression can never go live.
  # SKIP_GATE=1 is an emergency-hotfix escape hatch only — it ships UNVERIFIED.
  if [ -n "${SKIP_GATE:-}" ]; then
    echo "WARNING: SKIP_GATE set — shipping recordseek-app@$APP_SHA WITHOUT running typecheck/tests" >&2
  else
    log "Gate: typecheck + lint + tests for recordseek-app@$APP_SHA (halts the release on any failure)"
    pnpm gate
  fi

  VITE_RELEASE="recordseek-app@$APP_SHA" pnpm --filter @recordseek/web build:share
  [ -f packages/web/dist/index.html ] || { echo "Share build produced no index.html" >&2; exit 1; }
  rsync -a --delete packages/web/dist/ "$ROOT/share/"
  echo "recordseek-app@$APP_SHA" > "$ROOT/share/VERSION"

  # Developer kit: /sdk/ (docs), /sdk/v<major>/ (moving), /sdk/<x.y.z>/ (pinned,
  # for SRI — never changes once published, so a code change needs a version bump).
  log "Building developer kit"
  pnpm --filter @recordseek/sdk build
  SDK_DIST="$APP_DIR/packages/sdk/dist"
  [ -f "$SDK_DIST/recordseek.js" ] && [ -f "$SDK_DIST/version.txt" ] || { echo "SDK build produced no recordseek.js/version.txt" >&2; exit 1; }
  SDK_VERSION="$(tr -d '[:space:]' < "$SDK_DIST/version.txt")"
  SDK_PIN="$ROOT/sdk/$SDK_VERSION"
  SDK_MAJOR="$ROOT/sdk/v${SDK_VERSION%%.*}"
  if [ -d "$SDK_PIN" ]; then
    for f in "$SDK_DIST"/*.js; do
      cmp -s "$f" "$SDK_PIN/$(basename "$f")" || {
        echo "sdk/$SDK_VERSION is already published with different $(basename "$f"); bump packages/sdk version" >&2
        exit 1
      }
    done
  fi
  mkdir -p "$SDK_PIN" "$SDK_MAJOR"
  for dir in "$SDK_PIN" "$SDK_MAJOR"; do
    rsync -a --delete --include='*.js' --include='*.js.map' --include='version.txt' --exclude='*' "$SDK_DIST/" "$dir/"
  done
  # The docs page loads ./recordseek.js, so /sdk/ gets the whole build too.
  rsync -a "$SDK_DIST/" "$ROOT/sdk/"
fi

log "Done. Preview with: scripts/serve.sh"
cd "$ROOT" && git status --short | tail -40
