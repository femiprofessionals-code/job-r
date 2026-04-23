import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { careerTracks } from '@/db/schema/careerTracks';
import { requireUser } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function TracksPage() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(careerTracks)
    .where(eq(careerTracks.userId, user.id))
    .orderBy(desc(careerTracks.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Career tracks</h1>
          <p className="text-sm text-muted-foreground">
            Each track describes one kind of role you&apos;re pursuing.
          </p>
        </div>
        <Button asChild>
          <Link href="/tracks/new">New track</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No tracks yet. Create your first to start matching.</p>
        )}
        {rows.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle>{t.name}</CardTitle>
              <div className="flex flex-wrap gap-2 pt-2 text-xs">
                <Badge variant="secondary">{t.targetFunction}</Badge>
                <Badge variant="secondary">{t.targetSeniority}</Badge>
                {t.targetLocationType && <Badge variant="outline">{t.targetLocationType}</Badge>}
                <Badge variant="outline">min score {t.minMatchScore}%</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>Must-have skills: {t.mustHaveSkills.join(', ') || '—'}</div>
              <div>Cities: {t.preferredCities.join(', ') || 'Any'}</div>
              <div>
                Status: {t.isActive ? <span className="text-foreground">Active</span> : 'Paused'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
