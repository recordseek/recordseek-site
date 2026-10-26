#!/usr/bin/env bash
# Mints a YouTube-Data-API-only key in the recordseek GCP project and stores it as the
# recordseek/site repository secret YOUTUBE_API_KEY (read by update-tutorials.yml).
# The key goes from gcloud to a private temp file to gh; it is never printed.
#
# Needs: gcloud signed in as a project owner/editor (`gcloud auth login`; the
# recordseek-deployer service account is not allowed to create keys) and gh with
# admin on the repo. Re-run to rotate: it creates a new key and replaces the secret;
# delete the old key in the console afterwards.
#
# Usage: scripts/setup-youtube-key.sh [gcloud-account]
set -euo pipefail

PROJECT="${PROJECT:-recordseek}"
REPO="${REPO:-recordseek/site}"
ACCOUNT="${1:-$(gcloud config get-value account 2>/dev/null)}"
g() { gcloud --account "$ACCOUNT" --project "$PROJECT" "$@"; }

echo "==> Using gcloud account $ACCOUNT on project $PROJECT"
g services enable youtube.googleapis.com apikeys.googleapis.com

tmp="$(mktemp)"; chmod 600 "$tmp"; trap 'rm -f "$tmp"' EXIT
echo "==> Creating an API key restricted to the YouTube Data API"
g services api-keys create \
  --display-name "recordseek-site tutorials (YouTube Data API v3) $(date -u +%Y-%m-%d)" \
  --api-target=service=youtube.googleapis.com --format=json 2>/dev/null \
  | python3 -c 'import json,sys; j=json.load(sys.stdin); r=j.get("response", j); print(r["keyString"])' > "$tmp"
[ -s "$tmp" ] || { echo "gcloud returned no key string" >&2; exit 1; }

echo "==> Checking the key against search.list (new keys can take a minute to activate)"
for attempt in 1 2 3 4 5 6; do
  code="$(curl -s -o /dev/null -w '%{http_code}' \
    "https://www.googleapis.com/youtube/v3/search?part=id&type=video&maxResults=1&q=recordseek&key=$(cat "$tmp")")"
  [ "$code" = "200" ] && break
  echo "    attempt $attempt: HTTP $code, retrying in 15s"; sleep 15
done
[ "$code" = "200" ] || { echo "The new key does not work against the YouTube Data API (HTTP $code)" >&2; exit 1; }

echo "==> Storing it as the $REPO secret YOUTUBE_API_KEY"
gh secret set YOUTUBE_API_KEY -R "$REPO" < "$tmp"
echo "Done. update-tutorials.yml will use the Data API from its next run (gh workflow run update-tutorials.yml)."
