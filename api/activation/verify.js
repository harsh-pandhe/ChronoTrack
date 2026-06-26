// POST /api/activation/verify { email, code, platform, hostname }
// Desktop agent activation: validates email+code, records consent, registers a
// device, and returns a one-time device token (for daemon ingest) + a user JWT.
import { handler, readBody, send, HttpError } from '../../lib/http.js';
import { query, withTransaction } from '../../lib/db.js';
import { sha256, generateDeviceToken, signToken } from '../../lib/auth.js';

const CONSENT_VERSION = process.env.CONSENT_VERSION || '1.0';

export default handler(async (req, res) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method Not Allowed');
  const { email, code, platform, hostname, consent } = await readBody(req);
  if (!email || !code) throw new HttpError(400, 'Missing email or code');
  // DPDP: monitoring requires explicit, affirmative consent before activation.
  if (consent !== true) throw new HttpError(400, 'Consent is required to activate monitoring');

  const { rows: [user] } = await query(
    `SELECT id, company_id, name, email, role FROM users WHERE lower(email) = lower($1)`,
    [email]
  );
  if (!user || user.role !== 'employee') throw new HttpError(401, 'Invalid activation');

  const { rows: [ac] } = await query(
    `SELECT id, expires_at, used_at FROM activation_codes
      WHERE user_id = $1 AND code_hash = $2
      ORDER BY created_at DESC LIMIT 1`,
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
    const { rows } = await client.query(
      `INSERT INTO devices (company_id, user_id, device_token_hash, platform, hostname, last_seen)
       VALUES ($1, $2, $3, $4, $5, now()) RETURNING id`,
      [user.company_id, user.id, sha256(deviceToken), platform || null, hostname || null]
    );
    return rows[0];
  });

  const userJwt = signToken({ sub: user.id, company_id: user.company_id, role: user.role });
  return send(res, 200, {
    device_id: device.id,
    device_token: deviceToken, // shown once → daemon stores it in OS keyring
    user_token: userJwt,
    user: { id: user.id, name: user.name, email: user.email, company_id: user.company_id },
  });
});
