// lib/http.js — CORS, body parsing, auth guard, uniform error handling.
import { verifyToken } from './auth.js';
import { query } from './db.js';

// Lock CORS to known origins (set ALLOWED_ORIGINS="https://app.example.com,app://.").
const ALLOWED = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function applyCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED.length === 0) {
    // Dev fallback only; production MUST set ALLOWED_ORIGINS.
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (origin && ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wrap a handler with CORS + OPTIONS + error funnel.
export function handler(fn) {
  return async (req, res) => {
    applyCors(req, res);
    if (req.method === 'OPTIONS') return send(res, 204, {});
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      console.error('[api] unhandled', err);
      return send(res, 500, { error: 'Internal server error' });
    }
  };
}

// Extract + verify the JWT, returning the live user row. Throws 401 if invalid.
export async function requireAuth(req, roles = null) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new HttpError(401, 'Missing bearer token');
  const claims = verifyToken(token);
  if (!claims) throw new HttpError(401, 'Invalid or expired token');

  const { rows } = await query(
    `SELECT id, company_id, name, email, role, team_lead_id, can_manage_employees, status
       FROM users WHERE id = $1`,
    [claims.sub]
  );
  const user = rows[0];
  if (!user || user.status === 'disabled') throw new HttpError(401, 'User not found or disabled');
  if (roles && !roles.includes(user.role)) throw new HttpError(403, 'Insufficient role');
  return user;
}
