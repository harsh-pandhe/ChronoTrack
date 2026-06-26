// /api/users — GET (list, role-scoped) | POST (create lead/employee).
import { handler, requireAuth, readBody, send, HttpError } from '../../lib/http.js';
import { query } from '../../lib/db.js';
import { hashPassword } from '../../lib/auth.js';
import { audit } from '../../lib/audit.js';

export default handler(async (req, res) => {
  const actor = await requireAuth(req);

  if (req.method === 'GET') {
    // Admin sees the whole company; a lead sees only their own team (+ themselves).
    let rows;
    if (actor.role === 'admin') {
      ({ rows } = await query(
        `SELECT id, name, email, role, team_lead_id, can_manage_employees,
                hourly_cost, status, created_at
           FROM users WHERE company_id = $1 ORDER BY created_at DESC`,
        [actor.company_id]
      ));
    } else if (actor.role === 'lead') {
      ({ rows } = await query(
        `SELECT id, name, email, role, team_lead_id, can_manage_employees,
                hourly_cost, status, created_at
           FROM users
          WHERE company_id = $1 AND (team_lead_id = $2 OR id = $2)
          ORDER BY created_at DESC`,
        [actor.company_id, actor.id]
      ));
    } else {
      throw new HttpError(403, 'Employees cannot list users');
    }
    return send(res, 200, { users: rows });
  }

  if (req.method === 'POST') {
    const body = await readBody(req);
    const { name, email, role, password, hourly_cost = 0, team_lead_id } = body;
    if (!name || !email || !role) throw new HttpError(400, 'Missing name, email or role');
    if (!['lead', 'employee'].includes(role))
      throw new HttpError(400, 'role must be lead or employee');

    // Authority: admin can create anyone; a lead may create employees only,
    // inside their own team, and only if granted can_manage_employees.
    if (actor.role === 'lead') {
      if (role !== 'employee') throw new HttpError(403, 'Leads can only create employees');
      if (!actor.can_manage_employees)
        throw new HttpError(403, 'Not authorized to manage employees');
    } else if (actor.role !== 'admin') {
      throw new HttpError(403, 'Insufficient role');
    }

    // Resolve the team lead the new user belongs under.
    let leadId = null;
    if (role === 'employee') {
      leadId = actor.role === 'lead' ? actor.id : team_lead_id || null;
    }

    const password_hash = password ? await hashPassword(password) : null;
    const status = password ? 'active' : 'invited';

    let created;
    try {
      ({ rows: [created] } = await query(
        `INSERT INTO users (company_id, name, email, password_hash, role, team_lead_id, hourly_cost, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id, name, email, role, team_lead_id, hourly_cost, status, created_at`,
        [actor.company_id, name, email, password_hash, role, leadId, hourly_cost, status]
      ));
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, 'Email already exists in this company');
      throw err;
    }

    await audit(req, actor, `create ${role}`, created.id);
    return send(res, 201, { user: created });
  }

  throw new HttpError(405, 'Method Not Allowed');
});
