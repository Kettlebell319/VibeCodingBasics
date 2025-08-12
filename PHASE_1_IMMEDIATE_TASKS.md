# Phase 1 Immediate Tasks - VibeCodingBasics.com

## **Week 1: Database & Tier System Setup**

### **Day 1-2: Database Schema Updates**

#### **Task 1: Update Users Table for Tier System**
```sql
-- Run in Supabase SQL Editor
ALTER TABLE users ADD COLUMN tier VARCHAR(20) DEFAULT 'explorer';
ALTER TABLE users ADD COLUMN subscription_id VARCHAR(255);
ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN questions_used_this_month INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN monthly_limit INTEGER DEFAULT 5;
ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN last_reset_date DATE DEFAULT CURRENT_DATE;

-- Create indexes for performance
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
```

#### **Task 2: Create Subscription Tracking Table**
```sql
-- Run in Supabase SQL Editor
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  tier VARCHAR(20) NOT NULL,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON user_subscriptions(stripe_subscription_id);
```

#### **Task 3: Enhanced Usage Tracking Table**
```sql
-- Run in Supabase SQL Editor
CREATE TABLE user_usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month_year VARCHAR(7) NOT NULL,
  questions_used INTEGER DEFAULT 0,
  questions_limit INTEGER NOT NULL,
  tier VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

CREATE INDEX idx_usage_monthly_user ON user_usage_monthly(user_id);
CREATE INDEX idx_usage_monthly_period ON user_usage_monthly(month_year);
```

#### **Task 4: Create Monthly Reset Function**
```sql
-- Run in Supabase SQL Editor
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET questions_used_this_month = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE 
    AND EXTRACT(day FROM CURRENT_DATE) = 1;
END;
$$ LANGUAGE plpgsql;
```

### **Day 3-4: Tier System Implementation**

#### **Task 5: Create Tier Checking Middleware**
```bash
# Create new file: lib/middleware/tierCheck.ts
```

```typescript
// lib/middleware/tierCheck.ts
import { createClient } from '@supabase/supabase-js';
import db from '@/lib/db';

interface TierAccess {
  hasAccess: boolean;
  currentTier: string;
  upgradeRequired: boolean;
}

interface QuestionLimit {
  canAsk: boolean;
  questionsUsed: number;
  questionsLimit: number;
  resetDate: string;
}

export async function checkTierAccess(
  userId: string, 
  requiredTier: 'explorer' | 'builder' | 'expert'
): Promise<TierAccess> {
  try {
    const result = await db.query(
      'SELECT tier, subscription_status FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return { hasAccess: false, currentTier: 'explorer', upgradeRequired: true };
    }
    
    const user = result.rows[0];
    const tierOrder = { explorer: 0, builder: 1, expert: 2 };
    const hasAccess = tierOrder[user.tier] >= tierOrder[requiredTier];
    
    return {
      hasAccess,
      currentTier: user.tier,
      upgradeRequired: !hasAccess
    };
  } catch (error) {
    console.error('Error checking tier access:', error);
    return { hasAccess: false, currentTier: 'explorer', upgradeRequired: true };
  }
}

export async function checkQuestionLimit(userId: string): Promise<QuestionLimit> {
  try {
    const result = await db.query(`
      SELECT 
        questions_used_this_month,
        monthly_limit,
        tier,
        last_reset_date
      FROM users 
      WHERE id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return { canAsk: false, questionsUsed: 0, questionsLimit: 5, resetDate: '' };
    }
    
    const user = result.rows[0];
    
    // Check if we need to reset monthly usage
    const today = new Date();
    const lastReset = new Date(user.last_reset_date);
    const shouldReset = today.getMonth() !== lastReset.getMonth() || 
                       today.getFullYear() !== lastReset.getFullYear();
    
    if (shouldReset) {
      await db.query(`
        UPDATE users 
        SET questions_used_this_month = 0, last_reset_date = CURRENT_DATE 
        WHERE id = $1
      `, [userId]);
      user.questions_used_this_month = 0;
    }
    
    const canAsk = user.tier === 'builder' || user.tier === 'expert' || 
                   user.questions_used_this_month < user.monthly_limit;
    
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    return {
      canAsk,
      questionsUsed: user.questions_used_this_month,
      questionsLimit: user.tier === 'explorer' ? user.monthly_limit : -1, // -1 = unlimited
      resetDate: nextMonth.toISOString()
    };
  } catch (error) {
    console.error('Error checking question limit:', error);
    return { canAsk: false, questionsUsed: 0, questionsLimit: 5, resetDate: '' };
  }
}
```

#### **Task 6: Update Questions API with Tier Checking**
```bash
# Modify existing file: app/api/questions/route.ts
```

Add this before generating the Claude answer:
```typescript
// Add after user authentication, before generating answer
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

// After successful question creation, increment usage
if (user.tier === 'explorer') {
  await db.query(`
    UPDATE users 
    SET questions_used_this_month = questions_used_this_month + 1 
    WHERE id = $1
  `, [userId]);
}
```

#### **Task 7: Update Usage API**
```bash
# Modify existing file: app/api/usage/route.ts (or create if doesn't exist)
```

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkQuestionLimit } from '@/lib/middleware/tierCheck';

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

    const usage = await checkQuestionLimit(user.id);
    
    return NextResponse.json({
      tier: user.app_metadata?.tier || 'explorer',
      questionsUsed: usage.questionsUsed,
      questionsLimit: usage.questionsLimit,
      canAskQuestion: usage.canAsk,
      upgradeRequired: !usage.canAsk,
      resetDate: usage.resetDate
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}
```

### **Day 5-7: Stripe Integration**

#### **Task 8: Set Up Stripe Products**
```bash
# Install Stripe SDK
npm install stripe @stripe/stripe-js
```

#### **Task 9: Create Stripe Configuration**
```bash
# Create new file: lib/stripe/config.ts
```

```typescript
// lib/stripe/config.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const STRIPE_PRODUCTS = {
  builder: {
    priceId: process.env.STRIPE_BUILDER_PRICE_ID!, // You'll get this from Stripe dashboard
    name: 'Builder',
    price: 1900, // $19.00 in cents
    features: [
      'Unlimited AI questions',
      'Advanced search & filtering',
      'Weekly curated insights',
      'Export & save features',
      'Priority community access'
    ]
  },
  expert: {
    priceId: process.env.STRIPE_EXPERT_PRICE_ID!, // You'll get this from Stripe dashboard
    name: 'Expert', 
    price: 4900, // $49.00 in cents
    features: [
      'Everything in Builder',
      'Expert badge system',
      'Direct expert access',
      'Early feature access',
      'Revenue sharing (70/30)'
    ]
  }
};
```

#### **Task 10: Create Checkout API**
```bash
# Create new file: app/api/subscriptions/create-checkout/route.ts
```

```typescript
// app/api/subscriptions/create-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe, STRIPE_PRODUCTS } from '@/lib/stripe/config';

export async function POST(request: NextRequest) {
  try {
    const { tier } = await request.json();
    
    if (!tier || !STRIPE_PRODUCTS[tier]) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

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

    // Create or get Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          userId: user.id,
        },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRODUCTS[tier].priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?canceled=true`,
      metadata: {
        userId: user.id,
        tier: tier,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

#### **Task 11: Create Webhook Handler**
```bash
# Create new file: app/api/subscriptions/webhook/route.ts
```

```typescript
// app/api/subscriptions/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
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
  
  if (!userId) return;

  // Update user tier
  await db.query(`
    UPDATE users 
    SET tier = $1, 
        subscription_status = $2,
        subscription_expires_at = $3,
        monthly_limit = $4
    WHERE id = $5
  `, [
    tier,
    subscription.status,
    new Date(subscription.current_period_end * 1000),
    tier === 'explorer' ? 5 : -1, // -1 = unlimited
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
    new Date(subscription.current_period_start * 1000),
    new Date(subscription.current_period_end * 1000)
  ]);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  
  if (!userId) return;

  // Revert user to free tier
  await db.query(`
    UPDATE users 
    SET tier = 'explorer', 
        subscription_status = 'inactive',
        subscription_expires_at = NULL,
        monthly_limit = 5
    WHERE id = $1
  `, [userId]);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Handle successful payment - could send confirmation email
  console.log('Payment succeeded for invoice:', invoice.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Handle failed payment - could send notification email
  console.log('Payment failed for invoice:', invoice.id);
}
```

#### **Task 12: Update Environment Variables**
```bash
# Add to .env.local
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_BUILDER_PRICE_ID=price_... # Get from Stripe dashboard
STRIPE_EXPERT_PRICE_ID=price_... # Get from Stripe dashboard
```

### **Day 6-7: Frontend Integration**

#### **Task 13: Create Tier Badge Component**
```bash
# Create new file: components/ui/TierBadge.tsx
```

```typescript
// components/ui/TierBadge.tsx
import { Badge } from '@/components/ui/badge';

interface TierBadgeProps {
  tier: 'explorer' | 'builder' | 'expert';
  className?: string;
}

export default function TierBadge({ tier, className }: TierBadgeProps) {
  const config = {
    explorer: {
      label: 'Explorer',
      variant: 'secondary' as const,
      className: 'bg-gray-100 text-gray-700'
    },
    builder: {
      label: 'Builder', 
      variant: 'default' as const,
      className: 'bg-blue-100 text-blue-700'
    },
    expert: {
      label: 'Expert',
      variant: 'default' as const, 
      className: 'bg-purple-100 text-purple-700'
    }
  };

  const { label, variant, className: tierClassName } = config[tier];

  return (
    <Badge variant={variant} className={`${tierClassName} ${className}`}>
      {label}
    </Badge>
  );
}
```

#### **Task 14: Create Upgrade Modal**
```bash
# Create new file: components/billing/UpgradeModal.tsx
```

```typescript
// components/billing/UpgradeModal.tsx
'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsage: {
    questionsUsed: number;
    questionsLimit: number;
  };
}

export default function UpgradeModal({ isOpen, onClose, currentUsage }: UpgradeModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (tier: 'builder' | 'expert') => {
    setLoading(tier);
    
    try {
      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ tier })
      });

      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId });
      }
    } catch (error) {
      console.error('Error upgrading:', error);
      alert('Failed to start upgrade process. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Upgrade Your Plan</h2>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            You've used {currentUsage.questionsUsed} of {currentUsage.questionsLimit} free questions this month.
            Upgrade for unlimited AI-powered answers!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Builder Plan */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Builder
                <Badge className="bg-blue-100 text-blue-700">Most Popular</Badge>
              </CardTitle>
              <CardDescription>Perfect for active developers</CardDescription>
              <div className="text-3xl font-bold">$19<span className="text-sm font-normal">/month</span></div>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Unlimited AI questions
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Advanced search & filtering
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Weekly curated insights
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Export & save features
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Priority community access
                </li>
              </ul>
              
              <Button 
                onClick={() => handleUpgrade('builder')}
                disabled={loading !== null}
                className="w-full"
              >
                {loading === 'builder' ? 'Processing...' : 'Upgrade to Builder'}
              </Button>
            </CardContent>
          </Card>

          {/* Expert Plan */}
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Expert
                <Badge className="bg-purple-100 text-purple-700">Pro</Badge>
              </CardTitle>
              <CardDescription>For experts who want to monetize</CardDescription>
              <div className="text-3xl font-bold">$49<span className="text-sm font-normal">/month</span></div>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Everything in Builder
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Expert badge system
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Direct expert access
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Early feature access
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-600 mr-2" />
                  Revenue sharing (70/30)
                </li>
              </ul>
              
              <Button 
                onClick={() => handleUpgrade('expert')}
                disabled={loading !== null}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {loading === 'expert' ? 'Processing...' : 'Upgrade to Expert'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

#### **Task 15: Update Homepage with Tier System**
```bash
# Modify existing file: app/page.tsx
```

Add tier checking and upgrade prompts to the existing homepage. Import the new components and add upgrade logic when users hit their limits.

## **Week 2: Testing and Deployment**

### **Task 16: Set Up Stripe Products in Dashboard**
1. Go to Stripe Dashboard → Products
2. Create "VibeCodingBasics Builder" product at $19/month
3. Create "VibeCodingBasics Expert" product at $49/month
4. Copy price IDs to environment variables
5. Set up webhook endpoint for your domain

### **Task 17: Test Subscription Flow**
1. Test free tier usage limits
2. Test upgrade flow with Stripe test cards
3. Test webhook handling for subscription events
4. Test tier checking middleware
5. Test usage reset functionality

### **Task 18: Deploy to Production**
1. Update environment variables in Vercel
2. Set up production Stripe webhook
3. Test with real Stripe test mode
4. Monitor error logs and fix issues

## **Success Criteria for Phase 1**

### **Must Have Working:**
- [ ] Users are limited to 5 questions/month on free tier
- [ ] Upgrade flow works and redirects to Stripe checkout
- [ ] Webhooks properly update user tiers after payment
- [ ] Builder/Expert users have unlimited questions
- [ ] Usage resets monthly automatically
- [ ] UI shows current tier and usage status

### **Nice to Have:**
- [ ] Email confirmations for subscription changes
- [ ] Better error handling and user messaging
- [ ] Analytics tracking for conversion events
- [ ] A/B testing for upgrade prompts

## **Troubleshooting Common Issues**

### **Database Connection Issues**
- Check Supabase connection string
- Verify RLS policies allow operations
- Test with Supabase SQL editor first

### **Stripe Integration Issues**
- Verify webhook secret is correct
- Check that products/prices exist in Stripe
- Test with Stripe CLI for local development

### **Authentication Issues**
- Ensure Supabase JWT is passed correctly
- Check user ID matches between systems
- Verify auth middleware is working

## **Next Steps After Phase 1**
Once Phase 1 is complete and tested, you'll be ready to move on to Phase 2 (Community Features) with a solid foundation of:
- Working subscription system
- Tier-based access control
- Usage tracking and limits
- Revenue generation capability

This gives you immediate monetization capability and validates the business model before building more advanced features.