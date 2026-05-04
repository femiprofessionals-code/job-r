'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;
type Tier = (typeof TIERS)[number];

export function ReviewerActions({
  reviewerId,
  currentTier,
  isActive,
}: {
  reviewerId: string;
  currentTier: Tier;
  isActive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [tier, setTier] = useState<Tier>(currentTier);

  async function patch(body: object) {
    setBusy(true);
    const res = await fetch(`/api/admin/reviewers/${reviewerId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={tier}
        onChange={(e) => {
          const next = e.target.value as Tier;
          setTier(next);
          patch({ tier: next });
        }}
        className="h-9 rounded-md border bg-background px-2 text-sm"
        disabled={busy}
      >
        {TIERS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      {!isActive ? (
        <>
          <Button size="sm" disabled={busy} onClick={() => patch({ isActive: true })}>
            Approve
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => patch({ remove: true })}>
            Reject
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => patch({ isActive: false })}>
          Deactivate
        </Button>
      )}
    </div>
  );
}
