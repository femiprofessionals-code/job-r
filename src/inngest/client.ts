import { EventSchemas, Inngest } from 'inngest';

type Events = {
  'scrape/company.requested': { data: { companyId: string } };
  'scrape/all.requested': { data: Record<string, never> };
  'jobs/created': { data: { jobIds: string[]; companyId: string } };
  'jobs/classified': { data: { jobIds: string[] } };
  'matches/ready': { data: { userId: string; matchIds: string[] } };
  'drafts/generate.requested': { data: { userId: string; matchId: string } };
  'drafts/ready': { data: { draftId: string } };
  'digests/send.requested': { data: Record<string, never> };
  'reviews/reminder.requested': { data: { reviewId: string } };
  'reviews/accepted': { data: { reviewId: string } };
  'payouts/process': { data: { reviewId: string } };
  'users/signed_up': { data: { userId: string; email: string; name?: string } };
};

export const inngest = new Inngest({
  id: 'job-radar',
  schemas: new EventSchemas().fromRecord<Events>(),
});

export type InngestEvents = Events;
