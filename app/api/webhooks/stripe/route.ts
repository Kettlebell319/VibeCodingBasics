import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature')!;
    
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET is not defined');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('⚠️  Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    const supabase = createClient();
    
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        if (session.mode === 'subscription') {
          const userId = session.metadata?.userId;
          const tier = session.metadata?.tier;
          const subscriptionId = session.subscription;
          
          if (!userId || !tier) {
            console.error('Missing userId or tier in session metadata');
            break;
          }
          
          // Update user's tier and subscription status
          const { error: updateError } = await supabase
            .from('users')
            .update({
              tier: tier,
              subscription_status: 'active',
              stripe_customer_id: session.customer,
              stripe_subscription_id: subscriptionId,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
          
          if (updateError) {
            console.error('Error updating user subscription:', updateError);
          } else {
            console.log(`✅ Updated user ${userId} to ${tier} tier`);
          }
          
          // Reset their monthly usage
          const { error: usageError } = await supabase
            .from('monthly_usage')
            .upsert({
              user_id: userId,
              month: new Date().toISOString().slice(0, 7), // YYYY-MM format
              questions_asked: 0
            });
          
          if (usageError) {
            console.error('Error resetting monthly usage:', usageError);
          }
        }
        break;
        
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Find user by customer ID
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        
        if (userError || !user) {
          console.error('User not found for customer:', customerId);
          break;
        }
        
        // Update subscription status
        let status = 'active';
        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          status = 'canceled';
        } else if (subscription.status === 'past_due') {
          status = 'past_due';
        }
        
        const { error: statusError } = await supabase
          .from('users')
          .update({
            subscription_status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        
        if (statusError) {
          console.error('Error updating subscription status:', statusError);
        } else {
          console.log(`✅ Updated subscription status for user ${user.id} to ${status}`);
        }
        break;
        
      case 'customer.subscription.deleted':
        const deletedSub = event.data.object;
        const deletedCustomerId = deletedSub.customer;
        
        // Find user and downgrade to free tier
        const { data: deletedUser, error: deletedUserError } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', deletedCustomerId)
          .single();
        
        if (deletedUserError || !deletedUser) {
          console.error('User not found for deleted subscription:', deletedCustomerId);
          break;
        }
        
        const { error: downgradeError } = await supabase
          .from('users')
          .update({
            tier: 'free',
            subscription_status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('id', deletedUser.id);
        
        if (downgradeError) {
          console.error('Error downgrading user:', downgradeError);
        } else {
          console.log(`✅ Downgraded user ${deletedUser.id} to free tier`);
        }
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}