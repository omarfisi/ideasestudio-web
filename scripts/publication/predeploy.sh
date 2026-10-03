#!/usr/bin/env bash
set -euo pipefail
PRODUCT="${1:-}"
case "$PRODUCT" in
  ideas) EXPECTED_BRANCH="ideas-main" ;;
  jj-pega) EXPECTED_BRANCH="jj-pega-main" ;;
  *) echo "Usage: $0 ideas|jj-pega" >&2; exit 2 ;;
esac

branch="$(git branch --show-current)"
if [[ "$branch" != "$EXPECTED_BRANCH" ]]; then
  echo "DEPLOY_BRANCH=FAIL expected=$EXPECTED_BRANCH actual=$branch" >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "CLEAN_TREE=FAIL dirty working tree" >&2
  git status --short >&2
  exit 1
fi
git fetch origin "$EXPECTED_BRANCH" --quiet
local_sha="$(git rev-parse HEAD)"
remote_sha="$(git rev-parse "origin/$EXPECTED_BRANCH")"
if [[ "$local_sha" != "$remote_sha" ]]; then
  echo "UP_TO_DATE=FAIL local=$local_sha remote=$remote_sha" >&2
  exit 1
fi
npm run build
node scripts/publication/check-placeholders.mjs dist
printf 'CLEAN_TREE=PASS\nUP_TO_DATE=PASS\nPLACEHOLDER_SCAN=PASS\nPREDEPLOY=PASS\n'
