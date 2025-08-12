import { Suspense } from 'react';
import { createClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Crown } from 'lucide-react';
import { TIER_CONFIG } from '@/lib/stripe';
import Link from 'next/link';
import CheckoutButton from '@/components/checkout-button';

interface User {
  id: string;
  email: string;
  tier: string;
  subscription_status: string | null;
}

async function getUser(): Promise<User | null> {
  const supabase = createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  const { data: profile } = await supabase
    .from('users')
    .select('id, email, tier, subscription_status')
    .eq('id', user.id)
    .single();
  
  return profile;
}

function PricingCard({ 
  tier, 
  config, 
  currentTier, 
  userId 
}: { 
  tier: string;
  config: typeof TIER_CONFIG.explorer;
  currentTier: string;
  userId: string;
}) {
  const isCurrentTier = tier === currentTier;
  const isPopular = tier === 'builder';
  
  const Icon = tier === 'explorer' ? Star : tier === 'builder' ? Zap : Crown;
  
  return (
    <Card className={`relative ${isPopular ? 'border-blue-500 shadow-lg' : ''}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-500 text-white">Most Popular</Badge>
        </div>
      )}
      
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-2xl">{config.name}</CardTitle>
        <CardDescription>
          <span className="text-3xl font-bold">${config.price}</span>
          <span className="text-muted-foreground">/month</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <ul className="space-y-3 mb-6">
          {config.features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        
        <CheckoutButton
          tier={tier}
          userId={userId}
          isCurrentTier={isCurrentTier}
          isPopular={isPopular}
          currentTier={currentTier}
        />
      </CardContent>
    </Card>
  );
}

export default async function SubscriptionPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Coding Journey
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock the full potential of AI-powered coding assistance with our flexible plans
          </p>
          
          {user.tier !== 'free' && (
            <div className="mt-6">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Current Plan: {TIER_CONFIG[user.tier as keyof typeof TIER_CONFIG]?.name || user.tier}
              </Badge>
              {user.subscription_status && (
                <Badge 
                  variant={user.subscription_status === 'active' ? 'default' : 'destructive'}
                  className="ml-2"
                >
                  {user.subscription_status}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {Object.entries(TIER_CONFIG).map(([tier, config]) => (
            <PricingCard
              key={tier}
              tier={tier}
              config={config}
              currentTier={user.tier}
              userId={user.id}
            />
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Need help choosing? <Link href="/contact" className="text-blue-600 hover:underline">Contact us</Link>
          </p>
          <p className="text-sm text-gray-500">
            All plans include a 7-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}