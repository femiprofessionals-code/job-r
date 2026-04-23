import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { jobFunction, jobStatus, locationType, seniorityLevel } from './enums';
import { companies } from './companies';
import { matches } from './matches';

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    department: text('department'),
    team: text('team'),
    description: text('description').notNull(),
    locationRaw: text('location_raw'),
    locationCity: text('location_city'),
    locationCountry: text('location_country'),
    locationType: locationType('location_type'),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    salaryCurrency: text('salary_currency'),
    employmentType: text('employment_type'),
    applyUrl: text('apply_url').notNull(),
    status: jobStatus('status').notNull().default('open'),
    postedAt: timestamp('posted_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    classified: boolean('classified').notNull().default(false),
    classifiedAt: timestamp('classified_at', { withTimezone: true }),
    function: jobFunction('function'),
    seniority: seniorityLevel('seniority'),
    skills: jsonb('skills').$type<string[]>().default([]).notNull(),
    classifierMeta: jsonb('classifier_meta'),
    raw: jsonb('raw'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyExternalIdx: uniqueIndex('jobs_company_external_idx').on(t.companyId, t.externalId),
    statusIdx: index('jobs_status_idx').on(t.status),
    classifiedIdx: index('jobs_classified_idx').on(t.classified),
    functionIdx: index('jobs_function_idx').on(t.function),
    seniorityIdx: index('jobs_seniority_idx').on(t.seniority),
    postedIdx: index('jobs_posted_idx').on(t.postedAt),
  }),
);

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  company: one(companies, {
    fields: [jobs.companyId],
    references: [companies.id],
  }),
  matches: many(matches),
}));
