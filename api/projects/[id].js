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
  const id = req.query?.id || req.url.split('/').pop().split('?')[0];

  const { rows: [project] } = await query(
    `SELECT id, company_id, team_lead_id FROM projects WHERE id = $1 AND company_id = $2`,
    [id, actor.company_id]
  );
  if (!project) throw new HttpError(404, 'Project not found');
  if (actor.role === 'lead' && project.team_lead_id !== actor.id)
    throw new HttpError(403, 'Not your project');

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
