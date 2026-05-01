import Link from 'next/link';
import { getOptionalUser } from '@/lib/supabase/server';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/matches', label: 'Matches' },
  { href: '/tracks', label: 'Career tracks' },
  { href: '/profile/resume', label: 'Resume' },
  { href: '/drafts', label: 'Drafts' },
];

export async function Nav() {
  const user = await getOptionalUser();
  return (
    <header className="border-b bg-card">
      <div className="container flex flex-col gap-2 py-3 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-0">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Job Radar
        </Link>
        {user ? (
          <nav className="-mx-1 flex items-center gap-4 overflow-x-auto whitespace-nowrap px-1 text-sm sm:gap-6 sm:overflow-visible">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <form action="/api/auth/signout" method="post">
              <button className="text-muted-foreground hover:text-foreground">Sign out</button>
            </form>
          </nav>
        ) : (
          <nav className="flex items-center gap-4 text-sm sm:gap-6">
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="font-medium">
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
