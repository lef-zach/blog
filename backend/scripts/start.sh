#!/bin/sh
set -e

echo "Starting application..."

# Wait for database to be ready
echo "Waiting for database to be ready..."
until pg_isready -h postgres -p 5432 -U blog_app; do
  sleep 1
done
echo "Database is ready!"

# Apply database migrations
echo "Applying database migrations..."
npx prisma migrate deploy
echo "Database migrations applied!"

# Start application
echo "Starting Node.js server..."
node dist/server.js
