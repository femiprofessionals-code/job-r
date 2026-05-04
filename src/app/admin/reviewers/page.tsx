import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { profiles, reviewers } from '@/db/schema/users';
import { requireUser } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReviewerActions } from './row-actions';

export const dynamic = 'force-dynamic';

export default async function AdminReviewersPage() {
  const user = await requireUser();
  const [me] = await db.select().from(profiles).where(eq(profiles.id, user.id));
  if (me?.role !== 'admin') {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="text-2xl font-semibold">Admins only</h1>
      </div>
    );
  }

  const rows = await db
    .select({
      id: reviewers.id,
      userId: reviewers.userId,
      tier: reviewers.tier,
      specialty: reviewers.specialty,
      bio: reviewers.bio,
      isActive: reviewers.isActive,
      payoutsEnabled: reviewers.payoutsEnabled,
      completedReviews: reviewers.completedReviews,
      createdAt: reviewers.createdAt,
      email: profiles.email,
      name: profiles.fullName,
    })
    .from(reviewers)
    .innerJoin(profiles, eq(profiles.id, reviewers.userId))
    .orderBy(desc(reviewers.createdAt));

  const pending = rows.filter((r) => !r.isActive);
  const active = rows.filter((r) => r.isActive);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Reviewers</h1>
        <p className="text-sm text-muted-foreground">Approve applications and manage tiers.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Pending ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-muted-foreground">No pending applications.</p>}
        {pending.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle className="text-base">{r.name ?? r.email}</CardTitle>
              <p className="text-xs text-muted-foreground">{r.email}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><span className="font-medium">Specialty:</span> {r.specialty ?? '—'}</p>
              <p className="whitespace-pre-wrap"><span className="font-medium">Bio:</span> {r.bio ?? '—'}</p>
              <ReviewerActions reviewerId={r.id} currentTier={r.tier} isActive={r.isActive} />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Active ({active.length})</h2>
        {active.length === 0 && <p className="text-sm text-muted-foreground">No active reviewers yet.</p>}
        {active.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <div className="font-medium">{r.name ?? r.email}</div>
                <div className="text-xs text-muted-foreground">
                  {r.email} · {r.completedReviews} completed
                  {r.payoutsEnabled ? ' · payouts enabled' : ' · payouts pending'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{r.tier}</Badge>
                <ReviewerActions reviewerId={r.id} currentTier={r.tier} isActive={r.isActive} />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
