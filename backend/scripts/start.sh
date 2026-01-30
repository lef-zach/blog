#!/bin/sh

echo "Starting application..."

# Wait for database to be ready
echo "Waiting for database to be ready..."
until pg_isready -h postgres -p 5432 -U blog_app; do
  sleep 1
done
echo "Database is ready!"

# Initialize database schema
echo "Initializing database schema..."
npx prisma db push --skip-generate
echo "Database schema initialized!"

# Start application
echo "Starting Node.js server..."
node dist/server.js
