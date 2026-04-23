import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db/client';
import { profiles } from '@/db/schema/users';
import { inngest } from '@/inngest/client';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';
  if (!code) return NextResponse.redirect(new URL('/login', url));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL('/login?error=exchange', url));

  const user = data.user;
  const [existing] = await db.select().from(profiles).where(eq(profiles.id, user.id));
  if (!existing) {
    await db.insert(profiles).values({
      id: user.id,
      email: user.email ?? '',
      fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
      avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    });
    await inngest.send({
      name: 'users/signed_up',
      data: { userId: user.id, email: user.email ?? '', name: user.user_metadata?.full_name },
    });
  }

  return NextResponse.redirect(new URL(next, url));
}
