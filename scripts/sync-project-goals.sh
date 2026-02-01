#!/bin/bash
# Quick Task Sync - Creates tasks from project goals
# Usage: ./sync-project-goals.sh [--dry-run]

set -e

MISSION_CONTROL_URL="${MISSION_CONTROL_URL:-http://localhost:3003}"
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "🧪 DRY RUN MODE"
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Project tasks based on our discussions
declare -a TASKS=(
    "Mission Control - Build operational command center"
    "Kanban Board - 5-column workflow with drag-and-drop"
    "Real-time Metrics Dashboard - Weekly velocity, active load"
    "PostgreSQL Integration - Task persistence"
    "Redis Caching - Real-time state management"
    "WebSocket Server - Live updates"
    "Docker Containerization - Full deployment"
    "Domain Name Selection - pilot.io, relay.io, orbit.to"
    "Internal DNS Setup - .to or .io domain"
    "Entity Tracking Panel UI"
    "Artifact Repository UI"
    "Instruction Ledger UI"
    "Advanced Memory Search"
    "Notion Integration"
)

log_info "🚀 Starting Project Task Sync"
log_info "📡 Target: $MISSION_CONTROL_URL"

if $DRY_RUN; then
    echo ""
    echo "🧪 Would create ${#TASKS[@]} tasks:"
    for i in "${!TASKS[@]}"; do
        echo "  $((i+1)). ${TASKS[$i]}"
    done
    exit 0
fi

created=0
failed=0

for task in "${TASKS[@]}"; do
    # Determine priority
    if echo "$task" | grep -qiE "build|deploy|docker|infrastructure"; then
        priority="high"
    elif echo "$task" | grep -qiE "domain|dns|setup"; then
        priority="medium"
    else
        priority="low"
    fi
    
    # Determine tags
    if echo "$task" | grep -qiE "ui|panel|dashboard|board"; then
        tags="frontend,development"
    elif echo "$task" | grep -qiE "domain|dns|network"; then
        tags="networking,infrastructure"
    elif echo "$task" | grep -qiE "postgres|redis|database"; then
        tags="backend,database"
    else
        tags="project,synced"
    fi
    
    payload=$(jq -n \
        --arg title "$task" \
        --arg priority "$priority" \
        --arg tags "$tags" \
        '{
            title: $title,
            description: "Synced from project goals",
            column_id: "backlog",
            priority: $priority,
            tags: ($tags | split(",") | map(select(length > 0))),
            is_recurring: false,
            metadata: { source: "project-sync", created_at: (now | strftime("%Y-%m-%dT%H:%M:%SZ")) }
        }')
    
    response=$(curl -s -X POST "$MISSION_CONTROL_URL/api/tasks" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    if echo "$response" | grep -q "id"; then
        log_info "✅ $task"
        ((created++))
    else
        log_warn "⚠️ Failed: $task"
        ((failed++))
    fi
done

echo ""
log_info "✅ Sync complete: $created created, $failed failed"
