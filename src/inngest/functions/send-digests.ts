import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '@/db/client';
import { matches } from '@/db/schema/matches';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { profiles } from '@/db/schema/users';
import { sendDigest } from '@/services/notifications';
import { inngest } from '../client';

export const sendDigestsFn = inngest.createFunction(
  { id: 'send-digests', name: 'Daily digest email', concurrency: { limit: 4 } },
  [{ cron: '0 13 * * *' }, { event: 'digests/send.requested' }],
  async ({ step }) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const users = await step.run('load-users', async () =>
      db
        .selectDistinct({ id: profiles.id, email: profiles.email, name: profiles.fullName })
        .from(profiles)
        .innerJoin(matches, eq(matches.userId, profiles.id))
        .where(and(eq(matches.hidden, false), gte(matches.createdAt, since))),
    );

    let sent = 0;
    for (const u of users) {
      const rows = await db
        .select({
          score: matches.overallScore,
          jobTitle: jobs.title,
          jobId: jobs.id,
          company: companies.name,
        })
        .from(matches)
        .innerJoin(jobs, eq(jobs.id, matches.jobId))
        .innerJoin(companies, eq(companies.id, jobs.companyId))
        .where(and(eq(matches.userId, u.id), gte(matches.createdAt, since), eq(matches.hidden, false)))
        .orderBy(desc(matches.overallScore))
        .limit(8);
      if (rows.length === 0) continue;
      await sendDigest(
        u.id,
        u.email,
        u.name ?? 'there',
        rows.map((r) => ({
          jobTitle: r.jobTitle,
          company: r.company,
          score: r.score,
          url: `${appUrl}/jobs/${r.jobId}`,
        })),
        appUrl,
      );
      sent++;
    }

    return { sent };
  },
);
