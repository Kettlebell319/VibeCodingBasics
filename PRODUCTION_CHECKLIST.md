# VibeCode Platform - Production Checklist

## 🎯 **Current Status: 70% Complete**
You have a working MVP that generates mock responses. Here's what you need to make it fully functional.

---

# 🔑 **PHASE 1: Get API Keys & Basic Functionality (30 minutes)**

## **Step 1: Get Claude API Key**
- [ ] Go to https://console.anthropic.com/
- [ ] Create account or sign in
- [ ] Navigate to "API Keys" 
- [ ] Create new API key
- [ ] Copy the key (starts with `sk-ant-`)

**Add to `.env.local`:**
```bash
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

## **Step 2: Switch to Real Claude API**
- [ ] Open `/Users/kevinbell/Coding/vibecode-platform/app/api/questions/route.ts`
- [ ] Change line 3 from:
```typescript
import { generateAnswer } from '@/lib/claude-mock';
```
**To:**
```typescript
import { generateAnswer } from '@/lib/claude';
```

## **Step 3: Test Real AI Generation**
- [ ] Restart your dev server: `npm run dev`
- [ ] Go to http://localhost:3000
- [ ] Ask a new question: "How do I deploy a Next.js app to Vercel?"
- [ ] Verify you get a real Claude response (not the mock)

---

# 👤 **PHASE 2: Add User Authentication (1-2 hours)**

## **Step 1: Set up Supabase**
- [ ] Go to https://supabase.com/
- [ ] Create new project
- [ ] Wait for project to be ready (2-3 minutes)
- [ ] Go to Settings → API
- [ ] Copy `URL` and `anon public` key

**Update `.env.local`:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## **Step 2: Configure Supabase Auth**
- [ ] In Supabase dashboard, go to Authentication → Settings
- [ ] Set Site URL to: `http://localhost:3000`
- [ ] Add redirect URL: `http://localhost:3000/auth/callback`
- [ ] Enable email auth (default)
- [ ] Optional: Enable Google/GitHub OAuth

## **Step 3: Sync Users to Local Database**
- [ ] Create this API route: `/app/api/auth/sync-user/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { user } = await request.json();
    
    // Insert or update user in local database
    await db.query(`
      INSERT INTO users (id, email, username, full_name, avatar_url)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW()
    `, [
      user.id,
      user.email,
      user.email.split('@')[0], // username from email
      user.user_metadata?.full_name || user.email.split('@')[0],
      user.user_metadata?.avatar_url
    ]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
  }
}
```

## **Step 4: Add Auth Components**
- [ ] Create `/components/auth/auth-button.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      
      // Sync user to local database
      if (session?.user) {
        await fetch('/api/auth/sync-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: session.user })
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <Button disabled>Loading...</Button>;

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user.email}
        </span>
        <Button onClick={handleSignOut} variant="outline" size="sm">
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleSignIn} size="sm">
      Sign In
    </Button>
  );
}
```

## **Step 5: Update Main Page with Auth**
- [ ] Replace auth buttons in `/app/page.tsx`:

```typescript
// Replace the header section with:
<div className="flex items-center space-x-4">
  <AuthButton />
</div>
```

- [ ] Add import: `import AuthButton from '@/components/auth/auth-button';`

## **Step 6: Create Auth Callback**
- [ ] Create `/app/auth/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL('/', request.url));
}
```

---

# 💳 **PHASE 3: Add Stripe Billing (2-3 hours)**

## **Step 1: Set up Stripe**
- [ ] Go to https://stripe.com/
- [ ] Create account
- [ ] Get test API keys from Dashboard → Developers → API keys
- [ ] Copy Publishable key (`pk_test_...`) and Secret key (`sk_test_...`)

**Update `.env.local`:**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
```

## **Step 2: Create Stripe Product**
- [ ] In Stripe dashboard, go to Products
- [ ] Create new product: "VibeCode Premium"
- [ ] Set price: $19/month recurring
- [ ] Copy the Price ID (`price_...`)

## **Step 3: Update Stripe Config**
- [ ] Edit `/lib/stripe.ts`:

```typescript
export const STRIPE_PRICE_ID = 'price_your_actual_price_id_here';
```

## **Step 4: Create Stripe Routes**
- [ ] Create `/app/api/stripe/create-checkout/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRICE_ID } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      client_reference_id: userId,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
```

## **Step 5: Add Pricing Page**
- [ ] Create `/app/pricing/page.tsx`

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function PricingPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleUpgrade = async () => {
    if (!user) {
      alert('Please sign in first');
      return;
    }

    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id })
    });

    const { url } = await response.json();
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600">Get unlimited access to AI-powered vibecoding answers</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Free</CardTitle>
              <div className="text-3xl font-bold">$0<span className="text-lg font-normal">/month</span></div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-2" />3 questions per day</li>
                <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-2" />Basic AI responses</li>
                <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-2" />Community access</li>
              </ul>
              <Button className="w-full mt-6" variant="outline" disabled>
                Current Plan
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="border-blue-500 border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Premium</CardTitle>
              <div className="text-3xl font-bold">$19<span className="text-lg font-normal">/month</span></div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-2" />Unlimited questions</li>
                <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-2" />Priority AI responses</li>
                <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-2" />Expert-reviewed answers</li>
                <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-2" />Advanced features</li>
              </ul>
              <Button className="w-full mt-6" onClick={handleUpgrade}>
                Upgrade Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

# 🚀 **PHASE 4: Real User Integration (1 hour)**

## **Step 1: Update Question API to Use Real Users**
- [ ] Edit `/app/api/questions/route.ts`
- [ ] Replace the mock user ID section:

```typescript
// Replace this line:
const userId = '550e8400-e29b-41d4-a716-446655440000';

// With this:
const { data: { user }, error } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}
const userId = user.id;
```

- [ ] Add this import at the top: `import { supabase } from '@/lib/supabase';`

## **Step 2: Update Homepage to Show Real Usage**
- [ ] Edit `/app/page.tsx`
- [ ] Replace the static usage indicator with dynamic data:

```typescript
// Add this hook at the top of the component:
const [usage, setUsage] = useState({ questionsUsed: 0, questionsRemaining: 3 });
const [user, setUser] = useState(null);

useEffect(() => {
  // Get user and usage data
  supabase.auth.getUser().then(({ data: { user } }) => {
    setUser(user);
    if (user) {
      // Fetch usage data
      fetch('/api/usage')
        .then(res => res.json())
        .then(data => setUsage(data));
    }
  });
}, []);

// Replace the static badge with:
<Badge variant="outline" className="px-4 py-2">
  <Zap className="h-4 w-4 mr-2" />
  Questions today: {usage.questionsUsed}/{user ? 'unlimited' : '3'} 
  {!user && '(Free)'}
</Badge>
```

## **Step 3: Create Usage API**
- [ ] Create `/app/api/usage/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkUsageLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const usage = await checkUsageLimit(user.id);
    
    return NextResponse.json(usage);
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
```

---

# 🌐 **PHASE 5: Deploy to Production (30 minutes)**

## **Step 1: Set up Production Database**
- [ ] In Supabase dashboard, go to Settings → Database
- [ ] Copy the connection string
- [ ] Run your schema on production:

```bash
# Connect to production DB and run:
psql "your-production-connection-string" < schema.sql
```

## **Step 2: Deploy to Vercel**
- [ ] Push code to GitHub:

```bash
git add .
git commit -m "Complete VibeCode platform"
git push origin main
```

- [ ] Go to https://vercel.com/
- [ ] Import your GitHub repository
- [ ] Add environment variables in Vercel dashboard:
  - `ANTHROPIC_API_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `DATABASE_URL` (production)

- [ ] Deploy!

## **Step 3: Update Supabase URLs**
- [ ] In Supabase dashboard, update:
  - Site URL: `https://your-app.vercel.app`
  - Redirect URLs: `https://your-app.vercel.app/auth/callback`

---

# ✅ **VERIFICATION CHECKLIST**

## **Test Complete User Journey:**
- [ ] User can visit homepage
- [ ] User can sign in with GitHub/Google
- [ ] User can ask a question and get AI response
- [ ] Free user hits 3-question limit
- [ ] User can upgrade to premium via Stripe
- [ ] Premium user gets unlimited questions
- [ ] All questions become SEO-friendly blog posts
- [ ] Search finds existing questions
- [ ] Mobile experience works perfectly

## **Business Metrics Working:**
- [ ] Usage tracking per user
- [ ] Payment processing
- [ ] Subscription management
- [ ] SEO metadata generation
- [ ] Question categorization

---

# 🎯 **SUCCESS CRITERIA**

When you complete this checklist, you'll have:

✅ **Fully functional AI Q&A platform**
✅ **Real user authentication** 
✅ **Working payment system**
✅ **SEO-optimized content**
✅ **Production deployment**
✅ **Revenue-generating business**

**Estimated Total Time: 4-6 hours**

The hardest part (building the platform) is done. Now it's just connecting the APIs and deploying! 🚀