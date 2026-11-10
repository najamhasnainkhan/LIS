import { Pool } from "pg";

const g = globalThis as unknown as { pool?: Pool };

export const pool: Pool =
  g.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 15000,
  });
g.pool = pool;

// Runs a parameterised query; retries once on a connection error (database may be waking up).
export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  try {
    return (await pool.query(text, params)).rows as T[];
  } catch (e: any) {
    if (e && !e.code?.match?.(/^[0-9A-Z]{5}$/) ) {
      return (await pool.query(text, params)).rows as T[];
    }
    throw e;
  }
}
