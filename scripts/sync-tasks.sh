#!/bin/bash
# Task Sync Script - Syncs conversation tasks to Mission Control
# Usage: ./sync-tasks.sh [--dry-run]

set -e

MISSION_CONTROL_URL="${MISSION_CONTROL_URL:-http://localhost:3003}"
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "🧪 DRY RUN MODE - No changes will be made"
fi

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Detect conversation files
MEMORY_DIR="/home/clawdbot/clawd/memory"
TODAY=$(date +%Y-%m-%d)
SESSION_FILE="$MEMORY_DIR/${TODAY}.md"
SESSION_FILE_ALT="$MEMORY_DIR/${TODAY}-*.md"

# Find all session files for today
find_session_files() {
    find "$MEMORY_DIR" -name "${TODAY}*.md" -type f 2>/dev/null | grep -v CONVERSATION_LOG | grep -v SYSTEM_MEMORY
}

# Extract task-like patterns from conversation
extract_tasks() {
    local file="$1"
    local tasks=()
    
    # Pattern 1: TODO/FIXME/TASK markers
    grep -hE "^\s*[-*]\s*\[ \]|TODO:|FIXME:|TASK:|Action Item:|Next Step:" "$file" 2>/dev/null | while read -r line; do
        # Clean up and create task
        title=$(echo "$line" | sed 's/^\s*[-*]\s*//' | sed 's/^\(TODO\|FIXME\|TASK\|Action Item\|Next Step\):\s*//i' | xargs)
        if [[ -n "$title" && ${#title} -gt 5 ]]; then
            tasks+=("$title")
        fi
    done
    
    # Pattern 2: Project lines with dashes
    grep -hE "^\s*[-*]\s+\w+.*project|^\s*[-*]\s+\w+.*build|^\s*[-*]\s+\w+.*create|^\s*[-*]\s+\w+.*setup" "$file" 2>/dev/null | while read -r line; do
        title=$(echo "$line" | sed 's/^\s*[-*]\s*//' | xargs)
        if [[ -n "$title" && ${#title} -gt 10 ]]; then
            tasks+=("$title")
        fi
    done
    
    # Pattern 3: Conversation summaries about projects
    grep -hE "project|task|goal|mission|build|create|deploy|setup" "$file" 2>/dev/null | head -20 | while read -r line; do
        if echo "$line" | grep -qE ":\s*[A-Z]"; then
            title=$(echo "$line" | sed 's/^.*: //' | xargs)
            if [[ -n "$title" && ${#title} -gt 10 && ${#title} -lt 200 ]]; then
                tasks+=("$title")
            fi
        fi
    done
    
    # Output unique tasks
    printf '%s\n' "${tasks[@]}" | sort -u
}

# Create task in Mission Control
create_task() {
    local title="$1"
    local description="$2"
    local priority="${3:-medium}"
    local tags="$4"
    
    if $DRY_RUN; then
        echo "📝 Would create task: $title"
        return 0
    fi
    
    local payload=$(cat <<EOF
{
    "title": $(echo "$title" | jq -Rs .),
    "description": $(echo "$description" | jq -Rs .),
    "column_id": "backlog",
    "priority": "$priority",
    "tags": [$(echo "$tags" | sed 's/,/\",\"/g' | sed 's/^/\"/' | sed 's/$/\"/')],
    "is_recurring": false
}
EOF
)
    
    response=$(curl -s -X POST "$MISSION_CONTROL_URL/api/tasks" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    if echo "$response" | grep -q "id"; then
        log_info "✅ Created: $title"
    else
        log_warn "⚠️ Failed: $title - $response"
    fi
}

# Main sync logic
main() {
    log_info "🚀 Starting Task Sync to Mission Control"
    log_info "📡 Target: $MISSION_CONTROL_URL"
    
    local session_files=($(find_session_files))
    
    if [[ ${#session_files[@]} -eq 0 ]]; then
        log_warn "No session files found for today ($TODAY)"
        exit 0
    fi
    
    log_info "Found ${#session_files[@]} session files"
    
    local total_tasks=0
    local created_tasks=0
    
    for file in "${session_files[@]}"; do
        log_info "Processing: $file"
        
        while IFS= read -r task; do
            [[ -z "$task" ]] && continue
            ((total_tasks++))
            
            # Determine priority based on keywords
            priority="medium"
            if echo "$task" | grep -qiE "urgent|critical|asap|important|must|immediately"; then
                priority="high"
            elif echo "$task" | grep -qiE "low|when|eventually|sometime"; then
                priority="low"
            fi
            
            # Extract tags
            tags="synced,memory"
            if echo "$task" | grep -qiE "build|create|deploy"; then
                tags="$tags,development"
            elif echo "$task" | grep -qiE "research|learn|study"; then
                tags="$tags,research"
            elif echo "$task" | grep -qiE "setup|config|install"; then
                tags="$tags,infrastructure"
            fi
            
            create_task "$task" "Synced from conversation memory" "$priority" "$tags"
            ((created_tasks++))
            
        done < <(extract_tasks "$file")
    done
    
    log_info "✅ Sync complete: $total_tasks tasks found, $created_tasks created"
}

main
