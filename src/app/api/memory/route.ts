import { NextRequest, NextResponse } from 'next/server';
import { memory_search } from '@/lib/memory-tools';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, maxResults = 5 } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    // Use the memory_search tool from our system
    const results = await memory_search({
      query,
      maxResults,
    });

    return NextResponse.json({
      query,
      results: results.map((r: any) => ({
        path: r.path,
        lines: r.lines,
        content: r.content || '',
        score: r.score,
      })),
    });
  } catch (error) {
    console.error('Memory search API error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
