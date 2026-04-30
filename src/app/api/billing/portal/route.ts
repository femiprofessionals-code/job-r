export const dynamic = 'force-dynamic';

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema/users';
import { requireUser } from '@/lib/supabase/server';
import { apiFail, apiOk } from '@/lib/api';
import { stripe } from '@/lib/stripe';

export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id));
  if (!sub?.stripeCustomerId) return apiFail('No customer', 404);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const portal = await stripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${appUrl}/dashboard`,
  });
  return apiOk({ url: portal.url });
}