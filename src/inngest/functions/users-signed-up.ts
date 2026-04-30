import { inngest } from '../client';
import { sendWelcome } from '@/services/notifications';

export const usersSignedUpFn = inngest.createFunction(
  { id: 'users-signed-up', name: 'Send welcome email on signup' },
  { event: 'users/signed_up' },
  async ({ event }) => {
    const { userId, email, name } = event.data;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    await sendWelcome(userId, email, name ?? 'there', appUrl);
    return { ok: true };
  },
);
