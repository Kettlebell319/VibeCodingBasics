// lib/stripe/config.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
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

export const TIER_LIMITS = {
  explorer: {
    monthlyQuestions: 5,
    features: ['Basic AI questions', 'Search functionality', 'Community access']
  },
  builder: {
    monthlyQuestions: -1, // unlimited
    features: [
      'Unlimited AI questions',
      'Advanced search & filtering',
      'Weekly curated insights',
      'Export & save features',
      'Priority community access'
    ]
  },
  expert: {
    monthlyQuestions: -1, // unlimited
    features: [
      'Everything in Builder',
      'Expert badge system',
      'Direct expert access',
      'Early feature access',
      'Revenue sharing (70/30)'
    ]
  }
};