import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cacheGet, cacheSet } from '@/lib/redis';
import type { KanbanMetrics, TaskColumn } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const cacheKey = 'kanban-metrics';
    const cached = await cacheGet(cacheKey);
    
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }

    // Get total task count
    const totalResult = await query('SELECT COUNT(*) as count FROM tasks');
    const totalInventory = parseInt(totalResult.rows[0].count);

    // Get column counts
    const columnResult = await query(
      `SELECT column_id, COUNT(*) as count FROM tasks GROUP BY column_id`
    );
    
    const columnCounts: Record<TaskColumn, number> = {
      recurring: 0,
      backlog: 0,
      in_progress: 0,
      review: 0,
      completed: 0,
    };

    columnResult.rows.forEach((row: any) => {
      columnCounts[row.column_id as TaskColumn] = parseInt(row.count);
    });

    // Calculate metrics
    const activeLoad = columnCounts.in_progress + columnCounts.review;
    
    // Weekly velocity: tasks completed in last 7 days
    const weeklyResult = await query(
      `SELECT COUNT(*) as count FROM tasks 
       WHERE column_id = 'completed' 
       AND updated_at >= NOW() - INTERVAL '7 days'`
    );
    const weeklyVelocity = parseInt(weeklyResult.rows[0].count);

    // Completion rate
    const completionRate = totalInventory > 0 
      ? Math.round((columnCounts.completed / totalInventory) * 100) 
      : 0;

    const metrics: KanbanMetrics = {
      weeklyVelocity,
      activeLoad,
      totalInventory,
      completionRate,
      columnCounts,
    };

    // Cache for 10 seconds
    await cacheSet(cacheKey, JSON.stringify(metrics), 10);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
