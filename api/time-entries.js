// /api/time-entries — GET (own/role-scoped) | POST (employee logs project time).
// Source of the "what project were you working on?" prompt → ROI attribution.
//
// Integrity: a logged entry must (1) be against a project the employee is
// actually assigned to, (2) not overlap another of their entries (you can't be
// in two places at once), and (3) stay within a defensible daily ceiling grounded
// in real tracked active time. Without these the ROI cost figure — the whole
// point of the product — is trivially fabricated.
import { handler, requireAuth, readBody, send, HttpError } from '../lib/http.js';
import { query } from '../lib/db.js';

const SAMPLE_SECONDS = 10; // daemon logs one telemetry row per 10s

// Daily ceiling = max(tracked active hours + tolerance, a normal-workday floor).
// The floor keeps legitimate low-telemetry days (daemon offline, first day before
// sync) loggable up to a normal shift; anything grossly beyond real activity
// (e.g. 20h/day) is rejected. Tune via env without a redeploy of logic.
const TOLERANCE_HOURS = Number(process.env.TIME_ENTRY_DAILY_TOLERANCE_HOURS) || 1;
const MIN_DAILY_HOURS = Number(process.env.TIME_ENTRY_MIN_DAILY_HOURS) || 8;

export default handler(async (req, res) => {
  const actor = await requireAuth(req);

  if (req.method === 'POST') {
    const b = await readBody(req);
    if (!b.project_id || !b.start_ts || !b.end_ts)
      throw new HttpError(400, 'Missing project_id, start_ts or end_ts');
    const start = new Date(b.start_ts);
    const end = new Date(b.end_ts);
    if (isNaN(start) || isNaN(end)) throw new HttpError(400, 'Invalid start_ts or end_ts');
    const hours = b.hours != null ? Number(b.hours) : (end - start) / 3_600_000;
    if (!(hours > 0)) throw new HttpError(400, 'Invalid time range');
    if (hours > 24) throw new HttpError(422, 'A single entry cannot exceed 24 hours');

    // Project must belong to the caller's company.
    const { rows: [proj] } = await query(
      `SELECT id FROM projects WHERE id = $1 AND company_id = $2`,
      [b.project_id, actor.company_id]
    );
    if (!proj) throw new HttpError(404, 'Project not found');

    // (1) Assignment gate — you may only log against a project you're assigned to.
    const { rows: [assigned] } = await query(
      `SELECT 1 FROM project_assignments WHERE project_id = $1 AND user_id = $2`,
      [b.project_id, actor.id]
    );
    if (!assigned) throw new HttpError(403, 'You are not assigned to this project');

    // (2) Overlap — reject a window that intersects an existing entry of theirs.
    const { rows: [clash] } = await query(
      `SELECT id FROM time_entries
        WHERE company_id = $1 AND user_id = $2
          AND tstzrange(start_ts, end_ts) && tstzrange($3, $4) LIMIT 1`,
      [actor.company_id, actor.id, start.toISOString(), end.toISOString()]
    );
    if (clash) throw new HttpError(409, 'This overlaps time you have already logged');

    // (3) Daily ceiling grounded in tracked active time.
    const { rows: [day] } = await query(
      `SELECT
         COALESCE(sum(CASE WHEN NOT is_idle THEN 1 ELSE 0 END),0)::int AS active_samples
       FROM telemetry_logs
      WHERE company_id = $1 AND user_id = $2
        AND ts::date = ($3::timestamptz)::date`,
      [actor.company_id, actor.id, start.toISOString()]
    );
    const trackedHours = (day.active_samples * SAMPLE_SECONDS) / 3600;
    const ceiling = Math.max(trackedHours + TOLERANCE_HOURS, MIN_DAILY_HOURS);
    const { rows: [logged] } = await query(
      `SELECT COALESCE(sum(hours),0)::float AS h FROM time_entries
        WHERE company_id = $1 AND user_id = $2
          AND start_ts::date = ($3::timestamptz)::date`,
      [actor.company_id, actor.id, start.toISOString()]
    );
    if (logged.h + hours > ceiling + 1e-6)
      throw new HttpError(422,
        `That exceeds your allocatable time for the day (${ceiling.toFixed(1)}h; ` +
        `${logged.h.toFixed(1)}h already logged, ${trackedHours.toFixed(1)}h tracked active).`);

    // Snapshot the tracked active seconds within THIS entry's window (audit basis).
    const { rows: [win] } = await query(
      `SELECT COALESCE(sum(CASE WHEN NOT is_idle THEN 1 ELSE 0 END),0)::int * $5 AS secs
         FROM telemetry_logs
        WHERE company_id = $1 AND user_id = $2 AND ts >= $3 AND ts < $4`,
      [actor.company_id, actor.id, start.toISOString(), end.toISOString(), SAMPLE_SECONDS]
    );

    let entry;
    try {
      ({ rows: [entry] } = await query(
        `INSERT INTO time_entries
           (company_id, user_id, project_id, start_ts, end_ts, hours, source, note, telemetry_active_seconds)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [actor.company_id, actor.id, b.project_id, start.toISOString(), end.toISOString(),
         hours, b.source === 'manual' ? 'manual' : 'prompt', b.note || null, win.secs]
      ));
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, 'You have already logged this exact slot');
      throw err;
    }
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
