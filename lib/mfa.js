// lib/mfa.js — TOTP + WebAuthn helpers and the security-critical verify guards.
//
// The traps handled here (each is a real vulnerability if gotten wrong):
//   * TOTP replay — a code valid for one 30s step must not work twice.
//   * Brute force — the IP rate limiter fails open on serverless, so a durable
//     per-user DB lockout is the real guard.
//   * WebAuthn counter regression — reject clones, but tolerate the many
//     authenticators that always report counter 0.
//   * Single-use recovery codes / challenges — consumed atomically, never
//     SELECT-then-UPDATE.
import crypto from 'crypto';
import * as OTPAuth from 'otpauth';
import { query, withTransaction } from './db.js';
import { sha256 } from './auth.js';

const ISSUER = 'ChronoTrack';

// --- TOTP secret encryption (AES-256-GCM) -------------------------------------
// MFA_ENC_KEY is a SEPARATE secret from JWT_SECRET on purpose: JWT_SECRET rotates
// (JWT_SECRET_PREVIOUS exists for that), and rotating it must never brick every
// enrolled authenticator. Honest scope: this protects a DB dump/backup/log leak,
// NOT someone who can already read Vercel env (they have JWT_SECRET and can mint
// admin sessions anyway). Still worth the ~30 lines.
function encKey() {
  const raw = process.env.MFA_ENC_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') throw new Error('MFA_ENC_KEY must be set in production');
    // Dev/test only: a fixed 32-byte key so enrollment survives a restart.
    return crypto.createHash('sha256').update('dev-only-mfa-key-change-me').digest();
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('MFA_ENC_KEY must be 32 bytes, base64-encoded');
  return key;
}

export function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]); // iv(12) || tag(16) || ciphertext
}

export function decryptSecret(buf) {
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

// --- TOTP ---------------------------------------------------------------------
export function newTotpSecret() {
  return new OTPAuth.Secret({ size: 20 }).base32; // 160-bit, base32 (authenticator standard)
}

export function totpUri(secretBase32, accountEmail) {
  return new OTPAuth.TOTP({
    issuer: ISSUER, label: accountEmail, algorithm: 'SHA1', digits: 6, period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  }).toString();
}

// Validate a code and return its absolute 30s step index, or null. window:1 (±30s)
// absorbs clock skew — but that also means a code stays valid ~90s, so the caller
// MUST reject a step it has already accepted (see verifyTotpForUser).
function totpValidate(secretBase32, token) {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER, algorithm: 'SHA1', digits: 6, period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  const delta = totp.validate({ token: String(token || '').replace(/\s/g, ''), window: 1 });
  if (delta === null) return null;
  return Math.floor(Date.now() / 1000 / 30) + delta; // absolute step
}

// --- per-user lockout (the real brute-force guard) ----------------------------
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

export async function assertNotLocked(userId) {
  const { rows } = await query(`SELECT mfa_locked_until FROM users WHERE id=$1`, [userId]);
  const until = rows[0]?.mfa_locked_until;
  if (until && new Date(until) > new Date()) {
    const secs = Math.ceil((new Date(until) - new Date()) / 1000);
    const err = new Error(`Too many attempts. Locked for ~${Math.ceil(secs / 60)} min.`);
    err.status = 429;
    throw err;
  }
}

async function recordFailure(userId) {
  // Single statement: increment, and arm a capped 15-min lock at the threshold.
  // Capped (not permanent) on purpose — a permanent lock is a DoS anyone with
  // the password can trigger.
  await query(
    `UPDATE users
        SET mfa_failed_count = mfa_failed_count + 1,
            mfa_locked_until = CASE WHEN mfa_failed_count + 1 >= $2
                                    THEN now() + ($3 || ' minutes')::interval END
      WHERE id = $1`,
    [userId, MAX_FAILS, String(LOCK_MINUTES)]
  );
}

async function clearFailures(userId) {
  await query(`UPDATE users SET mfa_failed_count = 0, mfa_locked_until = NULL WHERE id=$1`, [userId]);
}

// Verify a TOTP code for a user. Atomic: reads last_step under a row lock, checks
// skew+replay, and advances last_step in one transaction so the same code can't be
// used twice even under concurrent requests. Returns true on success.
export async function consumeTotp(userId, token) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT secret_enc, last_step FROM mfa_totp WHERE user_id=$1 FOR UPDATE`,
      [userId]
    );
    if (!rows[0]) return false;
    const secret = decryptSecret(rows[0].secret_enc);
    const step = totpValidate(secret, token);
    if (step === null) return false;
    if (rows[0].last_step !== null && step <= Number(rows[0].last_step)) return false; // replay
    await client.query(`UPDATE mfa_totp SET last_step=$2 WHERE user_id=$1`, [userId, step]);
    return true;
  });
}

// --- recovery codes -----------------------------------------------------------
// Crockford-ish base32, 16 chars ≈ 80 bits. Displayed once; stored sha256.
export function generateRecoveryCodes(n = 10) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const codes = [];
  for (let i = 0; i < n; i++) {
    let c = '';
    for (let j = 0; j < 16; j++) c += alphabet[crypto.randomInt(0, alphabet.length)];
    codes.push(`${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}-${c.slice(12, 16)}`);
  }
  return codes;
}

// Consume a recovery code atomically: one UPDATE, zero rows = invalid-or-used.
export async function consumeRecoveryCode(userId, code) {
  const normalized = String(code || '').toUpperCase().replace(/\s/g, '');
  const { rows } = await query(
    `UPDATE mfa_recovery_codes SET used_at = now()
      WHERE user_id=$1 AND code_hash=$2 AND used_at IS NULL
      RETURNING id`,
    [userId, sha256(normalized)]
  );
  return rows.length > 0;
}

// --- WebAuthn challenge store (single-use, DB-backed) -------------------------
const CHALLENGE_TTL_SECONDS = 120;

export async function storeChallenge(userId, purpose, challenge) {
  // One outstanding challenge per (user, purpose): clear stale ones first.
  await query(`DELETE FROM mfa_challenges WHERE user_id=$1 AND purpose=$2`, [userId, purpose]);
  await query(
    `INSERT INTO mfa_challenges (user_id, purpose, challenge, expires_at)
     VALUES ($1, $2, $3, now() + ($4 || ' seconds')::interval)`,
    [userId, purpose, challenge, String(CHALLENGE_TTL_SECONDS)]
  );
}

// Atomically consume: DELETE ... RETURNING. Returns the challenge string or null
// (also opportunistically sweeps this user's expired rows).
export async function consumeChallenge(userId, purpose) {
  const { rows } = await query(
    `DELETE FROM mfa_challenges
      WHERE id = (
        SELECT id FROM mfa_challenges
         WHERE user_id=$1 AND purpose=$2 AND expires_at > now()
         ORDER BY created_at DESC LIMIT 1
      )
      RETURNING challenge`,
    [userId, purpose]
  );
  // Opportunistic cleanup of anything expired for this user.
  query(`DELETE FROM mfa_challenges WHERE user_id=$1 AND expires_at <= now()`, [userId]).catch(() => {});
  return rows[0]?.challenge || null;
}

// WebAuthn counter rule: reject a regression only when the stored counter is > 0.
// Many platform authenticators (iCloud Keychain, most Android) always send 0;
// rejecting a bare non-increment would break them on the first login.
export function isCounterRegression(stored, next) {
  return Number(stored) > 0 && Number(next) <= Number(stored);
}

export const MFA = {
  recordFailure, clearFailures, MAX_FAILS, LOCK_MINUTES,
};
