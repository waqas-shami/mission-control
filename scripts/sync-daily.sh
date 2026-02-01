#!/bin/bash
# Daily Task Sync Cron Job
# Run this via cron: 0 */1 * * * /home/projects/mission-control/scripts/sync-daily.sh

set -e

MISSION_CONTROL_URL="${MISSION_CONTROL_URL:-http://localhost:3003}"
LOG_FILE="/home/projects/mission-control/logs/sync.log"
MEMORY_DIR="/home/clawdbot/clawd/memory"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "🚀 Starting daily task sync"

# Export URL for scripts
export MISSION_CONTROL_URL

# Run the bash sync script
if [[ -f "/home/projects/mission-control/scripts/sync-tasks.sh" ]]; then
    log "Running bash sync..."
    /home/projects/mission-control/scripts/sync-tasks.sh >> "$LOG_FILE" 2>&1
fi

# Run Node.js sync for more intelligent task extraction
if command -v node &> /dev/null; then
    log "Running Node.js sync..."
    cd /home/projects/mission-control
    
    # Create a simple sync script
    cat > /tmp/daily-sync.js << 'NODESCRIPT'
const fs = require('fs');
const path = require('path');

const MISSION_CONTROL_URL = process.env.MISSION_CONTROL_URL || 'http://localhost:3003';
const MEMORY_DIR = process.env.MEMORY_DIR || '/home/clawdbot/clawd/memory';
const TODAY = new Date().toISOString().split('T')[0];

async function syncDailyTasks() {
    // Find today's memory files
    const files = fs.readdirSync(MEMORY_DIR)
        .filter(f => f.includes(TODA) && f.endsWith('.md'))
        .map(f => path.join(MEMORY_DIR, f));
    
    for (const file of files) {
        try {
            const content = fs.readFileSync(file, 'utf-8');
            
            // Extract task-like lines
            const taskLines = content.split('\n')
                .filter(line => line.match(/^\s*[-*]\s+\w+/) || line.match(/TODO:|FIXME:|Action/i))
                .map(line => line.replace(/^\s*[-*]\s*/, '').replace(/:(TODO|FIXME|Action Item):?/i, '').trim())
                .filter(line => line.length > 5 && line.length < 200);
            
            // Deduplicate
            const uniqueTasks = [...new Set(taskLines)];
            
            for (const title of uniqueTasks) {
                // Skip if already exists (basic check)
                if (title.match(/Session:|Conversation Summary|/i)) continue;
                
                await fetch(`${MISSION_CONTROL_URL}/api/tasks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title,
                        description: `Daily sync from ${path.basename(file)}`,
                        column_id: 'backlog',
                        priority: title.match(/urgent|critical|important/i) ? 'high' : 'medium',
                        tags: ['daily-sync', 'automated'],
                        is_recurring: false,
                    }),
                }).catch(() => {});
            }
            
            console.log(`✅ Synced ${uniqueTasks.length} tasks from ${path.basename(file)}`);
        } catch (e) {
            console.error(`Error processing ${file}:`, e.message);
        }
    }
}

syncDailyTasks();
NODESCRIPT
    
    node /tmp/daily-sync.js >> "$LOG_FILE" 2>&1
fi

log "✅ Daily sync complete"
