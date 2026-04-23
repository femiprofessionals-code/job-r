import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { jobFunction, locationType, seniorityLevel } from './enums';
import { profiles } from './users';
import { matches } from './matches';

export const careerTracks = pgTable(
  'career_tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    targetFunction: jobFunction('target_function').notNull(),
    targetSeniority: seniorityLevel('target_seniority').notNull(),
    targetLocationType: locationType('target_location_type'),
    preferredCities: jsonb('preferred_cities').$type<string[]>().default([]).notNull(),
    preferredCountries: jsonb('preferred_countries').$type<string[]>().default([]).notNull(),
    mustHaveSkills: jsonb('must_have_skills').$type<string[]>().default([]).notNull(),
    niceToHaveSkills: jsonb('nice_to_have_skills').$type<string[]>().default([]).notNull(),
    excludedCompanies: jsonb('excluded_companies').$type<string[]>().default([]).notNull(),
    targetCompanies: jsonb('target_companies').$type<string[]>().default([]).notNull(),
    minSalary: integer('min_salary'),
    salaryCurrency: text('salary_currency').default('USD'),
    minMatchScore: integer('min_match_score').notNull().default(60),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('career_tracks_user_idx').on(t.userId),
    activeIdx: index('career_tracks_active_idx').on(t.isActive),
  }),
);

export const careerTracksRelations = relations(careerTracks, ({ one, many }) => ({
  user: one(profiles, {
    fields: [careerTracks.userId],
    references: [profiles.id],
  }),
  matches: many(matches),
}));
