#!/bin/bash

# Mission Control Database Seed Script
# Run this to initialize and seed the database

set -e

DB_HOST=${DB_HOST:-"10.10.20.75"}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-"postgres"}
DB_NAME=${DB_NAME:-"mission_control"}
DB_PASSWORD=${DB_PASSWORD:-"postgres"}

export PGPASSWORD="$DB_PASSWORD"

echo "Initializing database at $DB_HOST:$DB_PORT..."

# Create database if it doesn't exist
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true

# Run schema
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f schema.sql

# Seed sample data
echo "Seeding sample data..."

# Create sample entities
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
INSERT INTO entities (id, name, type, metadata, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Mission Control', 'system', '{\"role\": \"Command Center\"}', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'waqas-main', 'agent', '{\"role\": \"Primary Agent\"}', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'Human User', 'human', '{\"role\": \"Operator\"}', 'active')
ON CONFLICT DO NOTHING;
"

# Create sample tasks
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
INSERT INTO tasks (id, title, description, column_id, priority, tags, is_recurring, created_at) VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'Deploy Mission Control', 'Deploy to production server', 'in_progress', 'high', '[\"deployment\", \"priority\"], false, NOW()),
  ('aaaa2222-2222-2222-2222-222222222222', 'Daily System Check', 'Routine health check', 'recurring', 'medium', '[\"maintenance\"], true, NOW()),
  ('aaaa3333-3333-3333-3333-333333333333', 'Memory Sync', 'Sync cognitive memory', 'backlog', 'low', '[\"memory\"], false, NOW()),
  ('aaaa4444-4444-4444-4444-444444444444', 'Security Audit', 'Review system security', 'review', 'high', '[\"security\"], false, NOW()),
  ('aaaa5555-5555-5555-5555-555555555555', 'Performance Tuning', 'Optimize database queries', 'completed', 'medium', '[\"optimization\"], false, NOW())
ON CONFLICT DO NOTHING;
"

echo "Database initialization complete!"
