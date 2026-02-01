import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cacheGet, cacheSet, publishMessage } from '@/lib/redis';

// Valid column IDs
const VALID_COLUMNS = ['recurring', 'backlog', 'in_progress', 'review', 'completed'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const columnId = searchParams.get('column_id');
    const assigneeId = searchParams.get('assignee_id');
    const cacheKey = `tasks:${columnId || 'all'}:${assigneeId || 'all'}`;
    
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }

    let sql = 'SELECT * FROM tasks';
    const params: any[] = [];
    
    if (columnId) {
      sql += ' WHERE column_id = $1';
      params.push(columnId);
    }
    
    if (assigneeId && !columnId) {
      sql += ' WHERE assignee_id = $1';
      params.push(assigneeId);
    } else if (assigneeId && columnId) {
      sql += ' AND assignee_id = $2';
      params.push(assigneeId);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    
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

    const safeColumnId = VALID_COLUMNS.includes(column_id) ? column_id : 'backlog';

    const result = await query(
      `INSERT INTO tasks (title, description, column_id, priority, assignee_id, due_date, tags, is_recurring, recurring_pattern)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, description, safeColumnId, priority || 'medium', assignee_id, due_date, tags || [], is_recurring || false, recurring_pattern]
    );

    const task = result.rows[0];

    await publishMessage('task:created', task);
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
    const { id, column_id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    // Validate and build the update object
    const updateFields: Record<string, any> = {};
    
    // Handle column_id separately with validation
    if (column_id !== undefined) {
      if (VALID_COLUMNS.includes(column_id)) {
        updateFields.column_id = column_id;
      } else {
        return NextResponse.json({ error: 'Invalid column_id value' }, { status: 400 });
      }
    }

    // Handle other fields
    const allowedFields = ['title', 'description', 'priority', 'assignee_id', 'due_date', 'tags', 'is_recurring'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateFields[field] = updates[field];
      }
    });

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Build SET clause
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updateFields).forEach(([key, value]) => {
      setClauses.push(`${key} = $${paramIndex}`);
      if (key === 'tags') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
      paramIndex++;
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

    await publishMessage('task:updated', task);
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

    await publishMessage('task:deleted', { id });
    await cacheSet('tasks:all:all', '');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
