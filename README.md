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
  - Recurring
  - Backlog
  - In Progress
  - Review
  - Activity Completed
- Drag-and-drop functionality using dnd-kit
- Recurring task automation
- PostgreSQL persistence for data safety

### 📈 Real-Time Metrics Dashboard
- Weekly velocity tracking
- Active load monitoring
- Total inventory count
- Completion rate percentage
- Pipeline distribution visualization

## 🛠 Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **UI Library**: Mantine v7 (dark mode, built-in components)
- **Database**: PostgreSQL
- **Caching**: Redis
- **Real-time**: Socket.io WebSocket server
- **Drag & Drop**: dnd-kit
- **Containerization**: Docker + docker-compose

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- PostgreSQL (or use provided docker-compose.local.yml)
- Redis (or use provided docker-compose.local.yml)

### Option 1: Local Development with Docker

```bash
# Start with local PostgreSQL and Redis
docker-compose -f docker-compose.local.yml up -d

# Initialize database
./scripts/seed-db.sh

# Visit http://localhost:3000
```

### Option 2: Connect to Existing Infrastructure

```bash
# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL and Redis URLs

# Start application
docker-compose up -d

# Visit http://10.10.20.75:3000
```

## 📁 Project Structure

```
mission-control/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── tasks/         # Task CRUD operations
│   │   │   ├── metrics/       # Dashboard metrics
│   │   │   ├── entities/      # Entity management
│   │   │   ├── memory/        # Memory search
│   │   │   └── health/        # Health check
│   │   ├── layout.tsx         # Root layout with providers
│   │   └── page.tsx           # Main dashboard
│   ├── components/
│   │   ├── KanbanBoard.tsx    # Drag-drop task board
│   │   ├── MetricsHeader.tsx  # Real-time metrics
│   │   └── MemoryPanel.tsx    # Cognitive memory viewer
│   ├── lib/
│   │   ├── db.ts              # PostgreSQL connection
│   │   ├── redis.ts           # Redis client & caching
│   │   └── memory-tools.ts    # Memory integration
│   └── types/
│       └── index.ts           # TypeScript definitions
├── docker-compose.yml         # Production config
├── docker-compose.local.yml   # Local dev config
├── schema.sql                 # Database schema
└── ws-server.js               # WebSocket server
```

## 🔧 API Endpoints

### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create new task
- `PATCH /api/tasks` - Update task
- `DELETE /api/tasks?id=<id>` - Delete task

### Metrics
- `GET /api/metrics` - Get dashboard metrics

### Entities
- `GET /api/entities` - List entities
- `POST /api/entities` - Create entity

### Memory
- `POST /api/memory/search` - Search memory

## 🐳 Docker Deployment

### Build & Run
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Services
- **app**: Next.js application on port 3000
- **ws-server**: WebSocket server on port 3001

## 📝 Database Schema

Key tables:
- `entities` - Users and agents
- `tasks` - Kanban tasks with state tracking
- `activity_log` - Action history
- `instructions` - Global instructions
- `artifacts` - Document repository

See `schema.sql` for full schema.

## 🔒 Security

- Open access configured for local network
- Bound to 0.0.0.0 for network accessibility
- No localhost-only restrictions

## 📦 GitHub Repository

https://github.com/waqas-shami/mission-control

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

Built with ❤️ for operational excellence
