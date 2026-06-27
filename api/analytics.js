// /api/analytics?scope=overview|team|employee&user_id=&days=
// Real analytics computed from telemetry_logs + time_entries (no prototype data).
// Role-scoped: admin=company, lead=own team, employee=self.
import { handler, requireAuth, send, HttpError } from '../lib/http.js';
import { query } from '../lib/db.js';

const SAMPLE_SECONDS = 10; // daemon logs one row per 10s

function activeHours(samples, activeSamples) {
  return Math.round((activeSamples * SAMPLE_SECONDS) / 360) / 10; // hrs, 1 dp
}

// Per-user telemetry rollup over the window.
async function userRollup(companyId, userId, sinceSql) {
  const { rows } = await query(
    `SELECT count(*)::int AS samples,
            COALESCE(sum(CASE WHEN NOT is_idle THEN 1 ELSE 0 END),0)::int AS active_samples,
            COALESCE(round(avg(input_density)),0)::int AS avg_density,
            COALESCE(sum(CASE WHEN anomaly_flag THEN 1 ELSE 0 END),0)::int AS anomalies,
            max(ts) AS last_seen
       FROM telemetry_logs
      WHERE company_id=$1 AND user_id=$2 AND ts > ${sinceSql}`,
    [companyId, userId]
  );
  const r = rows[0];
  const activePct = r.samples > 0 ? Math.round((100 * r.active_samples) / r.samples) : 0;
  return {
    samples: r.samples,
    active_samples: r.active_samples,
    active_pct: activePct,
    active_hours: activeHours(r.samples, r.active_samples),
    avg_density: r.avg_density,
    anomalies: r.anomalies,
    last_seen: r.last_seen,
  };
}

// Daily time-series for charts. scopeFilter is extra SQL (e.g. "AND user_id=$2").
async function dailyTrend(companyId, sinceSql, extra = '', params = []) {
  const { rows } = await query(
    `SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS day,
            count(*)::int AS samples,
            COALESCE(sum(CASE WHEN NOT is_idle THEN 1 ELSE 0 END),0)::int AS active_samples,
            COALESCE(round(avg(input_density)),0)::int AS avg_density
       FROM telemetry_logs
      WHERE company_id=$1 AND ts > ${sinceSql} ${extra}
      GROUP BY 1 ORDER BY 1`,
    [companyId, ...params]
  );
  return rows.map((r) => ({
    day: r.day,
    samples: r.samples,
    active_hours: Math.round((r.active_samples * SAMPLE_SECONDS) / 360) / 10,
    active_pct: r.samples > 0 ? Math.round((100 * r.active_samples) / r.samples) : 0,
    avg_density: r.avg_density,
  }));
}

async function topApps(companyId, userId, sinceSql) {
  const { rows } = await query(
    `SELECT app_category AS category, count(*)::int AS samples
       FROM telemetry_logs
      WHERE company_id=$1 AND user_id=$2 AND ts > ${sinceSql} AND NOT is_idle
      GROUP BY app_category ORDER BY samples DESC LIMIT 6`,
    [companyId, userId]
  );
  return rows;
}

// Project cost/hours/ROI from real time_entries × hourly_cost.
async function projectRoi(companyId) {
  const { rows } = await query(
    `SELECT p.id, p.name, p.billed_revenue::float AS revenue,
            COALESCE(sum(te.hours),0)::float AS hours,
            COALESCE(sum(te.hours * u.hourly_cost),0)::float AS cost
       FROM projects p
       LEFT JOIN time_entries te ON te.project_id = p.id
       LEFT JOIN users u ON u.id = te.user_id
      WHERE p.company_id=$1
      GROUP BY p.id, p.name, p.billed_revenue
      ORDER BY p.created_at DESC`,
    [companyId]
  );
  return rows.map((p) => ({
    ...p,
    roi: p.cost > 0 ? Math.round(((p.revenue - p.cost) / p.cost) * 10) / 10 : null,
  }));
}

export default handler(async (req, res) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method Not Allowed');
  const actor = await requireAuth(req);
  const url = new URL(req.url, 'http://localhost');
  const scope = url.searchParams.get('scope') || 'employee';
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days')) || 7));
  const sinceSql = `now() - interval '${days} days'`;

  if (scope === 'employee') {
    const targetId = url.searchParams.get('user_id') || actor.id;
    // Authorization: self always; lead only own team; admin anyone in company.
    if (targetId !== actor.id) {
      if (actor.role === 'employee') throw new HttpError(403, 'Forbidden');
      const { rows } = await query(
        `SELECT team_lead_id FROM users WHERE id=$1 AND company_id=$2`,
        [targetId, actor.company_id]
      );
      if (!rows[0]) throw new HttpError(404, 'User not found');
      if (actor.role === 'lead' && rows[0].team_lead_id !== actor.id)
        throw new HttpError(403, 'Not your team member');
    }
    const [rollup, apps, trend] = await Promise.all([
      userRollup(actor.company_id, targetId, sinceSql),
      topApps(actor.company_id, targetId, sinceSql),
      dailyTrend(actor.company_id, sinceSql, 'AND user_id=$2', [targetId]),
    ]);
    return send(res, 200, { scope, user_id: targetId, days, rollup, top_apps: apps, trend });
  }

  if (scope === 'team') {
    if (!['lead', 'admin'].includes(actor.role)) throw new HttpError(403, 'Forbidden');
    // Members: lead -> own team; admin -> all employees.
    const members = actor.role === 'lead'
      ? await query(
          `SELECT id, name, title, hourly_cost FROM users
            WHERE company_id=$1 AND team_lead_id=$2 AND role='employee'`,
          [actor.company_id, actor.id])
      : await query(
          `SELECT id, name, title, hourly_cost FROM users
            WHERE company_id=$1 AND role='employee'`,
          [actor.company_id]);
    const list = [];
    for (const m of members.rows) {
      const r = await userRollup(actor.company_id, m.id, sinceSql);
      list.push({ id: m.id, name: m.name, title: m.title, hourly_cost: Number(m.hourly_cost), ...r });
    }
    const teamExtra = actor.role === 'lead'
      ? 'AND user_id IN (SELECT id FROM users WHERE team_lead_id=$2)'
      : `AND user_id IN (SELECT id FROM users WHERE company_id=$1 AND role='employee')`;
    const trend = await dailyTrend(actor.company_id, sinceSql, teamExtra,
      actor.role === 'lead' ? [actor.id] : []);
    return send(res, 200, { scope, days, members: list, trend });
  }

  if (scope === 'overview') {
    if (actor.role !== 'admin') throw new HttpError(403, 'Admin only');
    const [{ rows: hc }, projects, { rows: tele }] = await Promise.all([
      query(`SELECT
               count(*) FILTER (WHERE role='employee')::int AS employees,
               count(*) FILTER (WHERE role='lead')::int AS leads,
               count(*) FILTER (WHERE role='employee' AND status='active')::int AS active_employees
             FROM users WHERE company_id=$1`, [actor.company_id]),
      projectRoi(actor.company_id),
      query(`SELECT count(*)::int AS samples,
                    COALESCE(sum(CASE WHEN NOT is_idle THEN 1 ELSE 0 END),0)::int AS active_samples
               FROM telemetry_logs WHERE company_id=$1 AND ts > ${sinceSql}`, [actor.company_id]),
    ]);
    const totalRevenue = projects.reduce((s, p) => s + p.revenue, 0);
    const totalCost = projects.reduce((s, p) => s + p.cost, 0);
    const margin = totalRevenue > 0 ? Math.round((100 * (totalRevenue - totalCost)) / totalRevenue) : 0;
    const t = tele[0];
    const activePct = t.samples > 0 ? Math.round((100 * t.active_samples) / t.samples) : 0;
    const [trend, catRows] = await Promise.all([
      dailyTrend(actor.company_id, sinceSql),
      query(`SELECT app_category AS category, count(*)::int AS samples
               FROM telemetry_logs WHERE company_id=$1 AND ts > ${sinceSql} AND NOT is_idle
               GROUP BY 1 ORDER BY 2 DESC LIMIT 8`, [actor.company_id]),
    ]);
    return send(res, 200, {
      scope, days,
      headcount: hc[0],
      portfolio: { revenue: totalRevenue, cost: totalCost, margin_pct: margin, bench_pct: 100 - activePct },
      projects,
      telemetry: { samples: t.samples, active_pct: activePct, active_hours: activeHours(t.samples, t.active_samples) },
      trend,
      categories: catRows.rows,
    });
  }

  throw new HttpError(400, 'Invalid scope');
});
