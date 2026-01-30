#!/bin/bash

# Blog Platform Deployment Script
# Safe, deterministic deployment with Docker Compose + Prisma

set -e

echo "======================================"
echo " Starting Blog Platform Deployment"
echo "======================================"

# ---- Helpers -------------------------------------------------

wait_for_postgres() {
  echo "Waiting for Postgres to accept connections..."
  until docker compose exec -T postgres \
    pg_isready -U blog_app -d blog_production >/dev/null 2>&1; do
    sleep 2
  done
  echo "Postgres is ready."
}

# ---- Deployment ----------------------------------------------

echo "Pulling latest code..."
git fetch origin
git reset --hard origin/main

echo "Stopping running containers..."
docker compose down --remove-orphans

echo "Force deleting Postgres volumes (clean slate)..."
docker volume ls -q | grep postgres_data | xargs -r docker volume rm || true

echo "Pulling updated images..."
docker compose pull

echo "Building images (no cache)..."
docker compose build --no-cache

echo "Starting containers..."
docker compose up -d

# ---- Database ------------------------------------------------

wait_for_postgres

echo "Running database migrations..."
docker compose exec -T backend npx prisma migrate deploy

# ---- Cache ---------------------------------------------------

echo "Clearing Redis cache..."
docker compose exec -T redis redis-cli -a redis_password FLUSHALL

echo "======================================"
echo " Deployment completed successfully"
echo "======================================"
