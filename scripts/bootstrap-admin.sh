#!/usr/bin/env bash

set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to run this script." >&2
  exit 1
fi

if [ -z "${ADMIN_EMAIL:-}" ]; then
  read -r -p "Admin email: " ADMIN_EMAIL
fi

if [ -z "${ADMIN_PASSWORD:-}" ]; then
  read -r -s -p "Admin password (8+ chars): " ADMIN_PASSWORD
  echo
fi

ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
ADMIN_NAME=${ADMIN_NAME:-Admin}

if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "ADMIN_EMAIL and ADMIN_PASSWORD are required." >&2
  exit 1
fi

docker compose exec -T \
  -e ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -e ADMIN_USERNAME="$ADMIN_USERNAME" \
  -e ADMIN_NAME="$ADMIN_NAME" \
  backend node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const username = process.env.ADMIN_USERNAME || 'admin';
const name = process.env.ADMIN_NAME || 'Admin';

if (!email || !password) {
  console.error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  process.exit(1);
}

(async () => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${existing.id}`);
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hash,
      name,
      role: 'ADMIN',
    },
  });

  console.log(`Created admin: ${user.id}`);
})()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
NODE
