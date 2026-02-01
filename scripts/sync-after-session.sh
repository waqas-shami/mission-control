#!/bin/bash
# Real-time Sync Hook - Call this after each agent session
# Usage: source this script or call: /home/projects/mission-control/scripts/sync-after-session.sh "session_key"

SESSION_KEY="${1:-main}"
MISSION_CONTROL_URL="${MISSION_CONTROL_URL:-http://localhost:3003}"

# Find the most recent memory file
MEMORY_DIR="/home/clawdbot/clawd/memory"
TODAY=$(date +%Y-%m-%d)

# Find latest session file
LATEST_FILE=$(find "$MEMORY_DIR" -name "*${TODAY}*.md" -type f 2>/dev/null | sort -r | head -1)

if [[ -z "$LATEST_FILE" ]]; then
    echo "No memory file found for today"
    exit 0
fi

echo "🔄 Real-time sync triggered for session: $SESSION_KEY"
echo "📄 Source: $LATEST_FILE"

# Run sync
cd /home/projects/mission-control

if command -v node &> /dev/null; then
    # Create session-specific sync script
    cat > /tmp/sync-session.js << EOF
const fs = require('fs');
const path = require('path');

const MISSION_CONTROL_URL = '${MISSION_CONTROL_URL}';
const sessionKey = '${SESSION_KEY}';
const filePath = '${LATEST_FILE}';

async function syncSession() {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract actionable items
    const tasks = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
        // Match bullet points with action items
        if (line.match(/^\s*[-*]\s+/) && line.length > 10) {
            const title = line.replace(/^\s*[-*]\s+/, '').trim();
            
            // Skip non-task items
            if (title.match(/^(Session|Conversation Summary|Source|Format|---)/i)) continue;
            if (title.length < 5 || title.length > 200) continue;
            
            tasks.push(title);
        }
    }
    
    // Deduplicate
    const unique = [...new Set(tasks)];
    
    console.log(\`Found \${unique.length} potential tasks\`);
    
    for (const title of unique) {
        const priority = title.match(/urgent|critical|important|immediately/i) ? 'high' : 
                        title.match(/when|eventually|sometime|maybe/i) ? 'low' : 'medium';
        
        const tags = ['realtime-sync', sessionKey];
        if (title.match(/build|create|deploy/i)) tags.push('development');
        if (title.match(/domain|dns|network/i)) tags.push('networking');
        
        try {
            const res = await fetch(\`\${MISSION_CONTROL_URL}/api/tasks\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description: \`Realtime sync from \${sessionKey} session\`,
                    column_id: 'backlog',
                    priority,
                    tags,
                    is_recurring: false,
                }),
            });
            
            if (res.ok) {
                console.log(\`✅ \${title.substring(0, 40)}...\`);
            }
        } catch (e) {
            console.error('Sync error:', e.message);
        }
    }
    
    console.log(\`\n📊 Synced \${unique.length} tasks\`);
}

syncSession();
EOF
    
    node /tmp/sync-session.js
else
    # Fallback to bash
    bash /home/projects/mission-control/scripts/sync-tasks.sh
fi
