// /api/activation?action=generate|verify — merged to stay under Vercel's
// serverless function cap.
//  - action=generate (admin/lead): mint an 8-digit code for an employee.
//  - action=verify (public): desktop activation — email+code+consent -> device
//    token + user JWT.
import { handler, requireAuth, readBody, send, HttpError } from '../lib/http.js';
import { query, withTransaction } from '../lib/db.js';
import { sha256, generateActivationCode, generateDeviceToken, signToken } from '../lib/auth.js';
import { audit } from '../lib/audit.js';

const TTL_DAYS = 7;
const CONSENT_VERSION = process.env.CONSENT_VERSION || '1.0';
// Device bearer tokens expire and must be renewed by re-activating. Long enough
// not to nag active users, short enough that a leaked token self-heals. Tunable.
const DEVICE_TOKEN_TTL_DAYS = Number(process.env.DEVICE_TOKEN_TTL_DAYS) || 180;

export default handler(async (req, res) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method Not Allowed');
  const action = new URL(req.url, 'http://localhost').searchParams.get('action');

  // ---- generate (admin/lead) ----
  if (action === 'generate') {
    const actor = await requireAuth(req, ['admin', 'lead']);
    const { user_id } = await readBody(req);
    if (!user_id) throw new HttpError(400, 'Missing user_id');
    const { rows: [target] } = await query(
      `SELECT id, role, team_lead_id FROM users WHERE id = $1 AND company_id = $2`,
      [user_id, actor.company_id]
    );
    if (!target) throw new HttpError(404, 'Employee not found');
    if (target.role !== 'employee') throw new HttpError(400, 'Codes are only for employees');
    if (actor.role === 'lead' && (!actor.can_manage_employees || target.team_lead_id !== actor.id))
      throw new HttpError(403, 'Not authorized for this employee');

    const code = generateActivationCode();
    const expires = new Date(Date.now() + TTL_DAYS * 86400_000);
    await query(`UPDATE activation_codes SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`, [user_id]);
    await query(
      `INSERT INTO activation_codes (company_id, user_id, code_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [actor.company_id, user_id, sha256(code), expires]
    );
    await audit(req, actor, 'generate activation code', user_id);
    return send(res, 201, { code, expires_at: expires.toISOString() });
  }

  // ---- verify (public, desktop agent) ----
  if (action === 'verify') {
    const { email, code, platform, hostname, consent } = await readBody(req);
    if (!email || !code) throw new HttpError(400, 'Missing email or code');
    if (consent !== true) throw new HttpError(400, 'Consent is required to activate monitoring');

    const { rows: [user] } = await query(
      `SELECT id, company_id, name, email, role FROM users WHERE lower(email) = lower($1)`,
      [email]
    );
    if (!user || user.role !== 'employee') throw new HttpError(401, 'Invalid activation');

    const { rows: [ac] } = await query(
      `SELECT id, expires_at, used_at FROM activation_codes
        WHERE user_id = $1 AND code_hash = $2 ORDER BY created_at DESC LIMIT 1`,
      [user.id, sha256(code)]
    );
    if (!ac) throw new HttpError(401, 'Invalid activation code');
    if (ac.used_at) throw new HttpError(409, 'Activation code already used');
    if (new Date(ac.expires_at) < new Date()) throw new HttpError(410, 'Activation code expired');

    const deviceToken = generateDeviceToken();
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;
    const device = await withTransaction(async (client) => {
      await client.query(`UPDATE activation_codes SET used_at = now() WHERE id = $1`, [ac.id]);
      await client.query(
        `INSERT INTO consents (company_id, user_id, consent_version, granted_at, ip)
         VALUES ($1, $2, $3, now(), $4)`,
        [user.company_id, user.id, CONSENT_VERSION, ip]
      );
      await client.query(`UPDATE users SET status = 'active', updated_at = now() WHERE id = $1`, [user.id]);
      const expiresAt = new Date(Date.now() + DEVICE_TOKEN_TTL_DAYS * 86400_000);
      const { rows } = await client.query(
        `INSERT INTO devices (company_id, user_id, device_token_hash, platform, hostname, last_seen, expires_at)
         VALUES ($1, $2, $3, $4, $5, now(), $6) RETURNING id`,
        [user.company_id, user.id, sha256(deviceToken), platform || null, hostname || null, expiresAt]
      );
      return rows[0];
    });

    const userJwt = signToken({ sub: user.id, company_id: user.company_id, role: user.role });
    return send(res, 200, {
      device_id: device.id,
      device_token: deviceToken,
      user_token: userJwt,
      user: { id: user.id, name: user.name, email: user.email, company_id: user.company_id },
    });
  }

  throw new HttpError(400, 'Invalid action');
});
