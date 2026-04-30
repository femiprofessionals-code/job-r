import { relations } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { notificationStatus, notificationType } from './enums';
import { profiles } from './users';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    type: notificationType('type').notNull(),
    status: notificationStatus('status').notNull().default('queued'),
    subject: text('subject').notNull(),
    payload: jsonb('payload'),
    resendId: text('resend_id'),
    error: text('error'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('notifications_user_idx').on(t.userId),
    typeIdx: index('notifications_type_idx').on(t.type),
    statusIdx: index('notifications_status_idx').on(t.status),
    createdIdx: index('notifications_created_idx').on(t.createdAt),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(profiles, {
    fields: [notifications.userId],
    references: [profiles.id],
  }),
}));
