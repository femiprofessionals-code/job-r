'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function JobFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = new URLSearchParams();
    for (const [k, v] of form.entries()) {
      const s = String(v).trim();
      if (s) next.set(k, s);
    }
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  function clearAll() {
    startTransition(() => router.push(pathname));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        name="q"
        placeholder="Search titles + descriptions"
        defaultValue={params.get('q') ?? ''}
        className="w-64"
      />
      <select
        name="function"
        defaultValue={params.get('function') ?? ''}
        onChange={(e) => setParam('function', e.target.value)}
        className="h-10 rounded-md border bg-background px-3 text-sm"
      >
        <option value="">All functions</option>
        {[
          'engineering',
          'product',
          'design',
          'data',
          'marketing',
          'sales',
          'operations',
          'finance',
          'legal',
          'people',
          'support',
        ].map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <select
        name="seniority"
        defaultValue={params.get('seniority') ?? ''}
        onChange={(e) => setParam('seniority', e.target.value)}
        className="h-10 rounded-md border bg-background px-3 text-sm"
      >
        <option value="">All seniority</option>
        {['junior', 'mid', 'senior', 'staff', 'principal', 'manager', 'director', 'vp'].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        name="locationType"
        defaultValue={params.get('locationType') ?? ''}
        onChange={(e) => setParam('locationType', e.target.value)}
        className="h-10 rounded-md border bg-background px-3 text-sm"
      >
        <option value="">All locations</option>
        <option value="remote">Remote</option>
        <option value="hybrid">Hybrid</option>
        <option value="onsite">Onsite</option>
      </select>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Filtering…' : 'Search'}
      </Button>
      {params.toString() && (
        <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
          Clear
        </Button>
      )}
    </form>
  );
}
