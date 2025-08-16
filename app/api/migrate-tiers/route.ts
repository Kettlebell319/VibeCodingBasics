import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('Starting tier migration...');
    
    // Update existing users to new tier structure - step by step
    
    // First, update explorer -> free
    const { error: explorerError } = await supabaseAdmin
      .from('users')
      .update({ tier: 'free', monthly_limit: 30 })
      .eq('tier', 'explorer');
    
    if (explorerError) {
      console.error('Explorer update error:', explorerError);
    }

    // Update builder -> pro  
    const { error: builderError } = await supabaseAdmin
      .from('users')
      .update({ tier: 'pro', monthly_limit: 300 })
      .eq('tier', 'builder');
      
    if (builderError) {
      console.error('Builder update error:', builderError);
    }

    // Update expert -> pro
    const { error: expertError } = await supabaseAdmin
      .from('users')
      .update({ tier: 'pro', monthly_limit: 300 })
      .eq('tier', 'expert');
      
    if (expertError) {
      console.error('Expert update error:', expertError);
    }

    const error = explorerError || builderError || expertError;

    if (error) {
      console.error('Migration error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get count of affected users
    const { data: users, error: countError } = await supabaseAdmin
      .from('users')
      .select('id, tier, monthly_limit');

    if (countError) {
      console.error('Error counting users:', countError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Tier migration completed',
      totalUsers: users?.length || 0,
      users: users?.map(u => ({ id: u.id.substring(0, 8), tier: u.tier, limit: u.monthly_limit }))
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { error: 'Migration failed' }, 
      { status: 500 }
    );
  }
}