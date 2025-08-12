import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateAnswer } from '@/lib/claude-mock'; // Temporarily using mock for clean testing
import { checkQuestionLimit, incrementQuestionUsage } from '@/lib/middleware/tierCheck';
import { createClient } from '@supabase/supabase-js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader || '',
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;
    
    // Check usage limits with new tier system
    const limitCheck = await checkQuestionLimit(userId);
    
    if (!limitCheck.canAsk) {
      return NextResponse.json(
        {
          upgradeRequired: true,
          message: 'You have reached your monthly question limit. Upgrade to Builder for unlimited questions!',
          questionsUsed: limitCheck.questionsUsed,
          questionsLimit: limitCheck.questionsLimit,
          resetDate: limitCheck.resetDate
        },
        { status: 429 }
      );
    }

    // Get user tier for Claude API
    const userResult = await db.query('SELECT tier FROM users WHERE id = $1', [userId]);
    const currentTier = userResult.rows[0]?.tier || 'explorer';
    const claudeTier = currentTier === 'explorer' ? 'free' : 'premium';
    
    // Generate answer using Claude
    const answer = await generateAnswer(title, content, claudeTier);

    // Create question and answer in database
    let slug = slugify(title);
    
    // Check if slug already exists and make it unique if needed
    const existingSlug = await db.query(`
      SELECT slug FROM questions WHERE slug = $1
    `, [slug]);
    
    if (existingSlug.rows.length > 0) {
      // Check if the existing question has the same content from the same user
      const duplicateCheck = await db.query(`
        SELECT id, slug FROM questions 
        WHERE user_id = $1 AND (title = $2 OR content = $3)
        ORDER BY created_at DESC LIMIT 1
      `, [userId, title, content]);
      
      if (duplicateCheck.rows.length > 0) {
        // Redirect to existing question
        return NextResponse.json({
          question: { slug: duplicateCheck.rows[0].slug },
          isExisting: true
        });
      }
      
      // Make slug unique by adding timestamp
      slug = `${slug}-${Date.now()}`;
    }
    
    // Insert question
    const questionResult = await db.query(`
      INSERT INTO questions (user_id, title, content, slug, status, category, tags)
      VALUES ($1, $2, $3, $4, 'published', $5, $6)
      RETURNING *
    `, [userId, title, content, slug, answer.category, answer.tags]);

    const question = questionResult.rows[0];

    // Insert answer
    await db.query(`
      INSERT INTO answers (question_id, content, seo_title, seo_description, claude_model, response_time_ms)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      question.id,
      answer.content,
      answer.seoTitle,
      answer.seoDescription,
      claudeTier === 'premium' ? 'claude-3-5-sonnet-20241022' : 'claude-3-haiku-20240307',
      answer.responseTime
    ]);

    // Increment usage for explorer tier users
    await incrementQuestionUsage(userId);

    // Get updated usage info
    const updatedLimit = await checkQuestionLimit(userId);

    return NextResponse.json({
      success: true,
      question,
      answer,
      remainingQuestions: currentTier === 'explorer' ? (updatedLimit.questionsLimit - updatedLimit.questionsUsed) : null,
      userTier: currentTier,
      questionsUsed: updatedLimit.questionsUsed,
      questionsLimit: updatedLimit.questionsLimit
    });

  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const userOnly = searchParams.get('user_only') === 'true';

    // Get authenticated user for user_only queries
    let userId = null;
    if (userOnly) {
      const authHeader = request.headers.get('authorization');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: authHeader || '' } }
        }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ questions: [] });
      }
      userId = user.id;
    }

    let query = `
      SELECT q.*, a.seo_title, a.seo_description
      FROM questions q
      LEFT JOIN answers a ON q.id = a.question_id
      WHERE q.status = 'published'
    `;
    const queryParams: unknown[] = [];

    if (userId) {
      query += ` AND q.user_id = $${queryParams.length + 1}`;
      queryParams.push(userId);
    }

    if (category && category !== 'all') {
      query += ` AND q.category = $${queryParams.length + 1}`;
      queryParams.push(category);
    }

    query += ` ORDER BY q.created_at DESC LIMIT $${queryParams.length + 1}`;
    queryParams.push(limit);

    const result = await db.query(query, queryParams);

    return NextResponse.json({
      questions: result.rows
    });

  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}