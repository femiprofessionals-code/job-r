import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PROTECTED_PREFIXES = ['/dashboard', '/jobs', '/tracks', '/drafts', '/reviewer', '/admin'];
const ADMIN_PREFIXES = ['/admin'];
const REVIEWER_PREFIXES = ['/reviewer'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set({ name, value, ...options });
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const redirect = new URL('/login', request.url);
    redirect.searchParams.set('next', path);
    return NextResponse.redirect(redirect);
  }

  if (user && (ADMIN_PREFIXES.some((p) => path.startsWith(p)) || REVIEWER_PREFIXES.some((p) => path.startsWith(p)))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role;
    if (ADMIN_PREFIXES.some((p) => path.startsWith(p)) && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (
      REVIEWER_PREFIXES.some((p) => path.startsWith(p)) &&
      role !== 'reviewer' &&
      role !== 'admin'
    ) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/inngest|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
