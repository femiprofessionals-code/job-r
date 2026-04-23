'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function MatchRowActions({ matchId, saved }: { matchId: string; saved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [isSaved, setSaved] = useState(saved);

  async function generate() {
    setBusy('draft');
    const res = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ matchId }),
    });
    setBusy(null);
    if (res.ok) {
      router.push('/drafts');
      router.refresh();
    }
  }

  async function toggleSaved() {
    setBusy('save');
    const res = await fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ saved: !isSaved }),
    });
    setBusy(null);
    if (res.ok) setSaved(!isSaved);
  }

  async function hide() {
    setBusy('hide');
    await fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hidden: true }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={generate} disabled={busy !== null}>
        {busy === 'draft' ? 'Queuing…' : 'Draft'}
      </Button>
      <Button size="sm" variant="outline" onClick={toggleSaved} disabled={busy !== null}>
        {isSaved ? 'Saved' : 'Save'}
      </Button>
      <Button size="sm" variant="ghost" onClick={hide} disabled={busy !== null}>
        Hide
      </Button>
    </div>
  );
}
