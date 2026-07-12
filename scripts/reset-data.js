// scripts/reset-data.js — wipe test data but KEEP company + admin accounts.
//
// Deletes every non-admin user (employees + team leads) and every project for
// the company. Foreign-key CASCADE then removes their telemetry, time entries,
// devices, activation codes, consents, and project assignments. Admin users,
// the company row, audit_logs, and productivity_rules are preserved.
//
// DESTRUCTIVE + IRREVERSIBLE. Runs only when CONFIRM=RESET is set. Point it at
// the target DB explicitly:
//
//   DATABASE_URL="<prod or test connection string>" CONFIRM=RESET node scripts/reset-data.js
//
// For Neon prod, use the same DATABASE_URL you set in Vercel (it needs SSL; do
// NOT set PGSSL=disable for Neon).
import { query } from '../lib/db.js';

async function main() {
  if (process.env.CONFIRM !== 'RESET') {
    console.error('Refusing to run. Re-run with CONFIRM=RESET to confirm you want to DELETE all');
    console.error('non-admin users and all projects (cascades telemetry/time/devices/consents).');
    process.exit(1);
  }

  const before = await query(
    `SELECT
       (SELECT count(*) FROM users WHERE role <> 'admin')::int AS non_admin_users,
       (SELECT count(*) FROM users WHERE role = 'admin')::int  AS admins,
       (SELECT count(*) FROM projects)::int                    AS projects,
       (SELECT count(*) FROM telemetry_logs)::int              AS telemetry,
       (SELECT count(*) FROM time_entries)::int                AS time_entries`
  );
  console.log('Before:', before.rows[0]);

  // Projects first (time_entries.project_id is ON DELETE SET NULL, but we delete
  // the entries via the user cascade anyway). Then non-admin users → cascade.
  const p = await query(`DELETE FROM projects`);
  const u = await query(`DELETE FROM users WHERE role <> 'admin'`);
  console.log(`Deleted ${p.rowCount} project(s) and ${u.rowCount} non-admin user(s).`);

  const after = await query(
    `SELECT
       (SELECT count(*) FROM users)::int          AS users_left,
       (SELECT count(*) FROM projects)::int        AS projects_left,
       (SELECT count(*) FROM telemetry_logs)::int  AS telemetry_left,
       (SELECT count(*) FROM time_entries)::int    AS time_entries_left,
       (SELECT count(*) FROM devices)::int         AS devices_left`
  );
  console.log('After:', after.rows[0]);
  console.log('Done. Admin account(s) + company preserved.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
