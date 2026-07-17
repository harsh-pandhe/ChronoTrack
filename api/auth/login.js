// POST /api/auth/login — email + password → JWT (or an MFA challenge).
import { handler, readBody, send, HttpError } from '../../lib/http.js';
import { verifyPassword, signToken, signPendingMfaToken } from '../../lib/auth.js';
import { rateLimit } from '../../lib/ratelimit.js';
import { query } from '../../lib/db.js';

export default handler(async (req, res) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method Not Allowed');
  // Brute-force guard: 10 attempts / minute / IP.
  await rateLimit(req, 'login', 10, 60_000);
  const { email, password } = await readBody(req);
  if (!email || !password) throw new HttpError(400, 'Missing email or password');

  const { rows } = await query(
    `SELECT id, company_id, name, email, password_hash, role, status, can_manage_employees, mfa_enabled
       FROM users WHERE lower(email) = lower($1)`,
    [email]
  );
  const user = rows[0];

  // Constant-ish path: always run verify to avoid user-enumeration timing leaks.
  const ok = user ? await verifyPassword(password, user.password_hash) : false;
  if (!user || !ok) throw new HttpError(401, 'Invalid credentials');
  if (user.status === 'disabled') throw new HttpError(403, 'Account disabled');

  // Second factor, only for admin/lead who have opted in. This branch is reached
  // ONLY after the password verified, so returning mfa_required leaks nothing an
  // attacker with the password doesn't already have (no pre-password MFA probe).
  const mfaEligible = user.role === 'admin' || user.role === 'lead';
  if (mfaEligible && user.mfa_enabled) {
    const [{ rows: totp }, { rows: creds }, { rows: recov }] = await Promise.all([
      query(`SELECT 1 FROM mfa_totp WHERE user_id=$1 AND confirmed_at IS NOT NULL`, [user.id]),
      query(`SELECT 1 FROM mfa_credentials WHERE user_id=$1 LIMIT 1`, [user.id]),
      query(`SELECT count(*)::int AS n FROM mfa_recovery_codes WHERE user_id=$1 AND used_at IS NULL`, [user.id]),
    ]);
    const methods = [];
    if (totp.length) methods.push('totp');
    if (creds.length) methods.push('passkey');
    return send(res, 200, {
      mfa_required: true,
      pending_token: signPendingMfaToken({ sub: user.id, company_id: user.company_id, role: user.role }),
      methods,
      recovery: recov[0].n > 0,
    });
  }

  const token = signToken({ sub: user.id, company_id: user.company_id, role: user.role, amr: ['pwd'] });
  return send(res, 200, {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
      can_manage_employees: !!user.can_manage_employees,
    },
  });
});
