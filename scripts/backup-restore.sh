#!/bin/bash
# ==============================================================================
# TDR GOLD TREADER - Automated PostgreSQL Backup & Restore Utility
# ==============================================================================

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_NAME="tdr-gold-postgres"
DB_NAME="tdr_gold_db"
DB_USER="tdr_admin"

mkdir -p "$BACKUP_DIR"

function show_usage() {
    echo "Usage: $0 {backup|restore <file>}"
    exit 1
}

function backup_db() {
    FILE="$BACKUP_DIR/tdr_gold_backup_$TIMESTAMP.sql.gz"
    echo "⚡ [TDR GOLD TREADER] Initiating database backup..."
    docker exec -t "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILE"
    echo "✓ Backup completed successfully: $FILE"
}

function restore_db() {
    FILE="$1"
    if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
        echo "❌ Error: Backup file not found: $FILE"
        exit 1
    fi
    echo "⚠️ [TDR GOLD TREADER] Restoring database from $FILE..."
    gunzip -c "$FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"
    echo "✓ Database restored successfully!"
}

case "$1" in
    backup)
        backup_db
        ;;
    restore)
        restore_db "$2"
        ;;
    *)
        show_usage
        ;;
esac
