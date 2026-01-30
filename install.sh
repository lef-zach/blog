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

INTERACTIVE=true
if [ ! -t 0 ]; then
  INTERACTIVE=false
fi

prompt_default() {
  local prompt="$1"
  local default_value="$2"
  local value=""

  read -r -p "${prompt} [${default_value}]: " value
  if [ -z "$value" ]; then
    value="$default_value"
  fi

  printf '%s' "$value"
}

prompt_yes_no() {
  local prompt="$1"
  local default_value="$2"
  local label="y/N"
  local reply=""

  if [ "$default_value" = "y" ]; then
    label="Y/n"
  fi

  read -r -p "${prompt} [${label}]: " reply
  if [ -z "$reply" ]; then
    reply="$default_value"
  fi

  if [[ "$reply" =~ ^[Yy]$ ]]; then
    printf '%s' "true"
  else
    printf '%s' "false"
  fi
}

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
if [ "$INTERACTIVE" = true ] && [ -z "${CORS_ORIGIN:-}" ]; then
  cors_value="$(prompt_default "Frontend origin(s) for CORS (comma-separated, e.g. http://xxx.xxx.xxx.xxx:5000)" "$cors_value")"
fi
set_env backend/.env CORS_ORIGIN "$cors_value"

install_https_value="${INSTALL_HTTPS:-}"
if [ -z "$install_https_value" ] && [ "$INTERACTIVE" = true ]; then
  install_https_value="$(prompt_yes_no "Is the site served over HTTPS?" "n")"
fi

cookie_secure_value="${COOKIE_SECURE:-$(get_env backend/.env COOKIE_SECURE)}"
if [ -z "$cookie_secure_value" ]; then
  if [ -n "$install_https_value" ]; then
    if [ "$install_https_value" = "true" ]; then
      cookie_secure_value="true"
    else
      cookie_secure_value="false"
    fi
  else
    if [[ "$cors_value" == https://* ]] && [[ "$cors_value" != *"http://"* ]]; then
      cookie_secure_value="true"
    else
      cookie_secure_value="false"
    fi
  fi
fi
set_env backend/.env COOKIE_SECURE "$cookie_secure_value"

if [ "$install_https_value" = "true" ]; then
  default_domain="localhost"
  first_origin="${cors_value%%,*}"
  if [ -n "$first_origin" ]; then
    first_origin="${first_origin#http://}"
    first_origin="${first_origin#https://}"
    first_origin="${first_origin%%/*}"
    if [ -n "$first_origin" ]; then
      default_domain="$first_origin"
    fi
  fi

  https_domain="${HTTPS_DOMAIN:-$default_domain}"
  if [ "$INTERACTIVE" = true ] && [ -z "${HTTPS_DOMAIN:-}" ]; then
    https_domain="$(prompt_default "HTTPS domain" "$https_domain")"
  fi

  https_mode="${HTTPS_CERT_MODE:-}"
  if [ "$INTERACTIVE" = true ] && [ -z "$https_mode" ]; then
    https_mode="$(prompt_default "TLS cert mode (self-signed|existing)" "self-signed")"
  fi
  if [ -z "$https_mode" ]; then
    https_mode="self-signed"
  fi

  mkdir -p nginx/certs

  if [ "$https_mode" = "self-signed" ]; then
    if ! command -v openssl >/dev/null 2>&1; then
      echo "openssl is required to generate a self-signed certificate." >&2
      exit 1
    fi

    openssl req -x509 -nodes -newkey rsa:2048 \
      -days 365 \
      -keyout nginx/certs/server.key \
      -out nginx/certs/server.crt \
      -subj "/CN=${https_domain}" >/dev/null 2>&1
  else
    https_cert_path="${HTTPS_CERT_PATH:-}"
    https_key_path="${HTTPS_KEY_PATH:-}"

    if [ "$INTERACTIVE" = true ] && [ -z "$https_cert_path" ]; then
      read -r -p "Path to TLS certificate (.crt/.pem): " https_cert_path
    fi
    if [ "$INTERACTIVE" = true ] && [ -z "$https_key_path" ]; then
      read -r -p "Path to TLS private key (.key): " https_key_path
    fi

    if [ -z "$https_cert_path" ] || [ -z "$https_key_path" ]; then
      echo "HTTPS_CERT_PATH and HTTPS_KEY_PATH are required for existing certificates." >&2
      exit 1
    fi

    if [ ! -f "$https_cert_path" ] || [ ! -f "$https_key_path" ]; then
      echo "Certificate files not found." >&2
      exit 1
    fi

    cp "$https_cert_path" nginx/certs/server.crt
    cp "$https_key_path" nginx/certs/server.key
  fi

  if [ ! -f nginx/sites-available/blog.https.conf ]; then
    echo "Missing nginx/sites-available/blog.https.conf" >&2
    exit 1
  fi

  "$PYTHON_BIN" - "$https_domain" <<'PY'
from pathlib import Path
import sys

domain = sys.argv[1]
template = Path("nginx/sites-available/blog.https.conf").read_text()
Path("nginx/sites-available/blog.conf").write_text(template.replace("__SERVER_NAME__", domain))
PY
else
  if [ -f nginx/sites-available/blog.http.conf ]; then
    cp nginx/sites-available/blog.http.conf nginx/sites-available/blog.conf
  fi
fi

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

admin_email="${ADMIN_EMAIL:-}"
admin_password="${ADMIN_PASSWORD:-}"
admin_username="${ADMIN_USERNAME:-admin}"
admin_name="${ADMIN_NAME:-Admin}"

if [ -z "$admin_email" ] && [ "$INTERACTIVE" = true ]; then
  read -r -p "Admin email: " admin_email
fi

if [ "$INTERACTIVE" = true ] && [ -z "${ADMIN_USERNAME:-}" ]; then
  admin_username="$(prompt_default "Admin username" "$admin_username")"
fi

if [ "$INTERACTIVE" = true ] && [ -z "${ADMIN_NAME:-}" ]; then
  admin_name="$(prompt_default "Admin display name" "$admin_name")"
fi

if [ -z "$admin_password" ] && [ "$INTERACTIVE" = true ]; then
  while true; do
    read -r -s -p "Admin password (8+ chars): " admin_password
    echo
    if [ ${#admin_password} -lt 8 ]; then
      echo "Password must be at least 8 characters." >&2
      admin_password=""
      continue
    fi
    read -r -s -p "Confirm admin password: " admin_password_confirm
    echo
    if [ "$admin_password" != "$admin_password_confirm" ]; then
      echo "Passwords do not match." >&2
      admin_password=""
      continue
    fi
    break
  done
fi

if [ -z "$admin_email" ] || [ -z "$admin_password" ]; then
  echo "ADMIN_EMAIL and ADMIN_PASSWORD are required. Set env vars to run non-interactively." >&2
  exit 1
fi

echo "Bootstrapping admin user..."
ADMIN_EMAIL="$admin_email" \
  ADMIN_PASSWORD="$admin_password" \
  ADMIN_USERNAME="$admin_username" \
  ADMIN_NAME="$admin_name" \
  ./scripts/bootstrap-admin.sh

echo "Install complete."
