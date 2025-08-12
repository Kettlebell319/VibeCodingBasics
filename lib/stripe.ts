import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// Tier configuration matching your database schema
export const TIER_CONFIG = {
  explorer: {
    name: 'Explorer',
    price: 9.99,
    monthlyLimit: 50,
    features: [
      'Up to 50 questions per month',
      'Access to basic AI coding help',
      'Community support',
      'Email support'
    ],
    stripePriceId: process.env.STRIPE_EXPLORER_PRICE_ID
  },
  builder: {
    name: 'Builder',
    price: 19.99,
    monthlyLimit: 200,
    features: [
      'Up to 200 questions per month',
      'Advanced AI coding assistance',
      'Priority support',
      'Search history access',
      'Code review requests'
    ],
    stripePriceId: process.env.STRIPE_BUILDER_PRICE_ID
  },
  expert: {
    name: 'Expert',
    price: 49.99,
    monthlyLimit: 1000,
    features: [
      'Up to 1000 questions per month',
      'Expert-level AI assistance',
      'VIP support',
      'Advanced search features',
      'Custom integrations',
      'Team collaboration'
    ],
    stripePriceId: process.env.STRIPE_EXPERT_PRICE_ID
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