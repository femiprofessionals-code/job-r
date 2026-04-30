import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { companyStatus, scrapeSource } from './enums';
import { jobs } from './jobs';

export const companies = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    website: text('website'),
    logoUrl: text('logo_url'),
    description: text('description'),
    industry: text('industry'),
    sizeBucket: text('size_bucket'),
    hqCity: text('hq_city'),
    hqCountry: text('hq_country'),
    careersUrl: text('careers_url').notNull(),
    source: scrapeSource('source').notNull(),
    sourceBoardId: text('source_board_id'),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    status: companyStatus('status').notNull().default('approved'),
    scrapeIntervalMinutes: integer('scrape_interval_minutes').notNull().default(60),
    lastScrapedAt: timestamp('last_scraped_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('companies_slug_idx').on(t.slug),
    sourceIdx: index('companies_source_idx').on(t.source),
    statusIdx: index('companies_status_idx').on(t.status),
    lastScrapedIdx: index('companies_last_scraped_idx').on(t.lastScrapedAt),
  }),
);

export const scrapeLogs = pgTable(
  'scrape_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    source: scrapeSource('source').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    jobsFound: integer('jobs_found').notNull().default(0),
    jobsNew: integer('jobs_new').notNull().default(0),
    jobsClosed: integer('jobs_closed').notNull().default(0),
    success: integer('success').notNull().default(0),
    error: text('error'),
  },
  (t) => ({
    companyIdx: index('scrape_logs_company_idx').on(t.companyId),
    startedIdx: index('scrape_logs_started_idx').on(t.startedAt),
  }),
);

export const companiesRelations = relations(companies, ({ many }) => ({
  jobs: many(jobs),
  scrapeLogs: many(scrapeLogs),
}));

export const scrapeLogsRelations = relations(scrapeLogs, ({ one }) => ({
  company: one(companies, {
    fields: [scrapeLogs.companyId],
    references: [companies.id],
  }),
}));
