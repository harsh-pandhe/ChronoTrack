// GET /api/audit-logs — recent immutable audit trail for the company (admin only).
import { handler, requireAuth, send, HttpError } from '../lib/http.js';
import { query } from '../lib/db.js';

export default handler(async (req, res) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method Not Allowed');
  const actor = await requireAuth(req, ['admin']);
  const { rows } = await query(
    `SELECT id, actor_name, action, target, ip, ts
       FROM audit_logs WHERE company_id=$1 ORDER BY ts DESC LIMIT 100`,
    [actor.company_id]
  );
  return send(res, 200, { logs: rows });
});
