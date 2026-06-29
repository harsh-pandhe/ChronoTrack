// /api/auth/me — GET (session check) | PATCH (update own profile / password).
import { handler, requireAuth, readBody, send, HttpError } from '../../lib/http.js';
import { query } from '../../lib/db.js';
import { hashPassword, verifyPassword } from '../../lib/auth.js';
import { audit } from '../../lib/audit.js';

export default handler(async (req, res) => {
  const user = await requireAuth(req);

  if (req.method === 'GET') return send(res, 200, { user });

  if (req.method === 'PATCH') {
    const body = await readBody(req);

    // Change password: requires current password (or allowed if none set yet).
    if (body.new_password !== undefined) {
      if (String(body.new_password).length < 8)
        throw new HttpError(400, 'New password must be at least 8 characters');
      const { rows } = await query(`SELECT password_hash FROM users WHERE id = $1`, [user.id]);
      const currentHash = rows[0]?.password_hash;
      if (currentHash) {
        const okPw = await verifyPassword(body.current_password || '', currentHash);
        if (!okPw) throw new HttpError(401, 'Current password is incorrect');
      }
      await query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`,
        [await hashPassword(body.new_password), user.id]);
      await audit(req, user, 'change own password');
    }

    // Update own display name.
    if (body.name !== undefined && String(body.name).trim()) {
      await query(`UPDATE users SET name = $1, updated_at = now() WHERE id = $2`,
        [String(body.name).trim(), user.id]);
    }

    const { rows: [updated] } = await query(
      `SELECT id, company_id, name, email, role, team_lead_id, can_manage_employees, status
         FROM users WHERE id = $1`, [user.id]);
    return send(res, 200, { user: updated });
  }

  throw new HttpError(405, 'Method Not Allowed');
});
