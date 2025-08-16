import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch comments for a question
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');
    
    if (!questionId) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    // Fetch approved comments with replies
    const { data: comments, error } = await supabaseAdmin
      .from('comments')
      .select('*')
      .eq('question_id', questionId)
      .eq('is_approved', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    // Organize comments into threaded structure
    const commentMap = new Map();
    const rootComments: Record<string, unknown>[] = [];

    // First pass: create comment map
    comments?.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: organize into threads
    comments?.forEach(comment => {
      if (comment.parent_id) {
        // This is a reply
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentMap.get(comment.id));
        }
      } else {
        // This is a root comment
        rootComments.push(commentMap.get(comment.id));
      }
    });

    return NextResponse.json({ 
      comments: rootComments,
      total: comments?.length || 0
    });
  } catch (error) {
    console.error('Error in GET /api/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new comment
export async function POST(request: NextRequest) {
  try {
    const { questionId, parentId, authorName, authorEmail, content } = await request.json();
    
    // Validate input
    if (!questionId || !authorName || !authorEmail || !content) {
      return NextResponse.json({ 
        error: 'Missing required fields: questionId, authorName, authorEmail, content' 
      }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authorEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Content length validation
    if (content.length > 2000) {
      return NextResponse.json({ error: 'Content too long (max 2000 characters)' }, { status: 400 });
    }

    if (authorName.length > 100) {
      return NextResponse.json({ error: 'Name too long (max 100 characters)' }, { status: 400 });
    }

    // Verify the question exists
    const { data: question, error: questionError } = await supabaseAdmin
      .from('questions')
      .select('id')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // If replying to a comment, verify the parent exists
    if (parentId) {
      const { data: parent, error: parentError } = await supabaseAdmin
        .from('comments')
        .select('id')
        .eq('id', parentId)
        .single();

      if (parentError || !parent) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
      }
    }

    // Insert the comment
    const { data: newComment, error: insertError } = await supabaseAdmin
      .from('comments')
      .insert({
        question_id: questionId,
        parent_id: parentId || null,
        author_name: authorName.trim(),
        author_email: authorEmail.trim(),
        content: content.trim(),
        is_approved: true // Auto-approve for now, add moderation later
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting comment:', insertError);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    return NextResponse.json({ 
      comment: newComment,
      message: 'Comment created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}