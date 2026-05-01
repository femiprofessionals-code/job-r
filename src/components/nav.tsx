import Link from 'next/link';
import { getOptionalUser } from '@/lib/supabase/server';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/matches', label: 'Matches' },
  { href: '/tracks', label: 'Career tracks' },
  { href: '/drafts', label: 'Drafts' },
];
export async function Nav() {
  const user = await getOptionalUser();
  return (
    <header className="border-b bg-card">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Job Radar
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {user ? (
            <>
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">
                  {l.label}
                </Link>
              ))}
              <form action="/api/auth/signout" method="post">
                <button className="text-muted-foreground hover:text-foreground">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                Log in
              </Link>
              <Link href="/signup" className="font-medium">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
