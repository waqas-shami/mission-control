#!/bin/bash
# Task Sync Script - Syncs conversation tasks to Mission Control
# Usage: ./sync-tasks.sh [--dry-run] [--all]

set -e

MISSION_CONTROL_URL="${MISSION_CONTROL_URL:-http://localhost:3003}"
DRY_RUN=false
SYNC_ALL=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "🧪 DRY RUN MODE - No changes will be made"
fi
if [[ "$1" == "--all" ]]; then
    SYNC_ALL=true
    echo "📚 SYNC ALL MODE - Will process all available memory files"
fi

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1" 1>&2; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1" 1>&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" 1>&2; }

# Memory directory - try multiple paths
MEMORY_DIRS=(
    "/home/clawdbot/clawd/memory"
    "/home/clawdbot/clawd"
    "/home/projects/memory"
)

MEMORY_DIR=""
for dir in "${MEMORY_DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        MEMORY_DIR="$dir"
        break
    fi
done

if [[ -z "$MEMORY_DIR" ]]; then
    log_error "Memory directory not found in: ${MEMORY_DIRS[*]}"
    log_error "Please set MEMORY_DIR environment variable"
    exit 1
fi

log_info "Found memory directory: $MEMORY_DIR"

# Find session files - returns array
get_session_files() {
    local files=()
    local today=$(date +%Y-%m-%d)
    
    if $SYNC_ALL; then
        # Find all memory files, sorted by modification time (newest first)
        while IFS= read -r file; do
            files+=("$file")
        done < <(find "$MEMORY_DIR" -maxdepth 1 -name "*.md" -type f -exec stat -c '%Y %n' {} \; 2>/dev/null | sort -rn | cut -d' ' -f2-)
    else
        # Find today's files first
        while IFS= read -r file; do
            files+=("$file")
        done < <(find "$MEMORY_DIR" -maxdepth 1 -name "${today}*.md" -type f -exec stat -c '%Y %n' {} \; 2>/dev/null | sort -rn | cut -d' ' -f2-)
        
        # If no today's files, find most recent file
        if [[ ${#files[@]} -eq 0 ]]; then
            log_warn "No files found for today ($today), searching for most recent..."
            while IFS= read -r file; do
                files+=("$file")
            done < <(find "$MEMORY_DIR" -maxdepth 1 -name "*.md" -type f -exec stat -c '%Y %n' {} \; 2>/dev/null | sort -rn | head -3 | cut -d' ' -f2-)
        fi
    fi
    
    printf '%s\n' "${files[@]}"
}

# Extract task-like patterns from conversation
extract_tasks() {
    local file="$1"
    local tasks=()
    
    # Pattern 1: Checkbox items
    grep -hE "^\s*[-*]\s*\[\s*\]" "$file" 2>/dev/null | while read -r line; do
        title=$(echo "$line" | sed 's/^\s*[-*]\s*\[\s*\]\s*//' | xargs)
        if [[ -n "$title" && ${#title} -gt 5 ]]; then
            tasks+=("$title")
        fi
    done
    
    # Pattern 2: TODO/FIXME/TASK markers
    grep -hE "TODO:|FIXME:|TASK:|Action Item:|Next Step:" "$file" 2>/dev/null | while read -r line; do
        title=$(echo "$line" | sed 's/^\s*[-*]\s*//' | sed 's/^\(TODO\|FIXME\|TASK\|Action Item\|Next Step\):\s*//i' | xargs)
        if [[ -n "$title" && ${#title} -gt 5 ]]; then
            tasks+=("$title")
        fi
    done
    
    # Pattern 3: Project lines with action verbs
    grep -hE "^\s*[-*]\s+(build|create|setup|deploy|fix|implement|add|make|run|configure|install|write|update)" "$file" 2>/dev/null | while read -r line; do
        title=$(echo "$line" | sed 's/^\s*[-*]\s*//' | xargs)
        if [[ -n "$title" && ${#title} -gt 10 && ${#title} -lt 200 ]]; then
            tasks+=("$title")
        fi
    done
    
    # Pattern 4: Lines with "should" or "need to"
    grep -hE "should|need to|must|have to" "$file" 2>/dev/null | while read -r line; do
        if echo "$line" | grep -qE "^\s*[-*]"; then
            title=$(echo "$line" | sed 's/^\s*[-*]\s*//' | xargs)
            if [[ -n "$title" && ${#title} -gt 10 ]]; then
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
        echo "📝 Would create: $title (priority: $priority)"
        return 0
    fi
    
    local payload=$(jq -n \
        --arg title "$title" \
        --arg description "$description" \
        --arg priority "$priority" \
        --arg tags "$tags" \
        '{
            title: $title,
            description: $description,
            column_id: "backlog",
            priority: $priority,
            tags: ($tags | split(",") | map(select(length > 0))),
            is_recurring: false
        }')
    
    response=$(curl -s -X POST "$MISSION_CONTROL_URL/api/tasks" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    if echo "$response" | grep -q "id"; then
        log_info "✅ Created: $title"
        return 0
    else
        log_warn "⚠️ Failed: $title"
        return 1
    fi
}

# Main sync logic
main() {
    log_info "🚀 Starting Task Sync to Mission Control"
    log_info "📡 Target: $MISSION_CONTROL_URL"
    log_info "📁 Memory dir: $MEMORY_DIR"
    
    # Get session files as array
    mapfile -t session_files < <(get_session_files)
    
    if [[ ${#session_files[@]} -eq 0 ]]; then
        log_warn "No session files found in $MEMORY_DIR"
        log_info "Available files:"
        ls -la "$MEMORY_DIR"/*.md 2>/dev/null || echo "  (none)"
        exit 0
    fi
    
    log_info "Found ${#session_files[@]} session file(s)"
    for f in "${session_files[@]}"; do
        log_info "  - $f"
    done
    
    local total_tasks=0
    local created_tasks=0
    local failed_tasks=0
    
    for file in "${session_files[@]}"; do
        log_info "Processing: $(basename "$file")"
        
        while IFS= read -r task; do
            [[ -z "$task" ]] && continue
            ((total_tasks++))
            
            # Determine priority based on keywords
            priority="medium"
            if echo "$task" | grep -qiE "urgent|critical|asap|important|must|immediately|error|failed"; then
                priority="high"
            elif echo "$task" | grep -qiE "low|when|eventually|sometime|maybe|later"; then
                priority="low"
            fi
            
            # Extract tags based on content
            tags="synced,memory"
            if echo "$task" | grep -qiE "build|create|deploy|coding|code|script"; then
                tags="$tags,development"
            fi
            if echo "$task" | grep -qiE "research|learn|study|read"; then
                tags="$tags,research"
            fi
            if echo "$task" | grep -qiE "setup|config|install|deploy|docker|nginx"; then
                tags="$tags,infrastructure"
            fi
            if echo "$task" | grep -qiE "domain|dns|network"; then
                tags="$tags,networking"
            fi
            if echo "$task" | grep -qiE "sync|memory|task"; then
                tags="$tags,sync"
            fi
            
            if create_task "$task" "Synced from conversation memory" "$priority" "$tags"; then
                ((created_tasks++))
            else
                ((failed_tasks++))
            fi
            
        done < <(extract_tasks "$file")
    done
    
    echo ""
    log_info "✅ Sync complete:"
    log_info "   Found: $total_tasks tasks"
    log_info "   Created: $created_tasks"
    log_info "   Failed: $failed_tasks"
}

main
