import { scrapeAll } from './scrape-all';
import { scrapeCompanyFn } from './scrape-company';
import { classifyJobsFn } from './classify-jobs';
import { matchUsersFn } from './match-users';
import { generateDraftsFn } from './generate-drafts';
import { sendDigestsFn } from './send-digests';
import { reviewReminderFn } from './review-reminder';
import { processPayoutFn } from './process-payout';
import { usersSignedUpFn } from './users-signed-up';
import { reviewAcceptedFn } from './review-accepted';
import { backfillClassifyFn } from './backfill-classify';

export const functions = [
  scrapeAll,
  scrapeCompanyFn,
  classifyJobsFn,
  matchUsersFn,
  generateDraftsFn,
  sendDigestsFn,
  reviewReminderFn,
  processPayoutFn,
  usersSignedUpFn,
  reviewAcceptedFn,
  backfillClassifyFn,
];
