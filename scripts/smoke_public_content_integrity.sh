#!/usr/bin/env bash
# smoke_public_content_integrity.sh
# Validates that the built output does NOT contain stale/fake/fallback content,
# and that the deployed public API endpoints are reachable.
#
# Usage:
#   bash scripts/smoke_public_content_integrity.sh
#
# Optional env vars:
#   DIST_DIR   — path to the built dist folder (default: ./dist)
#   API_BASE   — public API base URL (default: reads from .env or skips API checks)
#   WORKSPACE_ID — public workspace UUID
set -euo pipefail

DIST_DIR="${DIST_DIR:-./dist}"
WORKSPACE_ID="${WORKSPACE_ID:-c7e594e2-5218-40fc-9e4b-e830a21d96b3}"
API_BASE="${API_BASE:-}"
TIMEOUT="${TIMEOUT:-15}"

PASS=0
FAIL=0

red()   { printf '\033[0;31m%s\033[0m\n' "$*"; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[0;33m%s\033[0m\n' "$*"; }

# ── Grep check: must NOT appear in source or dist ───────────────────────────
assert_not_in_src() {
  local label="$1"
  local pattern="$2"
  local dir="${3:-./src}"

  if grep -rqi "$pattern" "$dir" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null; then
    red "  FAIL [src:$label] — found banned pattern in source: $pattern"
    grep -rli "$pattern" "$dir" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | head -5 | while read -r f; do
      red "    → $f"
    done
    FAIL=$((FAIL+1))
  else
    green "  PASS [src:$label] — pattern absent from source"
    PASS=$((PASS+1))
  fi
}

assert_not_in_dist() {
  local label="$1"
  local pattern="$2"

  if [[ ! -d "$DIST_DIR" ]]; then
    yellow "  SKIP [dist:$label] — dist dir not found, run npm run build first"
    return
  fi

  if grep -rqi "$pattern" "$DIST_DIR" 2>/dev/null; then
    red "  FAIL [dist:$label] — found banned pattern in build output: $pattern"
    FAIL=$((FAIL+1))
  else
    green "  PASS [dist:$label] — pattern absent from build output"
    PASS=$((PASS+1))
  fi
}

# ── API check ───────────────────────────────────────────────────────────────
assert_api_ok() {
  local label="$1"
  local url="$2"

  if [[ -z "$API_BASE" ]]; then
    yellow "  SKIP [api:$label] — API_BASE not set"
    return
  fi

  local body http_code
  body=$(curl --max-time "$TIMEOUT" -s -w "\n%{http_code}" "$url") || {
    red "  FAIL [api:$label] — curl error or timeout"
    FAIL=$((FAIL+1))
    return
  }

  http_code=$(printf '%s' "$body" | tail -1)
  body=$(printf '%s' "$body" | head -n -1)

  if [[ "$http_code" != "200" ]]; then
    red "  FAIL [api:$label] — HTTP $http_code"
    FAIL=$((FAIL+1))
    return
  fi

  local ok_val
  ok_val=$(printf '%s' "$body" | jq -r '.ok // false' 2>/dev/null || echo "false")
  if [[ "$ok_val" != "true" ]]; then
    yellow "  WARN [api:$label] — HTTP 200 but ok!=true (endpoint may not use ok field)"
  fi

  local count
  count=$(printf '%s' "$body" | jq -r 'if .items then (.items|length) elif .members then (.members|length) else "?" end' 2>/dev/null || echo "?")
  green "  PASS [api:$label] — HTTP 200 items/members=$count"
  PASS=$((PASS+1))
}

# ════════════════════════════════════════════════════════════════════════════
yellow "=== smoke_public_content_integrity.sh ==="
yellow "  DIST_DIR    : $DIST_DIR"
yellow "  WORKSPACE_ID: $WORKSPACE_ID"
yellow "  API_BASE    : ${API_BASE:-'(not set — API checks will be skipped)'}"
echo ""

# ── Section 1: Banned names must NOT appear anywhere in source ──────────────
echo "── Source: banned fake team member names ──"
assert_not_in_src "no-Ana-Rodriguez"   "Ana Rodríguez"
assert_not_in_src "no-Carlos-Mendez"   "Carlos Méndez"
assert_not_in_src "no-Sofia-Torres"    "Sofía Torres"
assert_not_in_src "no-EQUIPO_FALLBACK" "EQUIPO_FALLBACK"

echo ""
echo "── Source: no active servicesMock fallback in ServicesPage ──"
# servicesMock may exist in data/services.js but must NOT be imported into ServicesPage
if grep -q "servicesMock" ./src/pages/ServicesPage.jsx 2>/dev/null; then
  red "  FAIL [src:no-servicesMock-ServicesPage] — ServicesPage still imports or uses servicesMock"
  FAIL=$((FAIL+1))
else
  green "  PASS [src:no-servicesMock-ServicesPage] — ServicesPage does not use servicesMock"
  PASS=$((PASS+1))
fi

echo ""
echo "── Dist: banned patterns must not appear in build output ──"
assert_not_in_dist "no-Ana-Rodriguez"   "Ana Rodríguez"
assert_not_in_dist "no-Carlos-Mendez"   "Carlos Méndez"
assert_not_in_dist "no-Sofia-Torres"    "Sofía Torres"
assert_not_in_dist "no-EQUIPO_FALLBACK" "EQUIPO_FALLBACK"

echo ""
echo "── API: public endpoints reachable ──"
assert_api_ok "store-products" "${API_BASE}/api/store/products?product_type=service&limit=10&workspace_id=${WORKSPACE_ID}"
assert_api_ok "public-team"    "${API_BASE}/public/team?workspace_id=${WORKSPACE_ID}"

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
yellow "=== Results: $PASS passed, $FAIL failed ==="
if [[ "$FAIL" -gt 0 ]]; then
  red "CONTENT INTEGRITY CHECK FAILED"
  exit 1
fi
green "CONTENT INTEGRITY CHECK PASSED"
exit 0
