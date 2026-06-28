// /api/reports?kind=rules|audit|telemetry — consolidated read/admin endpoints.
// Merged from rules/audit-logs/telemetry-feed to stay under Vercel's function cap.
//  - kind=rules:     GET list (any authed) | POST add | DELETE (admin only)
//  - kind=audit:     GET company audit trail (admin only)
//  - kind=telemetry: GET recent telemetry rows, role-scoped
import { handler, requireAuth, readBody, send, HttpError } from '../lib/http.js';
import { query } from '../lib/db.js';
import { audit } from '../lib/audit.js';

export default handler(async (req, res) => {
  const actor = await requireAuth(req);
  const url = new URL(req.url, 'http://localhost');
  const kind = url.searchParams.get('kind') || 'rules';

  // ---- rules ----
  if (kind === 'rules') {
    if (req.method === 'GET') {
      const { rows } = await query(
        `SELECT id, keyword, category FROM productivity_rules
          WHERE company_id=$1 ORDER BY category, keyword`,
        [actor.company_id]
      );
      return send(res, 200, { rules: rows });
    }
    if (req.method === 'POST') {
      if (actor.role !== 'admin') throw new HttpError(403, 'Admin only');
      const { keyword, category } = await readBody(req);
      if (!keyword || !['whitelist', 'blacklist'].includes(category))
        throw new HttpError(400, 'keyword + category (whitelist|blacklist) required');
      const kw = String(keyword).trim().toLowerCase();
      if (!kw) throw new HttpError(400, 'Empty keyword');
      let row;
      try {
        ({ rows: [row] } = await query(
          `INSERT INTO productivity_rules (company_id, keyword, category)
           VALUES ($1,$2,$3) RETURNING id, keyword, category`,
          [actor.company_id, kw, category]
        ));
      } catch (err) {
        if (err.code === '23505') throw new HttpError(409, 'Keyword already exists');
        throw err;
      }
      await audit(req, actor, `add ${category} rule`, kw);
      return send(res, 201, { rule: row });
    }
    if (req.method === 'DELETE') {
      if (actor.role !== 'admin') throw new HttpError(403, 'Admin only');
      const id = url.searchParams.get('id');
      if (!id) throw new HttpError(400, 'Missing id');
      await query(`DELETE FROM productivity_rules WHERE id=$1 AND company_id=$2`, [id, actor.company_id]);
      await audit(req, actor, 'remove rule', id);
      return send(res, 200, { ok: true });
    }
    throw new HttpError(405, 'Method Not Allowed');
  }

  // ---- audit (admin) ----
  if (kind === 'audit') {
    if (req.method !== 'GET') throw new HttpError(405, 'Method Not Allowed');
    if (actor.role !== 'admin') throw new HttpError(403, 'Admin only');
    const { rows } = await query(
      `SELECT id, actor_name, action, target, ip, ts
         FROM audit_logs WHERE company_id=$1 ORDER BY ts DESC LIMIT 100`,
      [actor.company_id]
    );
    return send(res, 200, { logs: rows });
  }

  // ---- telemetry feed (role-scoped) ----
  if (kind === 'telemetry') {
    if (req.method !== 'GET') throw new HttpError(405, 'Method Not Allowed');
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 50));
    let where = 't.company_id = $1';
    const params = [actor.company_id];
    if (actor.role === 'employee') {
      where += ` AND t.user_id = $${params.length + 1}`;
      params.push(actor.id);
    } else if (actor.role === 'lead') {
      where += ` AND (u.team_lead_id = $${params.length + 1} OR u.id = $${params.length + 1})`;
      params.push(actor.id);
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
  }

  throw new HttpError(400, 'Invalid kind');
});
