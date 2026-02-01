#!/usr/bin/env node
/**
 * Project Goals Sync - Creates tasks from project goals
 * Usage: node sync-project-goals.js [--dry-run]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const MISSION_CONTROL_URL = process.env.MISSION_CONTROL_URL || 'http://localhost:3003';
const DRY_RUN = process.argv.includes('--dry-run');

const TASKS = [
    { title: "Mission Control - Build operational command center", priority: "high", tags: "project,synced" },
    { title: "Kanban Board - 5-column workflow with drag-and-drop", priority: "high", tags: "frontend,development" },
    { title: "Real-time Metrics Dashboard - Weekly velocity, active load", priority: "medium", tags: "frontend,development" },
    { title: "PostgreSQL Integration - Task persistence", priority: "high", tags: "backend,database" },
    { title: "Redis Caching - Real-time state management", priority: "medium", tags: "backend,database" },
    { title: "WebSocket Server - Live updates", priority: "medium", tags: "backend,realtime" },
    { title: "Docker Containerization - Full deployment", priority: "high", tags: "infrastructure,devops" },
    { title: "Domain Name Selection - pilot.io, relay.io, orbit.to", priority: "medium", tags: "networking,branding" },
    { title: "Internal DNS Setup - .to or .io domain", priority: "medium", tags: "networking,dns" },
    { title: "Entity Tracking Panel UI", priority: "low", tags: "frontend,ui" },
    { title: "Artifact Repository UI", priority: "low", tags: "frontend,ui" },
    { title: "Instruction Ledger UI", priority: "low", tags: "frontend,ui" },
    { title: "Advanced Memory Search", priority: "low", tags: "feature,search" },
    { title: "Notion Integration", priority: "low", tags: "integration,notion" },
];

async function createTask(task) {
    if (DRY_RUN) {
        console.log(`📝 Would create: ${task.title} (priority: ${task.priority})`);
        return true;
    }

    const payload = JSON.stringify({
        title: task.title,
        description: "Synced from project goals",
        column_id: "backlog",
        priority: task.priority,
        tags: task.tags.split(',').map(t => t.trim()),
        is_recurring: false,
        metadata: { source: "project-sync" }
    });

    return new Promise((resolve) => {
        const url = new URL('/api/tasks', MISSION_CONTROL_URL);
        const req = http.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 201) {
                    console.log(`✅ ${task.title}`);
                    resolve(true);
                } else {
                    console.log(`⚠️ Failed: ${task.title}`);
                    resolve(false);
                }
            });
        });
        req.on('error', (e) => {
            console.log(`❌ Error: ${e.message}`);
            resolve(false);
        });
        req.write(payload);
        req.end();
    });
}

async function main() {
    console.log('🚀 Starting Project Task Sync');
    console.log(`📡 Target: ${MISSION_CONTROL_URL}`);
    if (DRY_RUN) console.log('🧪 DRY RUN MODE\n');

    let created = 0;
    let failed = 0;

    for (const task of TASKS) {
        const success = await createTask(task);
        if (success) created++; else failed++;
    }

    console.log(`\n✅ Sync complete: ${created} created, ${failed} failed`);
}

main();
