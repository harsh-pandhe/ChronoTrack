// lib/ratelimit.js — fixed-window rate limiter.
//
// Two backends, chosen at runtime:
//   * Shared (Upstash Redis REST) when UPSTASH_REDIS_REST_URL + _TOKEN are set —
//     limits hold ACROSS all serverless instances, which is what you want at
//     company scale (a per-instance counter can be bypassed by spraying requests
//     across warm instances). Uses plain fetch, so no extra dependency.
//   * In-memory per-instance fallback otherwise (fine for local dev and small
//     deployments; also the fail-open path if the shared backend errors, so a
//     Redis outage degrades limiting rather than taking auth/ingest down).
import { HttpError } from './http.js';

const buckets = global.__ct_ratelimit || (global.__ct_ratelimit = new Map());

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.RATE_LIMIT_REDIS_URL || null;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.RATE_LIMIT_REDIS_TOKEN || null;
const useRedis = !!(REDIS_URL && REDIS_TOKEN);

function clientKey(req, scope) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  return `${scope}:${ip}`;
}

// In-memory fixed window. Returns the current count within the window.
function memIncr(key, windowMs) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

// Shared fixed window via Upstash REST pipeline: INCR, and set the TTL only on
// first hit (EXPIRE ... NX) so the window doesn't slide on every request.
async function redisIncr(key, windowSec) {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', `rl:${key}`],
      ['EXPIRE', `rl:${key}`, String(windowSec), 'NX'],
    ]),
  });
  if (!res.ok) throw new Error(`ratelimit backend ${res.status}`);
  const out = await res.json(); // [{result: <count>}, {result: 0|1}]
  return Number(out[0].result);
}

async function enforce(key, limit, windowMs) {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  let count;
  if (useRedis) {
    try {
      count = await redisIncr(key, windowSec);
    } catch {
      // Fail open to the local counter — never let a limiter outage 500 the API.
      count = memIncr(key, windowMs);
    }
  } else {
    count = memIncr(key, windowMs);
  }
  if (count > limit) throw new HttpError(429, `Too many requests. Retry in ${windowSec}s.`);
}

// Rate-limit by an explicit key (e.g. device id) instead of IP — needed for
// ingest, since many agents behind one office NAT share a public IP.
export function rateLimitKey(key, limit, windowMs) {
  return enforce(key, limit, windowMs);
}

// Rate-limit by client IP within a named scope. Throws 429 when exceeded.
export function rateLimit(req, scope, limit, windowMs) {
  return enforce(clientKey(req, scope), limit, windowMs);
}
