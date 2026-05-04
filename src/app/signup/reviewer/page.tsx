'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function ReviewerSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, signup_intent: 'reviewer' },
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent('/reviewer/apply')}`,
      },
    });
    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }

    // After auth signup, ensure session, then create the reviewer application.
    const { data: sess } = await supabase.auth.getSession();
    if (sess?.session) {
      const apply = await fetch('/api/reviewer/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ specialty, bio }),
      });
      if (!apply.ok) {
        const j = await apply.json().catch(() => ({}));
        setError(j?.error ?? 'Could not save application');
        setSubmitting(false);
        return;
      }
    }

    router.push('/reviewer/apply?flash=Application+submitted');
  }

  return (
    <div className="mx-auto max-w-xl py-16">
      <Card>
        <CardHeader>
          <CardTitle>Apply to review on Job Radar</CardTitle>
          <p className="text-sm text-muted-foreground">
            Reviewers refine AI-drafted resumes and cover letters and earn per-review payouts.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={submit}>
            <div>
              <label className="text-xs text-muted-foreground">Full name</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Password (min 8)</label>
              <Input
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Specialty</label>
              <Input
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. senior product roles"
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Short bio (≥ 10 chars)</label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Create reviewer account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Looking for jobs instead?{' '}
            <Link href="/signup" className="underline">
              Job seeker signup
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
