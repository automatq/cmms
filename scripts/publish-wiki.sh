#!/usr/bin/env bash
# Publish docs/wiki/*.md to the GitHub wiki for this repository.
#
# GitHub only creates the wiki git repository after the first page is created in the
# web UI. If the clone below fails with "repository not found", open
# https://github.com/automatq/cmms/wiki, click "Create the first page", save anything,
# and run this script again; it will overwrite that page.
#
# Usage: scripts/publish-wiki.sh [commit message]
set -euo pipefail

REPO_SLUG="${WIKI_REPO:-automatq/cmms}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/docs/wiki"
MSG="${1:-docs: sync wiki from docs/wiki}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone --quiet "https://github.com/${REPO_SLUG}.wiki.git" "$TMP/wiki"
find "$TMP/wiki" -maxdepth 1 -name '*.md' -delete
cp "$SRC"/*.md "$TMP/wiki/"
cd "$TMP/wiki"
git add -A
if git diff --cached --quiet; then
  echo "Wiki already up to date."
  exit 0
fi
git commit --quiet -m "$MSG"
git push --quiet origin HEAD
echo "Published $(ls "$SRC"/*.md | wc -l | tr -d ' ') pages to https://github.com/${REPO_SLUG}/wiki"
