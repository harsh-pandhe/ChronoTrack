// GET /api/telemetry-feed?user_id=&limit= — recent telemetry rows, role-scoped.
// employee=self, lead=own team, admin=company.
import { handler, requireAuth, send, HttpError } from '../lib/http.js';
import { query } from '../lib/db.js';

export default handler(async (req, res) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method Not Allowed');
  const actor = await requireAuth(req);
  const url = new URL(req.url, 'http://localhost');
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 50));
  const reqUser = url.searchParams.get('user_id');

  let where = 't.company_id = $1';
  const params = [actor.company_id];
  if (actor.role === 'employee') {
    where += ` AND t.user_id = $${params.length + 1}`;
    params.push(actor.id);
  } else if (actor.role === 'lead') {
    where += ` AND (u.team_lead_id = $${params.length + 1} OR u.id = $${params.length + 1})`;
    params.push(actor.id);
  }
  if (reqUser) {
    where += ` AND t.user_id = $${params.length + 1}`;
    params.push(reqUser);
  }

  const { rows } = await query(
    `SELECT t.ts, u.name AS employee, t.window_title, t.app_category,
            t.input_density, t.is_idle, t.anomaly_flag
       FROM telemetry_logs t JOIN users u ON u.id = t.user_id
      WHERE ${where}
      ORDER BY t.ts DESC LIMIT ${limit}`,
    params
  );
  return send(res, 200, { feed: rows });
});
