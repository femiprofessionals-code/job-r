import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { notifications } from '@/db/schema/notifications';
import { requireUser } from '@/lib/supabase/server';
import { apiFail, apiOk } from '@/lib/api';

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    return apiOk({ notifications: rows });
  } catch {
    return apiFail('Unauthorized', 401);
  }
}
