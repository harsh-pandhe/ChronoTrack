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
            COALESCE(round(avg(CASE WHEN NOT is_idle THEN focus_score END)),0)::int AS avg_focus,
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
    avg_focus: r.avg_focus,
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

// Hourly buckets for the last 24h — drives the "today / since login" timeline.
async function hourlyTrend(companyId, extra = '', params = []) {
  const { rows } = await query(
    `SELECT to_char(date_trunc('hour', ts), 'HH24:00') AS hour,
            count(*)::int AS samples,
            COALESCE(sum(CASE WHEN NOT is_idle THEN 1 ELSE 0 END),0)::int AS active_samples
       FROM telemetry_logs
      WHERE company_id=$1 AND ts > now() - interval '24 hours' ${extra}
      GROUP BY date_trunc('hour', ts) ORDER BY date_trunc('hour', ts)`,
    [companyId, ...params]
  );
  return rows.map((r) => ({
    hour: r.hour,
    active_minutes: Math.round((r.active_samples * SAMPLE_SECONDS) / 60),
    samples: r.samples,
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

// Productive / unproductive / neutral split from ai_label — the daemon already
// classifies every non-idle sample against the company's own Productivity Rules
// and stores the verdict, but nothing ever displayed it, so the whole rules
// screen had no visible effect. `extra` is scope SQL (e.g. "AND user_id=$2").
// Idle samples are excluded (they're neither productive nor unproductive).
async function productivitySplit(companyId, sinceSql, extra = '', params = []) {
  const { rows } = await query(
    `SELECT COALESCE(NULLIF(ai_label,''),'neutral') AS label, count(*)::int AS samples
       FROM telemetry_logs
      WHERE company_id=$1 AND ts > ${sinceSql} AND NOT is_idle ${extra}
      GROUP BY 1`,
    [companyId, ...params]
  );
  const out = { productive: 0, unproductive: 0, neutral: 0 };
  for (const r of rows) {
    const key = r.label === 'productive' || r.label === 'unproductive' ? r.label : 'neutral';
    out[key] += r.samples;
  }
  const total = out.productive + out.unproductive + out.neutral;
  const hrs = (n) => Math.round((n * SAMPLE_SECONDS) / 360) / 10;
  return {
    ...out,
    total,
    productive_pct: total ? Math.round((100 * out.productive) / total) : 0,
    unproductive_pct: total ? Math.round((100 * out.unproductive) / total) : 0,
    neutral_pct: total ? Math.round((100 * out.neutral) / total) : 0,
    productive_hours: hrs(out.productive),
    unproductive_hours: hrs(out.unproductive),
    neutral_hours: hrs(out.neutral),
  };
}

// Hour-of-day × weekday activity heatmap (active minutes per cell). Surfaces
// real working patterns — the daemon has logged the timestamps all along, but
// hourlyTrend only ever exposed a flat last-24h line. dow: 0=Sun..6=Sat.
async function activityHeatmap(companyId, sinceSql, extra = '', params = []) {
  const { rows } = await query(
    `SELECT EXTRACT(dow FROM ts)::int AS dow,
            EXTRACT(hour FROM ts)::int AS hour,
            COALESCE(sum(CASE WHEN NOT is_idle THEN 1 ELSE 0 END),0)::int AS active_samples
       FROM telemetry_logs
      WHERE company_id=$1 AND ts > ${sinceSql} ${extra}
      GROUP BY 1, 2`,
    [companyId, ...params]
  );
  return rows.map((r) => ({
    dow: r.dow,
    hour: r.hour,
    active_minutes: Math.round((r.active_samples * SAMPLE_SECONDS) / 60),
  }));
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
      WHERE p.company_id=$1 AND p.status <> 'archived'
      GROUP BY p.id, p.name, p.billed_revenue
      ORDER BY p.created_at DESC`,
    [companyId]
  );
  return rows.map((p) => ({
    ...p,
    roi: p.cost > 0 ? Math.round(((p.revenue - p.cost) / p.cost) * 10) / 10 : null,
  }));
}

// Contiguous runs of tracked activity for a single day. A gap larger than
// BLOCK_GAP_SECONDS between samples starts a new block, so a lunch break or an
// afternoon away splits the day into the real "active blocks" an employee then
// allocates to projects. seconds = samples * 10 to match active-hours math.
const BLOCK_GAP_SECONDS = 120;
// fromTs/toTs are explicit ISO instants (half-open range), not a bare calendar
// date -- the caller (browser) computes local-midnight boundaries and converts
// to UTC itself. Comparing on a server-side ::date used to silently disagree
// with whatever the employee's local "today" was (Vercel runs in UTC), so
// entries logged near local midnight could land outside the day being viewed.
async function timelineBlocks(companyId, userId, fromTs, toTs) {
  const { rows } = await query(
    `WITH s AS (
        SELECT ts, app_category, input_density, LAG(ts) OVER (ORDER BY ts) AS prev_ts
          FROM telemetry_logs
         WHERE company_id=$1 AND user_id=$2 AND NOT is_idle AND ts >= $3 AND ts < $4
     ), grp AS (
        SELECT ts, app_category, input_density,
               SUM(CASE WHEN prev_ts IS NULL OR ts - prev_ts > interval '${BLOCK_GAP_SECONDS} seconds'
                        THEN 1 ELSE 0 END) OVER (ORDER BY ts) AS block_id
          FROM s
     )
     SELECT min(ts) AS start_ts, max(ts) AS end_ts, count(*)::int AS samples,
            mode() WITHIN GROUP (ORDER BY app_category) AS top_category,
            round(avg(input_density))::int AS avg_density
       FROM grp GROUP BY block_id ORDER BY start_ts`,
    [companyId, userId, fromTs, toTs]
  );
  return rows.map((b) => ({
    start_ts: b.start_ts,
    end_ts: b.end_ts,
    seconds: b.samples * SAMPLE_SECONDS,
    hours: Math.round((b.samples * SAMPLE_SECONDS) / 360) / 10,
    top_category: b.top_category,
    // Not a literal keystroke/mouse count -- the daemon only ever reports a
    // single combined activity-density score per sample, never raw counts.
    // Shown to the employee as "Input Density" so the UI doesn't claim
    // precision the underlying data doesn't have.
    avg_density: b.avg_density,
  }));
}

export default handler(async (req, res) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method Not Allowed');
  const actor = await requireAuth(req);
  const url = new URL(req.url, 'http://localhost');
  const scope = url.searchParams.get('scope') || 'employee';
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days')) || 7));
  const sinceSql = `now() - interval '${days} days'`;

  // Authorize viewing another user's data (self always; lead own team; admin any).
  async function authorizeTarget(targetId) {
    if (targetId === actor.id) return;
    if (actor.role === 'employee') throw new HttpError(403, 'Forbidden');
    const { rows } = await query(
      `SELECT team_lead_id FROM users WHERE id=$1 AND company_id=$2`,
      [targetId, actor.company_id]
    );
    if (!rows[0]) throw new HttpError(404, 'User not found');
    if (actor.role === 'lead' && rows[0].team_lead_id !== actor.id)
      throw new HttpError(403, 'Not your team member');
  }

  if (scope === 'timeline') {
    const targetId = url.searchParams.get('user_id') || actor.id;
    await authorizeTarget(targetId);
    const dayParam = url.searchParams.get('day');
    const day = /^\d{4}-\d{2}-\d{2}$/.test(dayParam || '') ? dayParam : null;
    // Preferred path: the browser sends explicit UTC instants bounding ITS
    // local calendar day. Falls back to a server-side (UTC) calendar day only
    // for older callers that don't pass from/to.
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');
    const fromDate = fromParam && !isNaN(Date.parse(fromParam)) ? new Date(fromParam) : null;
    const toDate = toParam && !isNaN(Date.parse(toParam)) ? new Date(toParam) : null;
    const rangeFrom = fromDate ? fromDate.toISOString() : `${day || new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
    const rangeTo = toDate ? toDate.toISOString()
      : new Date(new Date(rangeFrom).getTime() + 24 * 3600 * 1000).toISOString();
    const [blocks, entriesQ, projQ, idleQ] = await Promise.all([
      timelineBlocks(actor.company_id, targetId, rangeFrom, rangeTo),
      query(
        `SELECT te.id, te.project_id, p.name AS project_name, te.start_ts, te.end_ts,
                te.hours, te.note
           FROM time_entries te LEFT JOIN projects p ON p.id = te.project_id
          WHERE te.company_id=$1 AND te.user_id=$2
            AND tstzrange(te.start_ts, te.end_ts) && tstzrange($3, $4)
          ORDER BY te.start_ts`,
        [actor.company_id, targetId, rangeFrom, rangeTo]
      ),
      query(
        `SELECT p.id, p.name FROM projects p
           JOIN project_assignments pa ON pa.project_id = p.id
          WHERE pa.user_id=$1 AND p.company_id=$2 AND p.status='active'
          ORDER BY p.name`,
        [targetId, actor.company_id]
      ),
      query(
        `SELECT count(*) FILTER (WHERE is_idle)::int AS idle_samples, count(*)::int AS total_samples
           FROM telemetry_logs
          WHERE company_id=$1 AND user_id=$2 AND ts >= $3 AND ts < $4`,
        [actor.company_id, targetId, rangeFrom, rangeTo]
      ),
    ]);
    const trackedHours = blocks.reduce((s, b) => s + b.hours, 0);
    const allocatedHours = entriesQ.rows.reduce((s, e) => s + Number(e.hours), 0);
    const { idle_samples, total_samples } = idleQ.rows[0] || { idle_samples: 0, total_samples: 0 };
    const idlePct = total_samples > 0 ? Math.round((idle_samples / total_samples) * 1000) / 10 : 0;
    return send(res, 200, {
      scope, user_id: targetId, day: day || new Date().toISOString().slice(0, 10),
      range: { from: rangeFrom, to: rangeTo },
      blocks, entries: entriesQ.rows, projects: projQ.rows,
      summary: {
        tracked_hours: Math.round(trackedHours * 10) / 10,
        allocated_hours: Math.round(allocatedHours * 10) / 10,
        remaining_hours: Math.round(Math.max(0, trackedHours - allocatedHours) * 10) / 10,
        idle_pct: idlePct,
      },
    });
  }

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
    const [rollup, apps, trend, hourly, productivity, heatmap] = await Promise.all([
      userRollup(actor.company_id, targetId, sinceSql),
      topApps(actor.company_id, targetId, sinceSql),
      dailyTrend(actor.company_id, sinceSql, 'AND user_id=$2', [targetId]),
      hourlyTrend(actor.company_id, 'AND user_id=$2', [targetId]),
      productivitySplit(actor.company_id, sinceSql, 'AND user_id=$2', [targetId]),
      activityHeatmap(actor.company_id, sinceSql, 'AND user_id=$2', [targetId]),
    ]);
    return send(res, 200, { scope, user_id: targetId, days, rollup, top_apps: apps, trend, hourly, productivity, heatmap });
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
    const teamParams = actor.role === 'lead' ? [actor.id] : [];
    const trend = await dailyTrend(actor.company_id, sinceSql, teamExtra, teamParams);

    // Per-employee → per-project logged hours (drill-down): "which projects did
    // X work on, and how much." Grounded in the now-validated time_entries.
    const userFilter = actor.role === 'lead'
      ? 'AND u.team_lead_id = $2'
      : `AND u.role = 'employee'`;
    const projectHours = await query(
      `SELECT te.user_id, u.name AS user_name, te.project_id, p.name AS project_name,
              SUM(te.hours)::float AS hours,
              SUM(te.hours * u.hourly_cost)::float AS cost
         FROM time_entries te
         JOIN users u ON u.id = te.user_id
         LEFT JOIN projects p ON p.id = te.project_id
        WHERE te.company_id = $1 AND te.start_ts > ${sinceSql} ${userFilter}
        GROUP BY te.user_id, u.name, te.project_id, p.name
        ORDER BY u.name, hours DESC`,
      [actor.company_id, ...teamParams]
    );

    // Team most-used app categories + idle rollup (the "what are they on / how
    // much bench" report leads asked for).
    const topApps = await query(
      `SELECT app_category AS category, count(*)::int AS samples
         FROM telemetry_logs
        WHERE company_id=$1 AND ts > ${sinceSql} AND NOT is_idle ${teamExtra}
        GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
      [actor.company_id, ...teamParams]
    );
    const idleRow = await query(
      `SELECT count(*)::int AS samples,
              COALESCE(sum(CASE WHEN is_idle THEN 1 ELSE 0 END),0)::int AS idle_samples
         FROM telemetry_logs
        WHERE company_id=$1 AND ts > ${sinceSql} ${teamExtra}`,
      [actor.company_id, ...teamParams]
    );
    const ir = idleRow.rows[0];
    const idle = {
      samples: ir.samples,
      idle_pct: ir.samples > 0 ? Math.round((100 * ir.idle_samples) / ir.samples) : 0,
      idle_hours: Math.round((ir.idle_samples * SAMPLE_SECONDS) / 360) / 10,
    };
    const [productivity, heatmap] = await Promise.all([
      productivitySplit(actor.company_id, sinceSql, teamExtra, teamParams),
      activityHeatmap(actor.company_id, sinceSql, teamExtra, teamParams),
    ]);
    return send(res, 200, {
      scope, days, members: list, trend,
      project_hours: projectHours.rows, top_apps: topApps.rows, idle,
      productivity, heatmap,
    });
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
    // null (not 0 or 100) when no hours have been logged yet — (revenue-0)/revenue
    // is trivially 100% and would misleadingly read as "verified 100% margin"
    // before any real cost data exists.
    const margin = totalCost > 0 && totalRevenue > 0
      ? Math.round((100 * (totalRevenue - totalCost)) / totalRevenue)
      : null;
    const t = tele[0];
    const activePct = t.samples > 0 ? Math.round((100 * t.active_samples) / t.samples) : 0;
    const [trend, catRows, leadRows] = await Promise.all([
      dailyTrend(actor.company_id, sinceSql),
      query(`SELECT app_category AS category, count(*)::int AS samples
               FROM telemetry_logs WHERE company_id=$1 AND ts > ${sinceSql} AND NOT is_idle
               GROUP BY 1 ORDER BY 2 DESC LIMIT 8`, [actor.company_id]),
      // Per-lead cross-tab: which lead runs how many projects, how many people,
      // how much revenue/cost/return. Correlated scalar subqueries avoid the
      // projects×employees join fan-out that would inflate the sums.
      query(
        `SELECT l.id AS lead_id, l.name AS lead_name,
           (SELECT count(*) FROM projects p
              WHERE p.team_lead_id = l.id AND p.company_id = $1)::int AS projects,
           (SELECT count(*) FROM users e
              WHERE e.team_lead_id = l.id AND e.role = 'employee')::int AS employees,
           (SELECT COALESCE(sum(p.billed_revenue),0) FROM projects p
              WHERE p.team_lead_id = l.id AND p.company_id = $1)::float AS revenue,
           (SELECT COALESCE(sum(te.hours * u.hourly_cost),0)
              FROM projects p
              JOIN time_entries te ON te.project_id = p.id
              JOIN users u ON u.id = te.user_id
             WHERE p.team_lead_id = l.id AND p.company_id = $1)::float AS cost
         FROM users l
        WHERE l.company_id = $1 AND l.role = 'lead'
        ORDER BY l.name`,
        [actor.company_id]
      ),
    ]);
    const leads = leadRows.rows.map((r) => ({
      ...r,
      roi: r.cost > 0 ? Math.round(((r.revenue - r.cost) / r.cost) * 10) / 10 : null,
    }));
    const [productivity, heatmap] = await Promise.all([
      productivitySplit(actor.company_id, sinceSql),
      activityHeatmap(actor.company_id, sinceSql), // company-wide — was missing, so the admin heatmap always read empty
    ]);
    return send(res, 200, {
      scope, days,
      headcount: hc[0],
      portfolio: { revenue: totalRevenue, cost: totalCost, margin_pct: margin, bench_pct: 100 - activePct },
      projects,
      leads,
      telemetry: { samples: t.samples, active_pct: activePct, active_hours: activeHours(t.samples, t.active_samples) },
      trend,
      categories: catRows.rows,
      productivity,
      heatmap,
    });
  }

  throw new HttpError(400, 'Invalid scope');
});
