'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function UpgradeButton({ plan }: { plan: 'pro' | 'premium' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const j = await res.json().catch(() => ({}));
    const url = j?.data?.url ?? j?.url;
    if (!res.ok || !url) {
      setError(j?.error ?? 'Could not start checkout');
      setLoading(false);
      return;
    }
    window.location.href = url;
  }

  return (
    <div className="space-y-2">
      <Button onClick={go} disabled={loading} className="w-full">
        {loading ? 'Redirecting…' : `Upgrade to ${plan === 'pro' ? 'Pro' : 'Premium'}`}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
