// /api/projects/:id — PATCH (update) | DELETE (archive). Lead limited to own projects.
import { handler, requireAuth, readBody, send, HttpError } from '../../lib/http.js';
import { query } from '../../lib/db.js';
import { audit } from '../../lib/audit.js';

const FIELDS = {
  name: 'name', code: 'code', client: 'client', budget: 'budget',
  billed_revenue: 'billed_revenue', status: 'status',
  start_date: 'start_date', end_date: 'end_date', team_lead_id: 'team_lead_id',
};

export default handler(async (req, res) => {
  const actor = await requireAuth(req, ['admin', 'lead']);
  const url = new URL(req.url, 'http://localhost');
  const id = req.query?.id || url.pathname.split('/').pop();
  const action = url.searchParams.get('action');

  const { rows: [project] } = await query(
    `SELECT id, company_id, team_lead_id FROM projects WHERE id = $1 AND company_id = $2`,
    [id, actor.company_id]
  );
  if (!project) throw new HttpError(404, 'Project not found');
  if (actor.role === 'lead' && project.team_lead_id !== actor.id)
    throw new HttpError(403, 'Not your project');

  // --- Assignment management (multi-project) -------------------------------
  // A lead may assign ANY employee in the company to THEIR OWN project — even an
  // employee who reports to a different lead. That cross-lead assignment is the
  // requirement (one employee, many projects, many leads) and is audited.
  if (action === 'assignments' && req.method === 'GET') {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.title, u.dept, u.team_lead_id, pa.created_at AS assigned_at
         FROM project_assignments pa
         JOIN users u ON u.id = pa.user_id
        WHERE pa.project_id = $1 ORDER BY u.name`,
      [id]
    );
    return send(res, 200, { assignments: rows });
  }

  if (action === 'assign' && req.method === 'POST') {
    const b = await readBody(req);
    if (!b.user_id) throw new HttpError(400, 'Missing user_id');
    const { rows: [emp] } = await query(
      `SELECT id, role FROM users WHERE id = $1 AND company_id = $2`,
      [b.user_id, actor.company_id]
    );
    if (!emp) throw new HttpError(404, 'User not found');
    if (emp.role !== 'employee') throw new HttpError(400, 'Only employees can be assigned to projects');
    await query(
      `INSERT INTO project_assignments (project_id, user_id) VALUES ($1, $2)
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [id, b.user_id]
    );
    await audit(req, actor, 'assign employee to project', `${id}:${b.user_id}`);
    return send(res, 201, { ok: true });
  }

  if (action === 'unassign' && req.method === 'DELETE') {
    const userId = url.searchParams.get('user_id');
    if (!userId) throw new HttpError(400, 'Missing user_id');
    await query(
      `DELETE FROM project_assignments WHERE project_id = $1 AND user_id = $2`,
      [id, userId]
    );
    await audit(req, actor, 'unassign employee from project', `${id}:${userId}`);
    return send(res, 200, { ok: true });
  }

  if (req.method === 'PATCH') {
    const b = await readBody(req);
    if (b.team_lead_id !== undefined && actor.role !== 'admin')
      throw new HttpError(403, 'Only admin can reassign a project lead');
    const sets = [];
    const vals = [];
    let i = 1;
    for (const [key, col] of Object.entries(FIELDS)) {
      if (b[key] !== undefined) { sets.push(`${col} = $${i++}`); vals.push(b[key]); }
    }
    if (!sets.length) throw new HttpError(400, 'No updatable fields provided');
    sets.push('updated_at = now()');
    vals.push(id, actor.company_id);
    const { rows } = await query(
      `UPDATE projects SET ${sets.join(', ')} WHERE id = $${i++} AND company_id = $${i} RETURNING *`,
      vals
    );
    await audit(req, actor, 'update project', id);
    return send(res, 200, { project: rows[0] });
  }

  if (req.method === 'DELETE') {
    await query(`UPDATE projects SET status='archived', updated_at=now() WHERE id=$1`, [id]);
    await audit(req, actor, 'archive project', id);
    return send(res, 200, { ok: true });
  }

  throw new HttpError(405, 'Method Not Allowed');
});
