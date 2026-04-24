export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { companies } from '@/db/schema/companies';
import { profiles } from '@/db/schema/users';
import { requireUser } from '@/lib/supabase/server';
import { apiFail } from '@/lib/api';
import { inngest } from '@/inngest/client';

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return apiFail('Unauthorized', 401);
  }
  const [me] = await db.select().from(profiles).where(eq(profiles.id, user.id));
  if (me?.role !== 'admin') return apiFail('Forbidden', 403);

  const form = await req.formData();
  const id = String(form.get('id') ?? '');
  const status = String(form.get('status') ?? '');
  if (!id || (status !== 'approved' && status !== 'rejected')) return apiFail('Bad request', 400);

  await db
    .update(companies)
    .set({ status: status as 'approved' | 'rejected', updatedAt: new Date() })
    .where(eq(companies.id, id));

  if (status === 'approved') {
    await inngest.send({ name: 'scrape/company.requested', data: { companyId: id } });
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return NextResponse.redirect(new URL('/admin', appUrl));
}