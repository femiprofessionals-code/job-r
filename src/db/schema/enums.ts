import { pgEnum } from 'drizzle-orm/pg-core';

export const subscriptionPlan = pgEnum('subscription_plan', ['free', 'pro', 'premium']);
export const subscriptionStatus = pgEnum('subscription_status', [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'incomplete',
]);

export const jobFunction = pgEnum('job_function', [
  'engineering',
  'product',
  'design',
  'data',
  'marketing',
  'sales',
  'operations',
  'finance',
  'legal',
  'people',
  'support',
  'other',
]);

export const seniorityLevel = pgEnum('seniority_level', [
  'intern',
  'junior',
  'mid',
  'senior',
  'staff',
  'principal',
  'manager',
  'director',
  'vp',
  'executive',
]);

export const locationType = pgEnum('location_type', ['remote', 'hybrid', 'onsite']);

export const scrapeSource = pgEnum('scrape_source', [
  'greenhouse',
  'lever',
  'ashby',
  'workday',
  'fallback',
]);

export const jobStatus = pgEnum('job_status', ['open', 'closed', 'expired']);

export const draftStatus = pgEnum('draft_status', [
  'pending',
  'generating',
  'ready',
  'in_review',
  'approved',
  'rejected',
  'delivered',
]);

export const reviewerTier = pgEnum('reviewer_tier', ['bronze', 'silver', 'gold', 'platinum']);

export const reviewStatus = pgEnum('review_status', [
  'assigned',
  'in_progress',
  'submitted',
  'accepted',
  'revision_requested',
  'expired',
]);

export const payoutStatus = pgEnum('payout_status', [
  'pending',
  'processing',
  'paid',
  'failed',
  'canceled',
]);

export const notificationType = pgEnum('notification_type', [
  'welcome',
  'digest',
  'new_match',
  'draft_ready',
  'review_assigned',
  'review_reminder',
  'payout_sent',
  'subscription_changed',
]);

export const notificationStatus = pgEnum('notification_status', [
  'queued',
  'sent',
  'failed',
  'bounced',
]);

export const companyStatus = pgEnum('company_status', ['pending', 'approved', 'rejected']);

export const userRole = pgEnum('user_role', ['user', 'reviewer', 'admin']);
