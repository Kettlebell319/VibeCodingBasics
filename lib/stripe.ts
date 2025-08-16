import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// Simplified two-tier configuration
export const TIER_CONFIG = {
  free: {
    name: 'Free',
    price: 0,
    monthlyLimit: 30,
    features: [
      'Browse unlimited Q&A solutions',
      'Search existing knowledge base',
      'Comment on all answers',
      'Ask up to 30 questions per month'
    ],
    stripePriceId: null
  },
  pro: {
    name: 'Pro',
    price: 8.00,
    monthlyLimit: 300,
    features: [
      'Everything in Free tier',
      'Ask up to 300 questions per month',
      'Priority support',
      'Early access to new features'
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID
  }
};

export type TierType = keyof typeof TIER_CONFIG;

// Helper to get tier config
export function getTierConfig(tier: string): typeof TIER_CONFIG.explorer {
  if (tier in TIER_CONFIG) {
    return TIER_CONFIG[tier as TierType];
  }
  throw new Error(`Invalid tier: ${tier}`);
}

export default stripe;