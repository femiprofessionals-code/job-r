export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const dest = new URL('/', req.url);
  dest.searchParams.set('flash', 'Signed out');
  dest.searchParams.set('tone', 'info');
  return NextResponse.redirect(dest);
}