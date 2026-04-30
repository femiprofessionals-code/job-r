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
import { reviewerTier, subscriptionPlan, subscriptionStatus, userRole } from './enums';
import { careerTracks } from './careerTracks';
import { drafts } from './drafts';
import { matches } from './matches';
import { reviews } from './reviews';
import { notifications } from './notifications';

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    email: text('email').notNull(),
    fullName: text('full_name'),
    avatarUrl: text('avatar_url'),
    role: userRole('role').notNull().default('user'),
    headline: text('headline'),
    bio: text('bio'),
    yearsExperience: integer('years_experience'),
    locationCity: text('location_city'),
    locationCountry: text('location_country'),
    currentTitle: text('current_title'),
    currentCompany: text('current_company'),
    skills: jsonb('skills').$type<string[]>().default([]).notNull(),
    resumeJson: jsonb('resume_json'),
    resumeStoragePath: text('resume_storage_path'),
    onboardingComplete: boolean('onboarding_complete').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex('profiles_email_idx').on(t.email),
    roleIdx: index('profiles_role_idx').on(t.role),
  }),
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    plan: subscriptionPlan('plan').notNull().default('free'),
    status: subscriptionStatus('status').notNull().default('active'),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    stripePriceId: text('stripe_price_id'),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: uniqueIndex('subscriptions_user_idx').on(t.userId),
    stripeSubIdx: uniqueIndex('subscriptions_stripe_sub_idx').on(t.stripeSubscriptionId),
    customerIdx: index('subscriptions_customer_idx').on(t.stripeCustomerId),
  }),
);

export const reviewers = pgTable(
  'reviewers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    tier: reviewerTier('tier').notNull().default('bronze'),
    specialty: text('specialty'),
    bio: text('bio'),
    stripeAccountId: text('stripe_account_id'),
    payoutsEnabled: boolean('payouts_enabled').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    completedReviews: integer('completed_reviews').notNull().default(0),
    averageRating: integer('average_rating'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: uniqueIndex('reviewers_user_idx').on(t.userId),
    tierIdx: index('reviewers_tier_idx').on(t.tier),
    activeIdx: index('reviewers_active_idx').on(t.isActive),
  }),
);

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  subscription: one(subscriptions, {
    fields: [profiles.id],
    references: [subscriptions.userId],
  }),
  reviewer: one(reviewers, {
    fields: [profiles.id],
    references: [reviewers.userId],
  }),
  careerTracks: many(careerTracks),
  drafts: many(drafts),
  matches: many(matches),
  reviews: many(reviews),
  notifications: many(notifications),
}));
