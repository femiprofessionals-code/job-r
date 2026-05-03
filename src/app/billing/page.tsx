import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema/users';
import { requireUser } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UpgradeButton } from './upgrade-button';

export const dynamic = 'force-dynamic';

const PLANS = [
  {
    plan: 'free' as const,
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    perks: [
      'Hourly job scraping',
      'Up to 3 active career tracks',
      'Daily match digest',
      'Manually generate AI drafts',
    ],
  },
  {
    plan: 'pro' as const,
    name: 'Pro',
    price: '$19',
    cadence: '/ month',
    perks: [
      'Everything in Free',
      'Unlimited active tracks',
      'Priority scrape refresh',
      'Higher draft generation quota',
    ],
  },
  {
    plan: 'premium' as const,
    name: 'Premium',
    price: '$49',
    cadence: '/ month',
    perks: [
      'Everything in Pro',
      'Human reviewer feedback on every draft',
      '24h turnaround SLA',
      'Direct route to senior reviewers',
    ],
  },
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id));
  const currentPlan = (sub?.plan ?? 'free') as 'free' | 'pro' | 'premium';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Choose the plan that fits how aggressively you&apos;re hunting.
        </p>
      </div>

      {sp.billing === 'success' && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700">
          Payment successful — your plan will update within a minute.
        </div>
      )}
      {sp.billing === 'cancel' && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
          Checkout cancelled. You can try again anytime.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = p.plan === currentPlan;
          return (
            <Card key={p.plan} className={isCurrent ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{p.name}</CardTitle>
                  {isCurrent && <Badge>Current</Badge>}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.cadence}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex gap-2">
                      <span aria-hidden>•</span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                {p.plan !== 'free' && !isCurrent && <UpgradeButton plan={p.plan} />}
                {p.plan === 'free' && !isCurrent && (
                  <p className="text-xs text-muted-foreground">
                    Manage your subscription in Stripe to downgrade.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
