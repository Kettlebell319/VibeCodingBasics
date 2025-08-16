// app/api/subscriptions/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import db from '@/lib/db';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  const tier = subscription.metadata.tier;
  
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  try {
    // Update user tier
    await db.query(`
      UPDATE users 
      SET tier = $1, 
          subscription_status = $2,
          subscription_expires_at = $3,
          monthly_limit = $4,
          subscription_id = $5
      WHERE id = $6
    `, [
      tier,
      subscription.status,
      new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
      tier === 'free' ? 30 : 300, // Updated limits for free/pro
      subscription.id,
      userId
    ]);

    // Update or create subscription record
    await db.query(`
      INSERT INTO user_subscriptions (
        user_id, stripe_subscription_id, stripe_customer_id, 
        status, tier, current_period_start, current_period_end
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (stripe_subscription_id) 
      DO UPDATE SET 
        status = $4, 
        tier = $5, 
        current_period_start = $6, 
        current_period_end = $7,
        updated_at = NOW()
    `, [
      userId,
      subscription.id,
      subscription.customer,
      subscription.status,
      tier,
      new Date((subscription as unknown as { current_period_start: number }).current_period_start * 1000),
      new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000)
    ]);
    
    console.log(`Successfully updated subscription for user ${userId} to tier ${tier}`);
  } catch (error) {
    console.error('Error updating subscription:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  try {
    // Revert user to free tier
    await db.query(`
      UPDATE users 
      SET tier = 'free', 
          subscription_status = 'canceled',
          subscription_expires_at = NULL,
          monthly_limit = 30,
          subscription_id = NULL
      WHERE id = $1
    `, [userId]);
    
    console.log(`Successfully downgraded user ${userId} to explorer tier`);
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Handle successful payment - could send confirmation email
  console.log('Payment succeeded for invoice:', invoice.id);
  
  // You could add email notification logic here
  // await sendPaymentSuccessEmail(invoice);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Handle failed payment - could send notification email
  console.log('Payment failed for invoice:', invoice.id);
  
  // You could add email notification logic here
  // await sendPaymentFailedEmail(invoice);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier;
  
  if (!userId || !tier) {
    console.error('Missing metadata in checkout session');
    return;
  }
  
  console.log(`Checkout completed for user ${userId}, tier ${tier}`);
  
  // The subscription webhook will handle the actual tier update
  // This is just for logging/analytics
}