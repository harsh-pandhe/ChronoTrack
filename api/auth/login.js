// POST /api/auth/login — email + password → JWT. Replaces hardcoded-password login.
import { handler, readBody, send, HttpError } from '../../lib/http.js';
import { verifyPassword, signToken } from '../../lib/auth.js';
import { rateLimit } from '../../lib/ratelimit.js';
import { query } from '../../lib/db.js';

export default handler(async (req, res) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method Not Allowed');
  // Brute-force guard: 10 attempts / minute / IP.
  await rateLimit(req, 'login', 10, 60_000);
  const { email, password } = await readBody(req);
  if (!email || !password) throw new HttpError(400, 'Missing email or password');

  const { rows } = await query(
    `SELECT id, company_id, name, email, password_hash, role, status, can_manage_employees
       FROM users WHERE lower(email) = lower($1)`,
    [email]
  );
  const user = rows[0];

  // Constant-ish path: always run verify to avoid user-enumeration timing leaks.
  const ok = user ? await verifyPassword(password, user.password_hash) : false;
  if (!user || !ok) throw new HttpError(401, 'Invalid credentials');
  if (user.status === 'disabled') throw new HttpError(403, 'Account disabled');

  const token = signToken({ sub: user.id, company_id: user.company_id, role: user.role });
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
