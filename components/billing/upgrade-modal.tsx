// components/billing/upgrade-modal.tsx
'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

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
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Please sign in to upgrade your plan.');
        return;
      }

      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ tier })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error upgrading:', error);
      alert('Failed to start upgrade process. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            You've used {currentUsage.questionsUsed} of {currentUsage.questionsLimit} free questions this month.
            Upgrade for unlimited AI-powered answers!
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Builder Plan */}
          <Card className="border-2 border-blue-200 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-blue-600 text-white">Most Popular</Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Builder
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

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>All plans include a 7-day free trial. Cancel anytime.</p>
          <p className="mt-1">Secure payment processing by Stripe.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}