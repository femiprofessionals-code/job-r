import { relations } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { draftStatus } from './enums';
import { profiles } from './users';
import { matches } from './matches';
import { jobs } from './jobs';
import { reviews } from './reviews';

export const drafts = pgTable(
  'drafts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    matchId: uuid('match_id').references(() => matches.id, { onDelete: 'set null' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    status: draftStatus('status').notNull().default('pending'),
    resumeJson: jsonb('resume_json'),
    coverLetterText: text('cover_letter_text'),
    resumePdfPath: text('resume_pdf_path'),
    resumeDocxPath: text('resume_docx_path'),
    coverLetterPdfPath: text('cover_letter_pdf_path'),
    model: text('model'),
    tokensUsed: jsonb('tokens_used'),
    generatedAt: timestamp('generated_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('drafts_user_idx').on(t.userId),
    jobIdx: index('drafts_job_idx').on(t.jobId),
    statusIdx: index('drafts_status_idx').on(t.status),
  }),
);

export const draftsRelations = relations(drafts, ({ one, many }) => ({
  user: one(profiles, {
    fields: [drafts.userId],
    references: [profiles.id],
  }),
  match: one(matches, {
    fields: [drafts.matchId],
    references: [matches.id],
  }),
  job: one(jobs, {
    fields: [drafts.jobId],
    references: [jobs.id],
  }),
  reviews: many(reviews),
}));
