# VibeCodingBasics.com - Technical Requirements

## **Phase 1: Subscription System Implementation**

### **API Endpoints to Create/Modify**

#### **Subscription Management**
```typescript
// POST /api/subscriptions/create-checkout
// Create Stripe checkout session for subscription
interface CreateCheckoutRequest {
  tier: 'builder' | 'expert';
  successUrl: string;
  cancelUrl: string;
}

// POST /api/subscriptions/webhook  
// Handle Stripe webhook events
interface StripeWebhookEvent {
  type: string;
  data: {
    object: any;
  };
}

// GET /api/subscriptions/status
// Get current user's subscription status
interface SubscriptionStatus {
  tier: 'explorer' | 'builder' | 'expert';
  status: 'active' | 'canceled' | 'past_due' | 'inactive';
  currentPeriodEnd: string;
  questionsUsed: number;
  questionsLimit: number;
}

// POST /api/subscriptions/cancel
// Cancel current subscription
interface CancelSubscriptionRequest {
  reason?: string;
}
```

#### **Usage Tracking Enhancement**
```typescript
// Modify existing /api/questions endpoint
// Add tier-based usage checking

// GET /api/usage/current
// Enhanced usage endpoint with tier information
interface UsageResponse {
  tier: 'explorer' | 'builder' | 'expert';
  currentMonth: string;
  questionsUsed: number;
  questionsLimit: number;
  canAskQuestion: boolean;
  upgradeRequired: boolean;
  nextResetDate: string;
}

// POST /api/usage/reset
// Admin endpoint to reset usage (for testing)
```

#### **Billing Dashboard**
```typescript
// GET /api/billing/dashboard
// User billing information and history
interface BillingDashboard {
  subscription: {
    tier: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
  paymentMethod: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  };
  invoices: Array<{
    id: string;
    amount: number;
    status: string;
    date: string;
    downloadUrl: string;
  }>;
}
```

### **Frontend Components to Create**

#### **Subscription Components**
```typescript
// components/billing/SubscriptionStatus.tsx
// Display current subscription status and usage

// components/billing/UpgradeModal.tsx  
// Modal for upgrading subscription tiers

// components/billing/BillingDashboard.tsx
// Complete billing management interface

// components/billing/PaywallModal.tsx
// Block AI questions when limit reached

// components/ui/TierBadge.tsx
// Display user tier badges throughout UI
```

#### **Enhanced UI Components**
```typescript
// Modify existing components/auth/auth-button.tsx
// Add tier display and billing link

// Modify existing app/page.tsx
// Add tier-based UI changes and upgrade prompts

// components/questions/QuestionLimiter.tsx
// Show usage progress and upgrade prompts
```

### **Middleware and Authentication**

#### **Tier Checking Middleware**
```typescript
// lib/middleware/tierCheck.ts
// Check user tier and usage limits

export async function checkTierAccess(
  userId: string, 
  requiredTier: 'explorer' | 'builder' | 'expert'
): Promise<{
  hasAccess: boolean;
  currentTier: string;
  upgradeRequired: boolean;
}>;

export async function checkQuestionLimit(
  userId: string
): Promise<{
  canAsk: boolean;
  questionsUsed: number;
  questionsLimit: number;
  resetDate: string;
}>;
```

#### **Supabase Row Level Security Updates**
```sql
-- Update RLS policies for tier-based access
CREATE POLICY "Users can only modify their own subscription" 
ON user_subscriptions FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only view their own usage" 
ON user_usage_monthly FOR SELECT 
USING (auth.uid() = user_id);
```

### **Stripe Integration Specifics**

#### **Product Configuration**
```javascript
// Stripe product setup (run once in Stripe dashboard or via API)
const products = [
  {
    name: 'VibeCodingBasics Builder',
    description: 'Unlimited AI questions + advanced features',
    price: 1900, // $19.00 in cents
    interval: 'month',
    features: [
      'Unlimited AI questions',
      'Advanced search & filtering', 
      'Weekly curated insights',
      'Export & save features',
      'Priority community access'
    ]
  },
  {
    name: 'VibeCodingBasics Expert',
    description: 'Everything in Builder + expert features',
    price: 4900, // $49.00 in cents  
    interval: 'month',
    features: [
      'Everything in Builder',
      'Expert badge system',
      'Direct expert access',
      'Early feature access',
      'Revenue sharing (70/30)'
    ]
  }
];
```

#### **Webhook Event Handling**
```typescript
// Handle these Stripe webhook events:
const webhookEvents = [
  'customer.subscription.created',
  'customer.subscription.updated', 
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.trial_will_end'
];

// lib/stripe/webhookHandlers.ts
export async function handleSubscriptionCreated(subscription: Stripe.Subscription);
export async function handleSubscriptionUpdated(subscription: Stripe.Subscription);  
export async function handleSubscriptionDeleted(subscription: Stripe.Subscription);
export async function handlePaymentSucceeded(invoice: Stripe.Invoice);
export async function handlePaymentFailed(invoice: Stripe.Invoice);
```

## **Phase 2: Community Features Implementation**

### **API Endpoints for Community Features**

#### **Community Answers**
```typescript
// POST /api/questions/[id]/community-answers
// Submit community answer to a question
interface CreateCommunityAnswerRequest {
  content: string;
  questionId: string;
}

// GET /api/questions/[id]/community-answers
// Get community answers for a question
interface CommunityAnswersResponse {
  answers: Array<{
    id: string;
    content: string;
    author: {
      id: string;
      name: string;
      badges: string[];
    };
    votes: {
      upvotes: number;
      downvotes: number;
      netVotes: number;
      userVote?: 'up' | 'down';
    };
    isAccepted: boolean;
    createdAt: string;
  }>;
}

// PUT /api/community-answers/[id]
// Edit community answer (author only)

// DELETE /api/community-answers/[id] 
// Delete community answer (author or moderator only)
```

#### **Voting System**
```typescript
// POST /api/community-answers/[id]/vote
// Vote on community answer
interface VoteRequest {
  voteType: 'up' | 'down';
}

// DELETE /api/community-answers/[id]/vote
// Remove vote from community answer
```

#### **Comments System**
```typescript
// POST /api/questions/[id]/comments
// Add comment to AI answer or question

// POST /api/community-answers/[id]/comments  
// Add comment to community answer

// GET /api/questions/[id]/comments
// Get all comments for a question (AI answer + replies)

interface CommentRequest {
  content: string;
  parentCommentId?: string; // For threaded replies
}

interface CommentsResponse {
  comments: Array<{
    id: string;
    content: string;
    author: {
      id: string;
      name: string;
      badges: string[];
    };
    upvotes: number;
    replies: Comment[]; // Nested structure
    createdAt: string;
  }>;
}
```

#### **Badge System**
```typescript
// GET /api/users/[id]/badges
// Get user's badges and reputation

// POST /api/badges/check
// Check and award eligible badges (run after actions)

interface UserBadgesResponse {
  badges: Array<{
    type: string;
    category: 'expertise' | 'participation' | 'quality';
    earnedAt: string;
    metadata?: any;
  }>;
  reputation: number;
  nextBadges: Array<{
    type: string;
    requirement: string;
    progress: number;
    total: number;
  }>;
}
```

### **Real-time Features**

#### **WebSocket/Server-Sent Events**
```typescript
// lib/realtime/subscriptions.ts
// Real-time updates for:
// - New community answers
// - Vote count changes  
// - New comments
// - Badge awards

export class RealtimeSubscription {
  subscribeToQuestion(questionId: string): EventSource;
  subscribeToUserNotifications(userId: string): EventSource;
  subscribeToAnswerUpdates(answerId: string): EventSource;
}
```

## **Phase 3: Advanced Search and Analytics**

### **Search Enhancement APIs**

#### **Semantic Search**
```typescript
// POST /api/search/semantic
// AI-powered semantic search across content
interface SemanticSearchRequest {
  query: string;
  filters: {
    dateRange?: { start: string; end: string; };
    categories?: string[];
    aiModel?: string[];
    userTier?: string[];
    hasAnswerType?: 'ai' | 'community' | 'both';
  };
  limit?: number;
  offset?: number;
}

// GET /api/search/suggestions
// Auto-complete and search suggestions
interface SearchSuggestionsResponse {
  suggestions: Array<{
    text: string;
    type: 'question' | 'tag' | 'category';
    frequency: number;
  }>;
}
```

#### **Analytics Dashboard**
```typescript
// GET /api/analytics/trending
// Trending topics and patterns
interface TrendingAnalytics {
  thisWeek: Array<{
    topic: string;
    questionCount: number;
    trend: 'rising' | 'falling' | 'stable';
  }>;
  categories: Array<{
    name: string;
    questionCount: number;
    weekOverWeek: number;
  }>;
  popularTags: Array<{
    tag: string;
    count: number;
    growth: number;
  }>;
}

// GET /api/analytics/personal
// Personal usage analytics (premium feature)
interface PersonalAnalytics {
  questionsAsked: {
    total: number;
    thisMonth: number;
    byCategory: Record<string, number>;
  };
  bookmarks: {
    total: number;
    byFolder: Record<string, number>;
  };
  communityActivity: {
    answersSubmitted: number;
    votesReceived: number;
    reputation: number;
  };
}
```

### **Export and Personal Features**

#### **Export System**
```typescript
// POST /api/export/bookmarks
// Export user's bookmarks in various formats
interface ExportRequest {
  format: 'pdf' | 'markdown' | 'json';
  includeNotes: boolean;
  folders?: string[];
}

// GET /api/export/[exportId]/download
// Download generated export file

// POST /api/bookmarks
// Create/update bookmark with personal notes
interface BookmarkRequest {
  questionId: string;
  folderName?: string;
  personalNotes?: string;
  tags?: string[];
}
```

## **Phase 4: AI-Powered Curation**

### **Content Curation APIs**

#### **Automated Insights**
```typescript
// GET /api/insights/weekly
// AI-generated weekly insights
interface WeeklyInsights {
  topProblems: Array<{
    problem: string;
    questionCount: number;
    sampleQuestions: string[];
    aiSummary: string;
  }>;
  toolUpdates: Array<{
    tool: string;
    update: string;
    impact: string;
    relatedQuestions: number;
  }>;
  communityHighlights: Array<{
    type: 'answer' | 'discussion' | 'expert';
    title: string;
    summary: string;
    link: string;
  }>;
}

// POST /api/insights/generate
// Trigger insight generation (admin/cron)
```

#### **Email Digest System**
```typescript
// POST /api/email/digest/subscribe
// Subscribe to email digests
interface DigestSubscription {
  frequency: 'weekly' | 'monthly';
  categories: string[];
  personalizedInsights: boolean;
}

// POST /api/email/digest/send
// Send digest emails (admin/cron)
```

## **Phase 5: Expert Features**

### **Expert Program APIs**

#### **Expert Application**
```typescript
// POST /api/experts/apply
// Apply for expert status
interface ExpertApplication {
  expertiseAreas: string[];
  portfolio: string;
  githubProfile?: string;
  expertiseStatement: string;
  sampleAnswers: string[]; // Links to community answers
}

// GET /api/experts/applications
// List pending applications (admin)

// POST /api/experts/applications/[id]/review
// Review expert application (admin)
interface ApplicationReview {
  approved: boolean;
  feedback: string;
  badgesToAward: string[];
}
```

#### **Consultation System**
```typescript
// POST /api/consultations/book
// Book expert consultation
interface BookConsultationRequest {
  expertId: string;
  topic: string;
  description: string;
  preferredTimes: string[];
  duration: 30 | 60 | 90; // minutes
}

// GET /api/consultations/my-bookings
// Get user's consultation bookings

// POST /api/consultations/[id]/confirm
// Expert confirms consultation booking

// POST /api/consultations/[id]/complete
// Mark consultation as completed with notes
```

## **Infrastructure and Deployment Requirements**

### **Environment Variables**
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Enhanced Supabase Config  
SUPABASE_SERVICE_ROLE_KEY=... # For admin operations
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Email Service (SendGrid/Resend)
EMAIL_API_KEY=...
EMAIL_FROM_ADDRESS=noreply@vibecodingbasics.com

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-... # For embeddings/search

# App Configuration  
NEXT_PUBLIC_APP_URL=https://vibecodingbasics.com
WEBHOOK_URL=https://vibecodingbasics.com/api/subscriptions/webhook
```

### **Deployment Considerations**

#### **Vercel Configuration**
```json
// vercel.json
{
  "functions": {
    "app/api/subscriptions/webhook.ts": {
      "maxDuration": 30
    },
    "app/api/insights/generate.ts": {
      "maxDuration": 300
    }
  },
  "crons": [
    {
      "path": "/api/cron/reset-usage",
      "schedule": "0 0 1 * *"
    },
    {
      "path": "/api/cron/generate-insights", 
      "schedule": "0 9 * * 1"
    }
  ]
}
```

#### **Database Connection Pooling**
```typescript
// lib/db.ts enhancement
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

### **Monitoring and Analytics**

#### **Error Tracking**
```typescript
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

#### **Performance Monitoring**
```typescript
// lib/monitoring/analytics.ts  
import { Analytics } from '@vercel/analytics/react';

// Track key business metrics:
// - Question creation rate
// - Subscription conversions  
// - Community answer submissions
// - User engagement patterns
```

## **Testing Requirements**

### **Unit Tests**
```typescript
// __tests__/api/subscriptions.test.ts
// Test subscription creation, updates, cancellation

// __tests__/lib/tierCheck.test.ts  
// Test tier checking and usage limit logic

// __tests__/components/billing.test.ts
// Test billing UI components
```

### **Integration Tests**
```typescript
// __tests__/integration/stripe.test.ts
// Test full Stripe webhook flow

// __tests__/integration/community.test.ts
// Test community answer and voting flow

// __tests__/integration/search.test.ts
// Test search functionality
```

### **End-to-End Tests**
```typescript
// e2e/subscription-flow.spec.ts
// Test complete subscription signup process

// e2e/community-interaction.spec.ts  
// Test community answer submission and voting

// e2e/expert-consultation.spec.ts
// Test expert consultation booking flow
```

## **Security Considerations**

### **Data Protection**
- **Input sanitization** for all user-generated content
- **Rate limiting** on API endpoints
- **CSRF protection** for forms
- **SQL injection prevention** with parameterized queries

### **Payment Security**
- **PCI compliance** through Stripe
- **Webhook signature verification**
- **Secure token handling**
- **Fraud detection** integration

### **User Privacy**
- **GDPR compliance** for EU users
- **Data retention policies**
- **User data export/deletion** capabilities
- **Privacy-focused analytics**

## **Performance Optimization**

### **Caching Strategy**
```typescript
// lib/cache/redis.ts
// Cache frequently accessed data:
// - User tier information
// - Question/answer content  
// - Badge calculations
// - Search results
```

### **Database Optimization**
- **Connection pooling** for concurrent requests
- **Read replicas** for analytics queries
- **Query optimization** with proper indexing
- **Database monitoring** and alerting

### **Frontend Optimization**
- **Code splitting** for better loading times
- **Image optimization** with Next.js Image
- **Static generation** for public pages
- **CDN configuration** for global performance