/**
 * Real-time Task Sync - Mission Control Integration
 * Run this after each significant conversation to sync tasks
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const MISSION_CONTROL_URL = process.env.MISSION_CONTROL_URL || 'http://localhost:3003';

// Task patterns to extract from conversation
const TASK_PATTERNS = [
  { regex: /[-*]\s*\[ \]/g, priority: 'medium' },
  { regex: /TODO:/gi, priority: 'high' },
  { regex: /FIXME:/gi, priority: 'high' },
  { regex: /Action Item:/gi, priority: 'medium' },
  { regex: /Next Step:/gi, priority: 'medium' },
  { regex: /should\s+(we|we'll|we can)/gi, priority: 'low' },
];

interface Task {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  source: string;
}

/**
 * Extract tasks from conversation text
 */
export function extractTasks(conversationText: string, source: string): Task[] {
  const tasks: Task[] = [];
  const lines = conversationText.split('\n');
  
  // Multi-line task detection
  let inList = false;
  let currentTask = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check for list items
    if (trimmed.match(/^[-*]\s+\w+/)) {
      inList = true;
      currentTask = trimmed.replace(/^[-*]\s+/, '');
      
      // Determine priority
      let priority: Task['priority'] = 'medium';
      if (trimmed.match(/urgent|critical|asap|important|immediately/i)) {
        priority = 'critical';
      } else if (trimmed.match(/low|when|eventually|sometime/i)) {
        priority = 'low';
      }
      
      // Extract tags
      const tags = ['synced', 'real-time'];
      if (trimmed.match(/build|create|deploy|coding/i)) tags.push('development');
      if (trimmed.match(/research|learn|study/i)) tags.push('research');
      if (trimmed.match(/setup|config|install|deploy/i)) tags.push('infrastructure');
      if (trimmed.match(/domain|dns|network/i)) tags.push('networking');
      
      if (currentTask.length > 5 && currentTask.length < 300) {
        tasks.push({
          title: currentTask,
          description: `Real-time sync from ${source}`,
          priority,
          tags,
          source,
        });
      }
    }
  }
  
  return tasks;
}

/**
 * Create a task in Mission Control
 */
export async function createTask(task: Task): Promise<boolean> {
  try {
    const response = await fetch(`${MISSION_CONTROL_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        column_id: 'backlog',
        priority: task.priority,
        tags: task.tags,
        is_recurring: false,
        metadata: { source: task.source, synced_at: new Date().toISOString() },
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to create task:', error);
    return false;
  }
}

/**
 * Sync all tasks from a conversation
 */
export async function syncConversation(conversationText: string, source: string): Promise<{
  found: number;
  synced: number;
  failed: number;
}> {
  const tasks = extractTasks(conversationText, source);
  let synced = 0;
  let failed = 0;
  
  for (const task of tasks) {
    const success = await createTask(task);
    if (success) {
      synced++;
      console.log(`✅ Synced: ${task.title.substring(0, 50)}...`);
    } else {
      failed++;
    }
  }
  
  return { found: tasks.length, synced, failed };
}

/**
 * Quick sync helper for CLI
 */
export function quickSync(memoryFilePath: string): void {
  if (!existsSync(memoryFilePath)) {
    console.error('Memory file not found:', memoryFilePath);
    process.exit(1);
  }
  
  const content = readFileSync(memoryFilePath, 'utf-8');
  const filename = memoryFilePath.split('/').pop() || 'unknown';
  
  syncConversation(content, filename).then(({ found, synced, failed }) => {
    console.log(`\n📊 Sync Complete`);
    console.log(`   Found: ${found}`);
    console.log(`   Synced: ${synced}`);
    console.log(`   Failed: ${failed}`);
  });
}

// CLI execution
if (process.argv[1]?.includes('sync-realtime')) {
  const filePath = process.argv[2] || `${process.env.HOME}/.clawdbot/memory/${new Date().toISOString().split('T')[0]}.md`;
  quickSync(filePath);
}

export default { extractTasks, createTask, syncConversation, quickSync };
