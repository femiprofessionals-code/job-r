export type ReviewerTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export const TIER_PAYOUT_CENTS: Record<ReviewerTier, number> = {
  bronze: 1500,
  silver: 2500,
  gold: 4000,
  platinum: 6500,
};

export const TIER_SLA_HOURS: Record<ReviewerTier, number> = {
  bronze: 72,
  silver: 48,
  gold: 24,
  platinum: 12,
};

export const TIER_WEIGHTS: Record<ReviewerTier, number> = {
  platinum: 4,
  gold: 3,
  silver: 2,
  bronze: 1,
};
