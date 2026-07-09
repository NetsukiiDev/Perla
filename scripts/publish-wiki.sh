#!/usr/bin/env bash
# Publishes docs/wiki/*.md to the GitHub wiki of NetsukiiDev/Perla.
#
# ONE-TIME PREREQUISITE: a GitHub wiki has no git repository until its first
# page is created through the web UI. So, once, open:
#   https://github.com/NetsukiiDev/Perla/wiki  ->  "Create the first page"
#   (any content, e.g. "Home") -> Save.
# After that this script can sync every page.
#
# Requires: git authenticated for the repo (gh auth / credential helper).
set -euo pipefail

WIKI_URL="https://github.com/NetsukiiDev/Perla.wiki.git"
SRC_DIR="$(cd "$(dirname "$0")/../docs/wiki" && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Cloning wiki..."
if ! git clone --quiet "$WIKI_URL" "$TMP_DIR"; then
  echo "ERROR: wiki repo not found. Create the first page via the web UI first:"
  echo "  https://github.com/NetsukiiDev/Perla/wiki"
  exit 1
fi

cp "$SRC_DIR"/*.md "$TMP_DIR"/
cd "$TMP_DIR"
git add -A
if git diff --cached --quiet; then
  echo "Wiki already up to date."
  exit 0
fi
git commit --quiet -m "Sync wiki from docs/wiki"
git push --quiet origin HEAD
echo "Wiki published: https://github.com/NetsukiiDev/Perla/wiki"
