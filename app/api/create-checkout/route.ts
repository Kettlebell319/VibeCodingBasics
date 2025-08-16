import { NextRequest, NextResponse } from 'next/server';
import { stripe, getTierConfig, TierType } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const headersList = await headers();
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_APP_URL;
    
    const { tier, userId } = await req.json();
    
    // Validate tier
    if (!['explorer', 'builder', 'expert'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }
    
    const tierConfig = getTierConfig(tier as TierType);
    
    if (!tierConfig.stripePriceId) {
      return NextResponse.json(
        { error: `Price ID not configured for ${tier} tier` }, 
        { status: 500 }
      );
    }
    
    // Get user details from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: tierConfig.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscription/cancel`,
      metadata: {
        userId: user.id,
        tier: tier,
      },
      customer_email: user.email,
      billing_address_collection: 'auto',
      subscription_data: {
        metadata: {
          userId: user.id,
          tier: tier,
        },
      },
    });
    
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' }, 
      { status: 500 }
    );
  }
}