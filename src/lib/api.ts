import { NextResponse } from 'next/server';
import { z, type ZodError } from 'zod';

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: string; details?: unknown };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiResult<T>>({ ok: true, data }, init);
}

export function apiFail(error: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiResult<never>>({ ok: false, error, details }, { status });
}

export function zodError(err: ZodError) {
  return apiFail('Validation failed', 422, err.flatten());
}

export async function parseJson<T>(req: Request, schema: z.ZodSchema<T>): Promise<T | NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiFail('Invalid JSON body', 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  return parsed.data;
}

export function parseQuery<T>(url: URL, schema: z.ZodSchema<T>): T | NextResponse {
  const obj: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) obj[k] = v;
  const parsed = schema.safeParse(obj);
  if (!parsed.success) return zodError(parsed.error);
  return parsed.data;
}
