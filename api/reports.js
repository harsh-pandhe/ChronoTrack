// /api/reports?kind=rules|audit|telemetry — consolidated read/admin endpoints.
// Merged from rules/audit-logs/telemetry-feed to stay under Vercel's function cap.
//  - kind=rules:     GET list (any authed) | POST add | DELETE (admin only)
//  - kind=audit:     GET company audit trail (admin only)
//  - kind=telemetry: GET recent telemetry rows, role-scoped
import { handler, requireAuth, readBody, send, HttpError } from '../lib/http.js';
import { query } from '../lib/db.js';
import { audit } from '../lib/audit.js';

export default handler(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // Vercel Cron hits this with `Authorization: Bearer $CRON_SECRET`. Run a global
  // retention prune BEFORE requireAuth (no user session). Configure the cron in
  // vercel.json + set CRON_SECRET (Vercel injects it) and optional RETENTION_DAYS.
  const cronSecret = process.env.CRON_SECRET;
  const authz = req.headers['authorization'] || '';
  const isCron = cronSecret && (authz === `Bearer ${cronSecret}` || req.headers['x-cron-secret'] === cronSecret);
  if (isCron) {
    const days = Math.min(3650, Math.max(1, Number(process.env.RETENTION_DAYS) || 180));
    const r = await query(
      `DELETE FROM telemetry_logs WHERE ts < now() - ($1 || ' days')::interval`,
      [String(days)]
    );
    return send(res, 200, { ok: true, cron: true, deleted: r.rowCount, older_than_days: days });
  }

  const actor = await requireAuth(req);
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

  // ---- DPDP: data export (own data, or admin/lead for their scope) ----
  if (kind === 'export') {
    if (req.method !== 'GET') throw new HttpError(405, 'Method Not Allowed');
    const target = url.searchParams.get('user_id') || actor.id;
    if (target !== actor.id) {
      if (actor.role === 'employee') throw new HttpError(403, 'Forbidden');
      const { rows } = await query(`SELECT team_lead_id FROM users WHERE id=$1 AND company_id=$2`, [target, actor.company_id]);
      if (!rows[0]) throw new HttpError(404, 'User not found');
      if (actor.role === 'lead' && rows[0].team_lead_id !== actor.id) throw new HttpError(403, 'Not your team member');
    }
    const [u, tele, te, cons] = await Promise.all([
      query(`SELECT id, name, email, role, dept, title, status, created_at FROM users WHERE id=$1`, [target]),
      query(`SELECT ts, window_title, app_category, input_density, is_idle, anomaly_flag FROM telemetry_logs WHERE user_id=$1 ORDER BY ts`, [target]),
      query(`SELECT start_ts, end_ts, hours, source, note FROM time_entries WHERE user_id=$1 ORDER BY start_ts`, [target]),
      query(`SELECT consent_version, granted_at, withdrawn_at FROM consents WHERE user_id=$1 ORDER BY created_at`, [target]),
    ]);
    if (!u.rows[0]) throw new HttpError(404, 'User not found');
    return send(res, 200, {
      exported_at: new Date().toISOString(),
      user: u.rows[0], telemetry: tele.rows, time_entries: te.rows, consents: cons.rows,
    });
  }

  // ---- DPDP: right to erasure — purge a user's telemetry + time entries (admin) ----
  if (kind === 'purge') {
    if (req.method !== 'DELETE') throw new HttpError(405, 'Method Not Allowed');
    if (actor.role !== 'admin') throw new HttpError(403, 'Admin only');
    const target = url.searchParams.get('user_id');
    if (!target) throw new HttpError(400, 'Missing user_id');
    const chk = await query(`SELECT id FROM users WHERE id=$1 AND company_id=$2`, [target, actor.company_id]);
    if (!chk.rows[0]) throw new HttpError(404, 'User not found');
    const t = await query(`DELETE FROM telemetry_logs WHERE user_id=$1`, [target]);
    const e = await query(`DELETE FROM time_entries WHERE user_id=$1`, [target]);
    await audit(req, actor, 'purge user data', target);
    return send(res, 200, { ok: true, telemetry_deleted: t.rowCount, time_entries_deleted: e.rowCount });
  }

  // ---- Retention: prune telemetry older than N days (admin or cron secret) ----
  if (kind === 'retention') {
    if (req.method !== 'POST') throw new HttpError(405, 'Method Not Allowed');
    const cronOk = process.env.CRON_SECRET && req.headers['x-cron-secret'] === process.env.CRON_SECRET;
    if (!cronOk && actor.role !== 'admin') throw new HttpError(403, 'Admin only');
    const body = await readBody(req);
    const days = Math.min(3650, Math.max(1, Number(body.days) || 180));
    const r = await query(
      `DELETE FROM telemetry_logs WHERE company_id=$1 AND ts < now() - ($2 || ' days')::interval`,
      [actor.company_id, String(days)]
    );
    await audit(req, actor, `retention prune >${days}d`, String(r.rowCount));
    return send(res, 200, { ok: true, deleted: r.rowCount, older_than_days: days });
  }

  throw new HttpError(400, 'Invalid kind');
});
