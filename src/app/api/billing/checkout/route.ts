export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { profiles, subscriptions } from '@/db/schema/users';
import { requireUser } from '@/lib/supabase/server';
import { apiFail, apiOk, parseJson } from '@/lib/api';
import { PLAN_PRICE_IDS, stripe } from '@/lib/stripe';

const schema = z.object({ plan: z.enum(['pro', 'premium']) });

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const body = await parseJson(req, schema);
  if (body instanceof NextResponse) return body;

  const priceId = body.plan === 'pro' ? PLAN_PRICE_IDS.pro() : PLAN_PRICE_IDS.premium();
  if (!priceId) return apiFail('Price not configured', 500);

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id));
  if (!profile) return apiFail('Profile missing', 404);

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id));
  let customerId = sub?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: profile.email,
      name: profile.fullName ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    if (sub) {
      await db
        .update(subscriptions)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));
    } else {
      await db.insert(subscriptions).values({
        userId: user.id,
        stripeCustomerId: customerId,
        plan: 'free',
        status: 'active',
      });
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?billing=success`,
    cancel_url: `${appUrl}/dashboard?billing=cancel`,
    allow_promotion_codes: true,
    metadata: { userId: user.id, plan: body.plan },
  });

  return apiOk({ url: session.url });
}