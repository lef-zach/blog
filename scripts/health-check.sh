#!/usr/bin/env bash

set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to run this script." >&2
  exit 1
fi

PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi

if [ -z "$PYTHON_BIN" ]; then
  echo "python3 or python is required to parse auth responses." >&2
  exit 1
fi

API_BASE_URL=${API_BASE_URL:-http://localhost/api/v1}

echo "Health check: $API_BASE_URL"

echo "- /health"
curl -fsS "${API_BASE_URL}/health" >/dev/null
echo "  OK"

echo "- /profile/public"
curl -fsS "${API_BASE_URL}/profile/public" >/dev/null
echo "  OK"

ADMIN_EMAIL=${ADMIN_EMAIL:-}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-}

if [ -z "$ADMIN_EMAIL" ]; then
  read -r -p "Admin email: " ADMIN_EMAIL
fi

if [ -z "$ADMIN_PASSWORD" ]; then
  read -r -s -p "Admin password: " ADMIN_PASSWORD
  echo
fi

tmp_response="$(mktemp)"
status_code=$(curl -sS -o "$tmp_response" -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
  "${API_BASE_URL}/auth/login")

if [ "$status_code" != "200" ]; then
  echo "Login failed with status ${status_code}." >&2
  cat "$tmp_response" >&2
  rm -f "$tmp_response"
  exit 1
fi

access_token=$($PYTHON_BIN - "$tmp_response" <<'PY'
import json
import sys

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as fh:
    payload = json.load(fh)

token = payload.get('data', {}).get('accessToken')
if not token:
    raise SystemExit('accessToken not found in login response')

print(token)
PY
)

rm -f "$tmp_response"

echo "- /papers/metrics"
curl -fsS "${API_BASE_URL}/papers/metrics" \
  -H "Authorization: Bearer ${access_token}" >/dev/null
echo "  OK"

echo "All health checks passed."
