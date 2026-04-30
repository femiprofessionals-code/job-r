'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ConnectStripeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/billing/connect', { method: 'POST' });
    setLoading(false);
    if (!res.ok) {
      setError('Failed to start onboarding');
      return;
    }
    const body = (await res.json()) as { data?: { url?: string } };
    if (body.data?.url) window.location.href = body.data.url;
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={start} disabled={loading}>
        {loading ? 'Starting…' : 'Set up Stripe payouts'}
      </Button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
