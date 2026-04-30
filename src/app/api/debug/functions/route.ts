export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { functions } from '@/inngest/functions';

// Diagnostic-only: lists registered Inngest function IDs so we can verify
// what's actually in the deployed bundle without needing Inngest's signing
// key. Safe to expose since IDs are not secrets.
export async function GET() {
  const ids = functions.map((f) => {
    try {
      const fn = f as unknown as { id?: () => string; opts?: { id?: string } };
      if (typeof fn.id === 'function') return fn.id();
      if (fn.opts?.id) return fn.opts.id;
      return 'unknown';
    } catch (err) {
      return `error: ${(err as Error).message}`;
    }
  });
  return NextResponse.json({
    count: functions.length,
    functions: ids,
    deployedAt: new Date().toISOString(),
  });
}
