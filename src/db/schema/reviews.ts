import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { payoutStatus, reviewStatus, reviewerTier } from './enums';
import { reviewers, profiles } from './users';
import { drafts } from './drafts';

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    draftId: uuid('draft_id')
      .notNull()
      .references(() => drafts.id, { onDelete: 'cascade' }),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => reviewers.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: reviewStatus('status').notNull().default('assigned'),
    tierAtAssignment: reviewerTier('tier_at_assignment').notNull(),
    editedResumeJson: jsonb('edited_resume_json'),
    editedCoverLetter: text('edited_cover_letter'),
    reviewerNotes: text('reviewer_notes'),
    payoutCents: integer('payout_cents').notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    rating: integer('rating'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    reviewerIdx: index('reviews_reviewer_idx').on(t.reviewerId),
    draftIdx: index('reviews_draft_idx').on(t.draftId),
    statusIdx: index('reviews_status_idx').on(t.status),
    dueIdx: index('reviews_due_idx').on(t.dueAt),
  }),
);

export const payouts = pgTable(
  'payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => reviewers.id, { onDelete: 'cascade' }),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id, { onDelete: 'cascade' }),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull().default('usd'),
    status: payoutStatus('status').notNull().default('pending'),
    stripeTransferId: text('stripe_transfer_id'),
    error: text('error'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    reviewerIdx: index('payouts_reviewer_idx').on(t.reviewerId),
    statusIdx: index('payouts_status_idx').on(t.status),
    transferIdx: index('payouts_transfer_idx').on(t.stripeTransferId),
  }),
);

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  draft: one(drafts, {
    fields: [reviews.draftId],
    references: [drafts.id],
  }),
  reviewer: one(reviewers, {
    fields: [reviews.reviewerId],
    references: [reviewers.id],
  }),
  user: one(profiles, {
    fields: [reviews.userId],
    references: [profiles.id],
  }),
  payouts: many(payouts),
}));

export const payoutsRelations = relations(payouts, ({ one }) => ({
  reviewer: one(reviewers, {
    fields: [payouts.reviewerId],
    references: [reviewers.id],
  }),
  review: one(reviews, {
    fields: [payouts.reviewId],
    references: [reviews.id],
  }),
}));
