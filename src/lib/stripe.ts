import Stripe from 'stripe';

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY missing');
  cached = new Stripe(key, { apiVersion: '2024-09-30.acacia' });
  return cached;
}

export const PLAN_PRICE_IDS = {
  pro: () => process.env.STRIPE_PRO_PRICE_ID ?? '',
  premium: () => process.env.STRIPE_PREMIUM_PRICE_ID ?? '',
};

export type Plan = 'free' | 'pro' | 'premium';
