// POST /api/activation/generate { user_id } — admin/lead mints an 8-digit code.
// Plaintext code is returned ONCE for delivery; only its hash is stored.
import { handler, requireAuth, readBody, send, HttpError } from '../../lib/http.js';
import { query } from '../../lib/db.js';
import { generateActivationCode, sha256 } from '../../lib/auth.js';
import { audit } from '../../lib/audit.js';

const TTL_DAYS = 7;

export default handler(async (req, res) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method Not Allowed');
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

  // Invalidate any prior unused codes, then store the new hash.
  await query(`UPDATE activation_codes SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`, [user_id]);
  await query(
    `INSERT INTO activation_codes (company_id, user_id, code_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [actor.company_id, user_id, sha256(code), expires]
  );

  await audit(req, actor, 'generate activation code', user_id);
  // Code shown once — UI must surface it now; it is unrecoverable afterwards.
  return send(res, 201, { code, expires_at: expires.toISOString() });
});
