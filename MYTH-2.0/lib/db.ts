import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// Create the Turso libsql client
// intMode: 'number' ensures integer columns are returned as JS numbers (not BigInt)
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
  intMode: 'number',
  // Use fetch with a timeout so requests don't hang indefinitely
  fetch: (url: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000); // 10s timeout
    return fetch(url, { ...init, signal: controller.signal }).finally(() =>
      clearTimeout(timer)
    );
  },
});

// Create the drizzle database instance
export const db = drizzle(client, { schema });

// Export the client for direct queries if needed
export { client };
