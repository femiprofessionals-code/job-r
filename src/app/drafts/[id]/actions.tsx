'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function DraftActions({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: 'approve' | 'reject') {
    setPending(action);
    setError(null);
    const res = await fetch(`/api/drafts/${draftId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(action === 'approve' ? { approve: true } : { reject: true }),
    });
    setPending(null);
    if (!res.ok) {
      setError('Failed');
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 pt-2">
      <Button onClick={() => run('approve')} disabled={pending !== null}>
        {pending === 'approve' ? 'Approving…' : 'Approve'}
      </Button>
      <Button onClick={() => run('reject')} variant="outline" disabled={pending !== null}>
        {pending === 'reject' ? 'Submitting…' : 'Request revision'}
      </Button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}

export function DraftGenerateFromMatch({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ matchId }),
    });
    setLoading(false);
    if (!res.ok) {
      setError('Failed');
      return;
    }
    router.push('/drafts');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={run} disabled={loading}>
        {loading ? 'Queuing…' : 'Generate tailored draft'}
      </Button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
