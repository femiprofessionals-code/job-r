import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { db } from '@/db/client';
import { reviewers, subscriptions } from '@/db/schema/users';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function planFromPrice(priceId: string | null | undefined): 'free' | 'pro' | 'premium' {
  if (!priceId) return 'free';
  if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) return 'premium';
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
  return 'free';
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get('stripe-signature');
  if (!secret || !sig) return NextResponse.json({ error: 'missing signature' }, { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id ?? null;
      const plan = planFromPrice(priceId);
      const currentPeriodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null;
      await db
        .update(subscriptions)
        .set({
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          plan,
          status: sub.status as never,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodEnd,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeCustomerId, sub.customer as string));
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await db
        .update(subscriptions)
        .set({ plan: 'free', status: 'canceled', updatedAt: new Date() })
        .where(eq(subscriptions.stripeCustomerId, sub.customer as string));
      break;
    }
    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      const payoutsEnabled = Boolean(account.payouts_enabled && account.charges_enabled);
      await db
        .update(reviewers)
        .set({ payoutsEnabled, updatedAt: new Date() })
        .where(eq(reviewers.stripeAccountId, account.id));
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
