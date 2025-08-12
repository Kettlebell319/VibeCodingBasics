import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserTierInfo } from '@/lib/middleware/tierCheck';

export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tierInfo = await getUserTierInfo(user.id);
    
    if (!tierInfo) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      tier: tierInfo.tier,
      subscriptionStatus: tierInfo.subscriptionStatus,
      questionsUsed: tierInfo.questionsUsed,
      questionsLimit: tierInfo.questionsLimit,
      canAskQuestion: tierInfo.canAskQuestion,
      upgradeRequired: !tierInfo.canAskQuestion && tierInfo.tier === 'explorer',
      subscriptionExpiresAt: tierInfo.subscriptionExpiresAt,
      nextResetDate: tierInfo.nextResetDate,
      // Legacy fields for backward compatibility
      canAsk: tierInfo.canAskQuestion,
      questionsRemaining: tierInfo.tier === 'explorer' ? 
        Math.max(0, tierInfo.questionsLimit - tierInfo.questionsUsed) : 'unlimited',
      isPremium: tierInfo.tier !== 'explorer'
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}