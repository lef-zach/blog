#!/bin/bash

# Database Backup Script
# This script creates a backup of the PostgreSQL database

set -e

BACKUP_DIR="/var/backups/blog/db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "Creating database backup..."
docker compose exec -T postgres pg_dump -U blog_app blog_production | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Remove backups older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Database backup completed: $DATE"
