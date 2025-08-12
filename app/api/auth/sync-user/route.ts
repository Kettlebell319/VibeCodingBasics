import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { user } = await request.json();
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
    }

    // Extract user info
    const email = user.email;
    const username = user.user_metadata?.preferred_username || 
                    user.user_metadata?.user_name || 
                    email.split('@')[0];
    const fullName = user.user_metadata?.full_name || 
                    user.user_metadata?.name || 
                    username;
    const avatarUrl = user.user_metadata?.avatar_url || 
                     user.user_metadata?.picture;

    // Insert or update user in local database
    await db.query(`
      INSERT INTO users (id, email, username, full_name, avatar_url)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW()
    `, [
      user.id,
      email,
      username,
      fullName,
      avatarUrl
    ]);
    
    return NextResponse.json({ 
      success: true,
      message: 'User synced successfully' 
    });
    
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Failed to sync user' }, 
      { status: 500 }
    );
  }
}