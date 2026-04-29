'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const FADE_MS = 4000;

export function FlashToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const message = params.get('flash');
  const tone = (params.get('tone') ?? 'success') as 'success' | 'error' | 'info';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), FADE_MS);
    const cleanupT = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      next.delete('flash');
      next.delete('tone');
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    }, FADE_MS + 400);
    return () => {
      clearTimeout(t);
      clearTimeout(cleanupT);
    };
  }, [message, params, pathname, router]);

  if (!message) return null;

  const palette =
    tone === 'error'
      ? 'bg-destructive text-destructive-foreground'
      : tone === 'info'
        ? 'bg-secondary text-secondary-foreground'
        : 'bg-emerald-600 text-white';

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2 transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
      )}
    >
      <div className={cn('rounded-md px-4 py-2 text-sm font-medium shadow-lg', palette)}>
        {message}
      </div>
    </div>
  );
}
