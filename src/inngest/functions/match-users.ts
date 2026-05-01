import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { careerTracks } from '@/db/schema/careerTracks';
import { profiles } from '@/db/schema/users';
import { jobs } from '@/db/schema/jobs';
import { companies } from '@/db/schema/companies';
import { matches } from '@/db/schema/matches';
import { scoreMatch } from '@/services/matcher';
import { inngest } from '../client';

export const matchUsersFn = inngest.createFunction(
  { id: 'match-users', name: 'Match classified jobs against active career tracks', retries: 2 },
  { event: 'jobs/classified' },
  async ({ event, step }) => {
    const jobIds = event?.data?.jobIds;
    if (!jobIds || jobIds.length === 0) return { created: 0 };

    const jobRows = await step.run('load-jobs', async () =>
      db
        .select({
          id: jobs.id,
          function: jobs.function,
          seniority: jobs.seniority,
          skills: jobs.skills,
          locationType: jobs.locationType,
          locationCity: jobs.locationCity,
          locationCountry: jobs.locationCountry,
          companyId: jobs.companyId,
          companyName: companies.name,
        })
        .from(jobs)
        .innerJoin(companies, eq(companies.id, jobs.companyId))
        .where(and(inArray(jobs.id, jobIds), eq(jobs.status, 'open'))),
    );

    const tracks = await step.run('load-tracks', async () =>
      db
        .select({
          track: careerTracks,
          profile: profiles,
        })
        .from(careerTracks)
        .innerJoin(profiles, eq(profiles.id, careerTracks.userId))
        .where(eq(careerTracks.isActive, true)),
    );

    const perUser: Record<string, string[]> = {};
    let created = 0;

    for (const job of jobRows) {
      for (const { track, profile } of tracks) {
        const score = scoreMatch({
          track: {
            targetFunction: track.targetFunction,
            targetSeniority: track.targetSeniority,
            targetLocationType: track.targetLocationType,
            preferredCities: track.preferredCities,
            preferredCountries: track.preferredCountries,
            mustHaveSkills: track.mustHaveSkills,
            niceToHaveSkills: track.niceToHaveSkills,
            excludedCompanies: track.excludedCompanies,
            targetCompanies: track.targetCompanies,
          },
          profile: {
            yearsExperience: profile.yearsExperience,
            skills: profile.skills,
          },
          job: {
            function: job.function,
            seniority: job.seniority,
            skills: job.skills,
            locationType: job.locationType,
            locationCity: job.locationCity,
            locationCountry: job.locationCountry,
            companyName: job.companyName,
          },
        });

        if (score.overallScore < track.minMatchScore) continue;

        const [row] = await db
          .insert(matches)
          .values({
            userId: track.userId,
            careerTrackId: track.id,
            jobId: job.id,
            overallScore: score.overallScore,
            breakdown: score.breakdown,
          })
          .onConflictDoNothing({
            target: [matches.userId, matches.jobId, matches.careerTrackId],
          })
          .returning({ id: matches.id });

        if (row) {
          perUser[track.userId] ??= [];
          perUser[track.userId].push(row.id);
          created++;
        }
      }
    }

    const events = Object.entries(perUser).map(([userId, matchIds]) => ({
      name: 'matches/ready' as const,
      data: { userId, matchIds },
    }));
    if (events.length > 0) {
      await step.sendEvent('emit-matches-ready', events);
    }

    return { created };
  },
);
