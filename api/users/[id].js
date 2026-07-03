// /api/users/:id — PATCH (update) | DELETE (disable). Authority-checked.
import { handler, requireAuth, readBody, send, HttpError } from '../../lib/http.js';
import { query } from '../../lib/db.js';
import { audit } from '../../lib/audit.js';

// Fields a caller may change.
const FIELDS = {
  name: 'name',
  hourly_cost: 'hourly_cost',
  status: 'status',
  can_manage_employees: 'can_manage_employees',
  team_lead_id: 'team_lead_id',
  active_project_id: 'active_project_id',
};

async function loadTarget(companyId, id) {
  const { rows } = await query(
    `SELECT id, company_id, role, team_lead_id FROM users WHERE id = $1 AND company_id = $2`,
    [id, companyId]
  );
  return rows[0];
}

function canMutate(actor, target) {
  if (actor.role === 'admin') return true;
  if (actor.role === 'lead' && actor.can_manage_employees)
    return target.role === 'employee' && target.team_lead_id === actor.id;
  return false;
}

export default handler(async (req, res) => {
  const actor = await requireAuth(req);
  const id = req.query?.id || req.url.split('/').pop().split('?')[0];
  const target = await loadTarget(actor.company_id, id);
  if (!target) throw new HttpError(404, 'User not found');
  if (!canMutate(actor, target)) throw new HttpError(403, 'Not authorized to modify this user');

  if (req.method === 'PATCH') {
    const body = await readBody(req);
    // can_manage_employees and team_lead_id are admin-only privileged fields.
    if ((body.can_manage_employees !== undefined || body.team_lead_id !== undefined) && actor.role !== 'admin')
      throw new HttpError(403, 'Only admin can change authority or team');

    const sets = [];
    const vals = [];
    let i = 1;
    for (const [key, col] of Object.entries(FIELDS)) {
      if (body[key] !== undefined) {
        sets.push(`${col} = $${i++}`);
        vals.push(body[key]);
      }
    }
    if (sets.length === 0) throw new HttpError(400, 'No updatable fields provided');
    sets.push(`updated_at = now()`);
    vals.push(id, actor.company_id);

    const { rows } = await query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i++} AND company_id = $${i}
       RETURNING id, name, email, role, team_lead_id, can_manage_employees, hourly_cost, status`,
      vals
    );

    // Keep project_assignments in sync so this actually shows up in the
    // employee's project pick-list (see the matching insert in POST /api/users).
    if (body.active_project_id) {
      await query(
        `INSERT INTO project_assignments (project_id, user_id) VALUES ($1, $2)
         ON CONFLICT (project_id, user_id) DO NOTHING`,
        [body.active_project_id, id]
      );
    }

    await audit(req, actor, 'update user', id);
    return send(res, 200, { user: rows[0] });
  }

  if (req.method === 'DELETE') {
    const hard = new URL(req.url, 'http://localhost').searchParams.get('hard') === '1';
    if (hard) {
      // Permanent delete — FK CASCADE removes their telemetry/time/devices/etc.
      // (employees under a deleted lead have team_lead_id set NULL by the FK).
      await query(`DELETE FROM users WHERE id = $1 AND company_id = $2`, [id, actor.company_id]);
      await audit(req, actor, 'delete user (permanent)', id);
      return send(res, 200, { ok: true, deleted: true });
    }
    // Default: soft-disable (preserves telemetry history + audit integrity).
    await query(`UPDATE users SET status = 'disabled', updated_at = now() WHERE id = $1`, [id]);
    await audit(req, actor, 'disable user', id);
    return send(res, 200, { ok: true });
  }

  throw new HttpError(405, 'Method Not Allowed');
});
