#!/bin/bash

# Mission Control Database Cleanup Script
# Deletes ALL tasks from the database (fresh start)
# Use with caution!

set -e

DB_HOST=${DB_HOST:-"10.10.20.75"}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-"postgres"}
DB_NAME=${DB_NAME:-"mission_control"}
DB_PASSWORD=${DB_PASSWORD:-"postgres"}

export PGPASSWORD="$DB_PASSWORD"

echo "Cleaning up all tasks from database at $DB_HOST:$DB_PORT..."

# Delete all tasks
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM activity_log;"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM tasks;"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM entities WHERE type != 'system';"

echo "Database cleanup complete! All tasks have been deleted."
