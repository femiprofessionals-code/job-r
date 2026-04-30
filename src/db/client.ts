import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

declare global {
  // eslint-disable-next-line no-var
  var __db_client: ReturnType<typeof postgres> | undefined;
}

const client =
  globalThis.__db_client ??
  postgres(connectionString, {
    prepare: false,
    max: 10,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__db_client = client;
}

export const db = drizzle(client, { schema, logger: process.env.NODE_ENV !== 'production' });
export type DB = typeof db;
export { schema };
