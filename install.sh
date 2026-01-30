#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is required." >&2
  exit 1
fi

PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi

if [ -z "$PYTHON_BIN" ]; then
  echo "python3 or python is required for env setup." >&2
  exit 1
fi

project_name="$(docker compose config --name 2>/dev/null || basename "$ROOT_DIR")"

has_existing=false
services="$(docker compose ps -a --services 2>/dev/null || true)"
if [ -n "$services" ]; then
  has_existing=true
fi

for volume in "${project_name}_postgres_data" "${project_name}_redis_data"; do
  if docker volume inspect "$volume" >/dev/null 2>&1; then
    has_existing=true
    break
  fi
done

if [ "$has_existing" = true ]; then
  read -r -p "Existing Docker data found for ${project_name}. Purge containers and volumes? [y/N]: " purge
  if [[ "$purge" =~ ^[Yy]$ ]]; then
    docker compose down -v --remove-orphans
    docker volume rm -f "${project_name}_postgres_data" "${project_name}_redis_data" >/dev/null 2>&1 || true
  fi
fi

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
fi

if [ ! -f frontend/.env ]; then
  cp frontend/.env.example frontend/.env
fi

set_env() {
  local file="$1"
  local key="$2"
  local value="$3"

  "$PYTHON_BIN" - "$file" "$key" "$value" <<'PY'
import sys
from pathlib import Path

file, key, value = sys.argv[1], sys.argv[2], sys.argv[3]
path = Path(file)
lines = path.read_text().splitlines() if path.exists() else []
updated = False

for i, line in enumerate(lines):
    if line.startswith(f"{key}="):
        lines[i] = f"{key}={value}"
        updated = True
        break

if not updated:
    lines.append(f"{key}={value}")

path.write_text("\n".join(lines) + "\n")
PY
}

get_env() {
  local file="$1"
  local key="$2"

  "$PYTHON_BIN" - "$file" "$key" <<'PY'
import sys
from pathlib import Path

file, key = sys.argv[1], sys.argv[2]
path = Path(file)
if not path.exists():
    print("")
    sys.exit(0)

for line in path.read_text().splitlines():
    if line.startswith(f"{key}="):
        print(line.split("=", 1)[1])
        sys.exit(0)

print("")
PY
}

gen_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 64
  else
    "$PYTHON_BIN" - <<'PY'
import secrets
print(secrets.token_hex(64))
PY
  fi
}

is_placeholder() {
  case "$1" in
    ""|"change-me"|"changeme_secret_key"|"changeme_refresh_key"|"your-jwt-secret-key"|"your-secret-key")
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

default_db="postgresql://blog_app:blog_password@postgres:5432/blog_production"
default_redis="redis://:redis_password@redis:6379"

db_value="${DATABASE_URL:-$(get_env backend/.env DATABASE_URL)}"
if [ -z "$db_value" ] || [[ "$db_value" == *"postgresql://postgres:postgres@db"* ]] || [[ "$db_value" == *"@localhost:5432"* ]]; then
  db_value="$default_db"
fi
set_env backend/.env DATABASE_URL "$db_value"

redis_value="${REDIS_URL:-$(get_env backend/.env REDIS_URL)}"
if [ -z "$redis_value" ] || [[ "$redis_value" == "redis://redis:6379" ]]; then
  redis_value="$default_redis"
fi
set_env backend/.env REDIS_URL "$redis_value"

cors_value="${CORS_ORIGIN:-$(get_env backend/.env CORS_ORIGIN)}"
if [ -z "$cors_value" ]; then
  cors_value="http://localhost:5000"
fi
set_env backend/.env CORS_ORIGIN "$cors_value"

cookie_secure_value="${COOKIE_SECURE:-$(get_env backend/.env COOKIE_SECURE)}"
if [ -z "$cookie_secure_value" ]; then
  cookie_secure_value="false"
fi
set_env backend/.env COOKIE_SECURE "$cookie_secure_value"

jwt_value="${JWT_SECRET:-$(get_env backend/.env JWT_SECRET)}"
if is_placeholder "$jwt_value"; then
  jwt_value="$(gen_secret)"
fi
set_env backend/.env JWT_SECRET "$jwt_value"

jwt_refresh_value="${JWT_REFRESH_SECRET:-$(get_env backend/.env JWT_REFRESH_SECRET)}"
if is_placeholder "$jwt_refresh_value"; then
  jwt_refresh_value="$(gen_secret)"
fi
set_env backend/.env JWT_REFRESH_SECRET "$jwt_refresh_value"

docker compose build
docker compose up -d

echo "Waiting for Postgres to accept connections..."
for _ in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U blog_app -d blog_production >/dev/null 2>&1; then
    echo "Postgres is ready."
    break
  fi
  sleep 2
done

docker compose exec -T backend npx prisma migrate deploy

echo "Bootstrapping admin user..."
./scripts/bootstrap-admin.sh

echo "Install complete."
