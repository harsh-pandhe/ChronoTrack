// lib/ratelimit.js — lightweight in-memory fixed-window limiter.
// Per serverless instance (Fluid Compute reuses instances, so this dampens
// bursts effectively). For strict global limits across instances, back this
// with Redis/Upstash in production — see PLAN.md Phase 6.
import { HttpError } from './http.js';

const buckets = global.__ct_ratelimit || (global.__ct_ratelimit = new Map());

function clientKey(req, scope) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  return `${scope}:${ip}`;
}

// limit = max requests per windowMs. Throws 429 when exceeded.
export function rateLimit(req, scope, limit, windowMs) {
  const key = clientKey(req, scope);
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) {
    const retry = Math.ceil((entry.reset - now) / 1000);
    throw new HttpError(429, `Too many requests. Retry in ${retry}s.`);
  }
}
