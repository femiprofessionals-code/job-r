import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv } from '@/lib/env';
import { db } from '@/db/client';
import { profiles } from '@/db/schema/users';

export async function createSupabaseServerClient() {
  // Next 14's `cookies()` is synchronous; `await` is a no-op and keeps forward
  // compatibility with Next 15+ where the helper becomes async.
  const cookieStore = await Promise.resolve(cookies());
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as CookieOptions);
          }
        } catch {
          // Called from a Server Component — cookies can't be mutated here.
        }
      },
    },
  });
}

/**
 * Returns the authenticated Supabase user and guarantees a matching
 * `profiles` row exists. Safe for routes that write rows with a FK to
 * profiles.id (e.g. career_tracks, drafts, matches, subscriptions).
 */
export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('UNAUTHENTICATED');

  await db
    .insert(profiles)
    .values({
      id: user.id,
      email: user.email ?? '',
      fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
      avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    })
    .onConflictDoNothing({ target: profiles.id });

  return user;
}

export async function getOptionalUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
