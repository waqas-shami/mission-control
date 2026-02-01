import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cacheGet, cacheSet, publishMessage } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const columnId = searchParams.get('column_id');
    const assigneeId = searchParams.get('assignee_id');
    const cacheKey = `tasks:${columnId || 'all'}:${assigneeId || 'all'}`;
    
    // Try cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }

    let sql = 'SELECT * FROM tasks';
    const params: any[] = [];
    const conditions: string[] = [];

    if (columnId) {
      conditions.push('column_id = $1');
    }
    if (assigneeId) {
      conditions.push(conditions.length ? `assignee_id = $${conditions.length + 1}` : 'assignee_id = $1');
    }

    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    
    // Cache for 30 seconds
    await cacheSet(cacheKey, JSON.stringify(result.rows), 30);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, column_id, priority, assignee_id, due_date, tags, is_recurring, recurring_pattern } = body;

    const result = await query(
      `INSERT INTO tasks (title, description, column_id, priority, assignee_id, due_date, tags, is_recurring, recurring_pattern)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, description, column_id || 'backlog', priority || 'medium', assignee_id, due_date, tags || [], is_recurring || false, recurring_pattern]
    );

    const task = result.rows[0];

    // Publish to WebSocket channel
    await publishMessage('task:created', task);

    // Invalidate cache
    await cacheSet('tasks:all:all', '');

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = result.rows[0];

    // Publish update
    await publishMessage('task:updated', task);

    // Invalidate cache
    await cacheSet('tasks:all:all', '');

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    const result = await query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Publish deletion
    await publishMessage('task:deleted', { id });

    // Invalidate cache
    await cacheSet('tasks:all:all', '');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
