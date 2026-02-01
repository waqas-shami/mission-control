# 🚀 Mission Control - Operational Command Center

Mission Control is a high-performance operational command center that serves as the Single Source of Truth (SSOT) for all operational, cognitive, and project-related activities.

## ✨ Features

### 📊 Core Data Streams
- **Active Operations** - Real-time tracking of tasks and projects
- **Cognitive Memory** - Persistent storage of conversation logs and historical data
- **Artifact Repository** - Centralized document and asset management
- **Instruction Ledger** - User inputs, global instructions, and datasets
- **Entity Tracking** - Monitoring of humans and autonomous agents

### 📋 Task Management Engine (Kanban)
- Dynamic Kanban board with 5 workflow columns:
  - Recurring, Backlog, In Progress, Review, Activity Completed
- Drag-and-drop functionality using dnd-kit
- PostgreSQL persistence for data safety

### 🔄 Real-Time Task Sync
- Automatic sync from conversation memory
- Daily scheduled sync (hourly)
- Manual sync triggers available

## 🛠 Tech Stack

- **Framework**: Next.js 16+ (App Router + Turbopack)
- **UI Library**: Mantine v7 (dark mode)
- **Database**: PostgreSQL + Redis
- **Real-time**: Socket.io WebSocket
- **Drag & Drop**: dnd-kit
- **Containerization**: Docker + docker-compose

## 🚀 Quick Start

```bash
# Build and start
docker-compose up -d --build

# Initialize database
docker exec -it mission-db psql -U postgres -d mission_control -f /docker-entrypoint-initdb.d/schema.sql

# Visit http://10.10.20.75:3003
```

## 📡 Exposed Ports

| Service | Port | Description |
|---------|------|-------------|
| App | 3003 | Main web application |
| WebSocket | 3004 | Real-time updates |
| PostgreSQL | 5433 | Database (internal) |
| Redis | 6380 | Cache (internal) |

## 🔄 Task Sync System

### Automatic Sync

The system includes three sync mechanisms:

#### 1. Real-Time Sync (After Each Session)
```bash
# After any significant conversation
source /home/projects/mission-control/scripts/sync-after-session.sh main
```

#### 2. Hourly Cron Job
Runs automatically inside the Docker container:
- Extracts tasks from memory files
- Creates tasks in the backlog
- Logs to `/app/logs/sync.log`

#### 3. Manual Sync
```bash
# Sync today's tasks
./scripts/sync-tasks.sh

# Dry run (no changes)
./scripts/sync-tasks.sh --dry-run
```

### Sync Sources
- `/home/clawdbot/clawd/memory/YYYY-MM-DD*.md` - Daily conversation logs
- Extracts patterns: `TODO:`, `FIXME:`, `- [ ]`, action items
- Prioritizes based on keywords (urgent, critical, important)

### Sync Configuration
```bash
# Set custom target URL
export MISSION_CONTROL_URL=http://your-server:3003

# Run sync
./scripts/sync-tasks.sh
```

## 📁 Project Structure

```
mission-control/
├── src/
│   ├── app/api/           # API routes
│   ├── components/        # UI components
│   └── lib/               # Database, Redis, Memory tools
├── scripts/
│   ├── sync-tasks.sh      # Bash sync (extract tasks from memory)
│   ├── sync-realtime.ts   # Node.js real-time sync
│   ├── sync-daily.sh      # Daily cron wrapper
│   └── sync-after-session.sh  # Hook for after sessions
├── logs/                  # Sync logs
├── docker-compose.yml     # Production config
└── schema.sql             # Database schema
```

## 🐳 Docker Commands

```bash
# Build
docker-compose build --no-cache

# Start
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down

# Stop with volumes
docker-compose down -v
```

## 📦 GitHub Repository

https://github.com/waqas-shami/mission-control

---

Built with ❤️ for operational excellence
