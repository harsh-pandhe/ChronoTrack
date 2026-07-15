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
    const cols = `id, name, email, phone, role, team_lead_id, can_manage_employees,
                  hourly_cost, status, emp_code, dept, title, base_salary,
                  benefits, active_project_id, avg_hours, created_at`;
    if (actor.role === 'admin') {
      ({ rows } = await query(
        `SELECT ${cols} FROM users WHERE company_id = $1 ORDER BY created_at DESC`,
        [actor.company_id]
      ));
    } else if (actor.role === 'lead') {
      ({ rows } = await query(
        `SELECT ${cols} FROM users
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
    const {
      name, email, role, password, team_lead_id, phone = null,
      emp_code = null, dept = null, title = null,
      base_salary = 0, benefits = 0, active_project_id = null, avg_hours = 160,
    } = body;
    if (!name || !email || !role) throw new HttpError(400, 'Missing name, email or role');
    // hourly_cost authoritative for ROI; derive from salary+benefits if not given.
    const hours = Number(avg_hours) || 160;
    const hourly_cost =
      body.hourly_cost != null
        ? Number(body.hourly_cost)
        : (Number(base_salary) + Number(benefits)) / hours;
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
    // Only admin may grant manage-authority (to a new lead).
    const canManage = actor.role === 'admin' && role === 'lead' && body.can_manage_employees === true;

    let created;
    try {
      ({ rows: [created] } = await query(
        `INSERT INTO users
           (company_id, name, email, phone, password_hash, role, team_lead_id, hourly_cost,
            status, emp_code, dept, title, base_salary, benefits, active_project_id, avg_hours,
            can_manage_employees)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING id, name, email, phone, role, team_lead_id, hourly_cost, status, emp_code,
                   dept, title, base_salary, benefits, active_project_id, avg_hours,
                   can_manage_employees, created_at`,
        [actor.company_id, name, email, phone, password_hash, role, leadId, hourly_cost, status,
         emp_code, dept, title, base_salary, benefits, active_project_id, hours, canManage]
      ));
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, 'Email already exists in this company');
      throw err;
    }

    // active_project_id is a display convenience; project_assignments is what
    // actually gates which projects this employee can log time against (see
    // GET /api/projects). Without this, every employee's "what project were
    // you working on" list is permanently empty regardless of active_project_id.
    if (active_project_id) {
      await query(
        `INSERT INTO project_assignments (project_id, user_id) VALUES ($1, $2)
         ON CONFLICT (project_id, user_id) DO NOTHING`,
        [active_project_id, created.id]
      );
    }

    await audit(req, actor, `create ${role}`, created.id);
    return send(res, 201, { user: created });
  }

  throw new HttpError(405, 'Method Not Allowed');
});
