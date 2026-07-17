// lib/auth.js — password hashing, JWT sessions, token hashing, code generation.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_TTL = process.env.JWT_TTL || '8h';

// Fail loud in production if the signing secret is missing — no insecure default.
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production');
}
const SECRET = JWT_SECRET || 'dev-only-insecure-secret-change-me';

// Zero-downtime secret rotation: set JWT_SECRET to the new value and move the
// old one to JWT_SECRET_PREVIOUS. New tokens are signed with SECRET; existing
// tokens signed with the previous secret still verify until they expire (≤ TTL),
// so rotating the secret no longer force-logs-out every active session.
const PREVIOUS_SECRET = process.env.JWT_SECRET_PREVIOUS || null;

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function signToken(payload) {
  // payload: { sub, company_id, role }. Full 8h session; adds amr:['pwd'] or
  // amr:['pwd','mfa'] at the call site for future step-up decisions.
  return jwt.sign(payload, SECRET, { expiresIn: JWT_TTL });
}

// Short-lived token issued after password success but before the second factor.
// typ:'mfa_pending' is explicitly rejected by requireAuth, so it can ONLY be
// exchanged at the MFA verify endpoint — it is never a usable session on its own.
export function signPendingMfaToken(payload) {
  return jwt.sign({ ...payload, typ: 'mfa_pending' }, SECRET, { expiresIn: '5m' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    // During a rotation window, accept tokens still signed by the prior secret.
    if (PREVIOUS_SECRET) {
      try {
        return jwt.verify(token, PREVIOUS_SECRET);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Generate a cryptographically-random 8-digit activation code (00000000–99999999).
export function generateActivationCode() {
  const n = crypto.randomInt(0, 100_000_000);
  return String(n).padStart(8, '0');
}

// Opaque device bearer token for the daemon (issued at activation).
export function generateDeviceToken() {
  return crypto.randomBytes(32).toString('hex');
}

// One-way hash for codes/device tokens stored at rest (not reversible, fast verify).
export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
