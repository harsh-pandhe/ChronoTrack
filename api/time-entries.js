// /api/time-entries — GET (own/role-scoped) | POST (employee logs project time).
// Source of the "what project were you working on?" prompt → ROI attribution.
import { handler, requireAuth, readBody, send, HttpError } from '../lib/http.js';
import { query } from '../lib/db.js';

export default handler(async (req, res) => {
  const actor = await requireAuth(req);

  if (req.method === 'POST') {
    const b = await readBody(req);
    if (!b.project_id || !b.start_ts || !b.end_ts)
      throw new HttpError(400, 'Missing project_id, start_ts or end_ts');
    const start = new Date(b.start_ts);
    const end = new Date(b.end_ts);
    const hours = b.hours != null ? Number(b.hours) : (end - start) / 3_600_000;
    if (!(hours > 0)) throw new HttpError(400, 'Invalid time range');

    // Project must belong to the caller's company.
    const { rows: [proj] } = await query(
      `SELECT id FROM projects WHERE id = $1 AND company_id = $2`,
      [b.project_id, actor.company_id]
    );
    if (!proj) throw new HttpError(404, 'Project not found');

    const { rows: [entry] } = await query(
      `INSERT INTO time_entries (company_id, user_id, project_id, start_ts, end_ts, hours, source, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [actor.company_id, actor.id, b.project_id, start.toISOString(), end.toISOString(),
       hours, b.source === 'manual' ? 'manual' : 'prompt', b.note || null]
    );
    return send(res, 201, { entry });
  }

  if (req.method === 'GET') {
    // Employees see own; leads see their team's; admin sees all.
    let rows;
    if (actor.role === 'employee') {
      ({ rows } = await query(
        `SELECT * FROM time_entries WHERE company_id=$1 AND user_id=$2 ORDER BY start_ts DESC LIMIT 500`,
        [actor.company_id, actor.id]
      ));
    } else if (actor.role === 'lead') {
      ({ rows } = await query(
        `SELECT te.* FROM time_entries te JOIN users u ON u.id = te.user_id
          WHERE te.company_id=$1 AND (u.team_lead_id=$2 OR u.id=$2)
          ORDER BY te.start_ts DESC LIMIT 1000`,
        [actor.company_id, actor.id]
      ));
    } else {
      ({ rows } = await query(
        `SELECT * FROM time_entries WHERE company_id=$1 ORDER BY start_ts DESC LIMIT 1000`,
        [actor.company_id]
      ));
    }
    return send(res, 200, { entries: rows });
  }

  throw new HttpError(405, 'Method Not Allowed');
});
