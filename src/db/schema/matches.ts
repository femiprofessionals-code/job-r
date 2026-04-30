import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { profiles } from './users';
import { jobs } from './jobs';
import { careerTracks } from './careerTracks';
import { drafts } from './drafts';

export type MatchBreakdown = {
  function: number;
  seniority: number;
  skills: number;
  location: number;
  company: number;
  experience: number;
};

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    careerTrackId: uuid('career_track_id')
      .notNull()
      .references(() => careerTracks.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    overallScore: integer('overall_score').notNull(),
    breakdown: jsonb('breakdown').$type<MatchBreakdown>().notNull(),
    hidden: boolean('hidden').notNull().default(false),
    saved: boolean('saved').notNull().default(false),
    viewedAt: timestamp('viewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userJobTrackIdx: uniqueIndex('matches_user_job_track_idx').on(
      t.userId,
      t.jobId,
      t.careerTrackId,
    ),
    userIdx: index('matches_user_idx').on(t.userId),
    jobIdx: index('matches_job_idx').on(t.jobId),
    scoreIdx: index('matches_score_idx').on(t.overallScore),
    createdIdx: index('matches_created_idx').on(t.createdAt),
  }),
);

export const matchesRelations = relations(matches, ({ one, many }) => ({
  user: one(profiles, {
    fields: [matches.userId],
    references: [profiles.id],
  }),
  careerTrack: one(careerTracks, {
    fields: [matches.careerTrackId],
    references: [careerTracks.id],
  }),
  job: one(jobs, {
    fields: [matches.jobId],
    references: [jobs.id],
  }),
  drafts: many(drafts),
}));
