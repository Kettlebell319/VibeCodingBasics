import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { q, limit = 5 } = await request.json();

    if (!q || q.trim().length < 3) {
      return NextResponse.json({ similar: [] });
    }

    // Search for similar questions using simple text matching
    const query = `
      SELECT 
        q.*,
        a.seo_title
      FROM questions q
      LEFT JOIN answers a ON q.id = a.question_id
      WHERE q.status = 'published'
        AND (
          q.title ILIKE '%' || $1 || '%'
          OR q.content ILIKE '%' || $1 || '%'
          OR q.tags::text ILIKE '%' || $1 || '%'
        )
      ORDER BY q.view_count DESC, q.created_at DESC
      LIMIT $2
    `;

    const result = await db.query(query, [q, limit]);

    return NextResponse.json({
      similar: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        category: row.category,
        view_count: row.view_count,
        created_at: row.created_at,
        similarity: 1
      }))
    });

  } catch (error) {
    console.error('Error searching questions:', error);
    return NextResponse.json(
      { error: 'Failed to search questions' },
      { status: 500 }
    );
  }
}