// lib/db.js — single shared Postgres pool (Neon in prod, local PG in dev/test).
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Fail loud: no silent fallback to localStorage-style fakery in production code.
  console.warn('[db] DATABASE_URL is not set — DB calls will fail until configured.');
}

// Neon requires SSL with a publicly-trusted cert → verify it (do NOT disable TLS
// verification; that allows MITM). Local docker PG has no TLS → PGSSL=disable.
const ssl =
  process.env.PGSSL === 'disable'
    ? false
    : connectionString && /neon\.tech|sslmode=require/.test(connectionString)
      ? true // rejectUnauthorized defaults true → cert + hostname verified
      : false;

// Reuse the pool across serverless invocations (Fluid Compute keeps instances warm).
let pool = global.__chronotrack_pool;
if (!pool) {
  pool = new Pool({ connectionString, ssl, max: 5, idleTimeoutMillis: 30_000 });
  global.__chronotrack_pool = pool;
}

export function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { pool };
