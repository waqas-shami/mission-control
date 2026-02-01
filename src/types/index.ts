export type TaskColumn = 'recurring' | 'backlog' | 'in_progress' | 'review' | 'completed';

export interface Entity {
  id: string;
  name: string;
  type: 'human' | 'agent' | 'system';
  metadata: Record<string, any>;
  status: 'active' | 'idle' | 'offline';
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  column_id: TaskColumn;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee_id?: string;
  due_date?: string;
  tags: string[];
  metadata: Record<string, any>;
  is_recurring: boolean;
  recurring_pattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
  };
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  task_id?: string;
  entity_id?: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

export interface Instruction {
  id: string;
  source: string;
  content: string;
  context: Record<string, any>;
  priority: number;
  active: boolean;
  created_at: string;
  expires_at?: string;
}

export interface Artifact {
  id: string;
  name: string;
  type: string;
  path?: string;
  url?: string;
  metadata: Record<string, any>;
  created_by?: string;
  created_at: string;
}

export interface KanbanMetrics {
  weeklyVelocity: number;
  activeLoad: number;
  totalInventory: number;
  completionRate: number;
  columnCounts: Record<TaskColumn, number>;
}
