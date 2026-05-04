'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type State = 'loading' | 'none' | 'pending' | 'active';

export default function ReviewerApplyPage() {
  const [state, setState] = useState<State>('loading');
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/reviewer/apply', { cache: 'no-store' });
      if (!res.ok) {
        setState('none');
        return;
      }
      const j = await res.json();
      const r = j?.data?.reviewer;
      if (!r) setState('none');
      else if (r.isActive) setState('active');
      else setState('pending');
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/reviewer/apply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ specialty, bio }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? 'Submit failed');
      return;
    }
    setState('pending');
  }

  if (state === 'loading') return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (state === 'active') {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>You&apos;re an active reviewer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Your reviewer profile is active. Open the queue to start picking up reviews.
          </p>
          <Button asChild>
            <a href="/reviewer">Open reviewer queue</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === 'pending') {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Application received</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Your reviewer application is pending admin approval. We&apos;ll email you when it&apos;s approved.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Apply to be a reviewer</h1>
        <p className="text-sm text-muted-foreground">
          Reviewers refine AI-generated drafts for premium candidates and earn per-review payouts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your background</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">
              Specialty (e.g. &quot;senior product roles&quot;, &quot;data engineering&quot;)
            </label>
            <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Short bio — what makes you good at reviewing resumes
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              required
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit application'}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  );
}
