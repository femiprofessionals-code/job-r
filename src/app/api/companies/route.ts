import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { companies } from '@/db/schema/companies';
import { apiOk } from '@/lib/api';

export async function GET() {
  const rows = await db
    .select()
    .from(companies)
    .where(eq(companies.status, 'approved'))
    .orderBy(desc(companies.createdAt));
  return apiOk({ companies: rows });
}
