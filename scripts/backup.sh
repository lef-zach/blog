#!/bin/bash

# Blog Platform Backup Script
# This script creates backups of the database and uploads

set -e

BACKUP_DIR="/var/backups/blog"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup database
echo "Backing up database..."
docker compose exec -T postgres pg_dump -U blog_app blog_production | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Backup uploads
echo "Backing up uploads..."
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz /var/www/uploads/

# Backup configuration
echo "Backing up configuration..."
tar -czf $BACKUP_DIR/config_backup_$DATE.tar.gz docker/.env nginx/

# Remove backups older than 7 days
echo "Cleaning old backups..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
