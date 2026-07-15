// /api/projects — GET (role-scoped list w/ cost & ROI) | POST (lead/admin create).
import { handler, requireAuth, readBody, send, HttpError } from '../../lib/http.js';
import { query } from '../../lib/db.js';
import { audit } from '../../lib/audit.js';

// Cost is derived live from time_entries × user.hourly_cost. ROI = (rev-cost)/cost.
const SELECT_WITH_ROI = `
  SELECT p.id, p.name, p.code, p.team_lead_id, p.client, p.budget, p.billed_revenue,
         p.status, p.start_date, p.end_date, p.created_at,
         COALESCE(c.cost, 0)        AS cost,
         COALESCE(c.total_hours, 0) AS total_hours
    FROM projects p
    LEFT JOIN (
      SELECT te.project_id,
             SUM(te.hours)               AS total_hours,
             SUM(te.hours * u.hourly_cost) AS cost
        FROM time_entries te
        JOIN users u ON u.id = te.user_id
       GROUP BY te.project_id
    ) c ON c.project_id = p.id
   WHERE p.company_id = $1`;

export default handler(async (req, res) => {
  const actor = await requireAuth(req);

  if (req.method === 'GET') {
    // Archived projects are excluded by default -- "Archive" needs to actually
    // make a project disappear from active use (dropdowns, revenue totals),
    // not just flip a status flag nobody's list ever filters on. ?status=all
    // opts back in (e.g. an admin archive-management view, if one gets built).
    const showAll = new URL(req.url, 'http://localhost').searchParams.get('status') === 'all';
    const statusFilter = showAll ? '' : `AND p.status <> 'archived'`;
    let rows;
    if (actor.role === 'admin') {
      ({ rows } = await query(`${SELECT_WITH_ROI} ${statusFilter} ORDER BY p.created_at DESC`, [actor.company_id]));
    } else if (actor.role === 'lead') {
      ({ rows } = await query(
        `${SELECT_WITH_ROI} AND p.team_lead_id = $2 ${statusFilter} ORDER BY p.created_at DESC`,
        [actor.company_id, actor.id]
      ));
    } else {
      // Employee: only projects they are assigned to.
      ({ rows } = await query(
        `${SELECT_WITH_ROI}
           AND p.id IN (SELECT project_id FROM project_assignments WHERE user_id = $2) ${statusFilter}
         ORDER BY p.created_at DESC`,
        [actor.company_id, actor.id]
      ));
    }
    const projects = rows.map((p) => ({
      ...p,
      roi: Number(p.cost) > 0 ? (Number(p.billed_revenue) - Number(p.cost)) / Number(p.cost) : null,
    }));
    return send(res, 200, { projects });
  }

  if (req.method === 'POST') {
    if (!['admin', 'lead'].includes(actor.role))
      throw new HttpError(403, 'Only admin or lead can create projects');
    const b = await readBody(req);
    if (!b.name) throw new HttpError(400, 'Missing project name');
    const name = String(b.name).trim();
    const leadId = actor.role === 'lead' ? actor.id : b.team_lead_id || null;

    // Guard against accidental duplicates (e.g. a double-click on Create) —
    // same name already exists for this company.
    const { rows: [dupe] } = await query(
      `SELECT id FROM projects WHERE company_id = $1 AND lower(name) = lower($2) LIMIT 1`,
      [actor.company_id, name]
    );
    if (dupe) throw new HttpError(409, `A project named "${name}" already exists.`);

    let project;
    try {
      ({ rows: [project] } = await query(
        `INSERT INTO projects (company_id, name, code, team_lead_id, client, budget, billed_revenue, status, start_date, end_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'active'),$9,$10)
         RETURNING *`,
        [
          actor.company_id, name, b.code || null, leadId, b.client || null,
          b.budget || 0, b.billed_revenue || 0, b.status || null, b.start_date || null, b.end_date || null,
        ]
      ));
    } catch (err) {
      // Belt-and-suspenders: the SELECT-then-INSERT check above has a race
      // window under concurrent requests; the DB-level unique index (migration
      // 005) closes it — surface that as the same clean 409, not a raw 500.
      if (err.code === '23505') throw new HttpError(409, `A project named "${name}" already exists.`);
      throw err;
    }
    await audit(req, actor, 'create project', project.id);
    return send(res, 201, { project });
  }

  throw new HttpError(405, 'Method Not Allowed');
});
