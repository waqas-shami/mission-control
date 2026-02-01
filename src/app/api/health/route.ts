import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import redis from '@/lib/redis';

export async function GET() {
  try {
    // Check database
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    const dbLatency = Date.now() - dbStart;

    // Check Redis
    const redisStart = Date.now();
    await redis.ping();
    const redisLatency = Date.now() - redisStart;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: { status: 'healthy', latency_ms: dbLatency },
        redis: { status: 'healthy', latency_ms: redisLatency },
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
