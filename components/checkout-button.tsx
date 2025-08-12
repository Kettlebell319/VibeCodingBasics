'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CheckoutButtonProps {
  tier: string;
  userId: string;
  isCurrentTier: boolean;
  isPopular?: boolean;
  currentTier: string;
}

export default function CheckoutButton({ 
  tier, 
  userId, 
  isCurrentTier, 
  isPopular,
  currentTier 
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCheckout = async () => {
    if (isCurrentTier) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier, userId }),
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isCurrentTier) {
    return (
      <Button disabled className="w-full">
        Current Plan
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleCheckout}
      disabled={loading}
      className={`w-full ${isPopular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
    >
      {loading ? 'Processing...' : (currentTier === 'free' ? 'Get Started' : 'Upgrade')}
    </Button>
  );
}