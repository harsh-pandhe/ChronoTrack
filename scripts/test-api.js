// scripts/test-api.js — end-to-end integration test of the Phase 1 backend.
// Boots an in-process HTTP server wired to the real api/* handlers and the real
// (ephemeral) Postgres, then drives the full IRL loop. Run: node scripts/test-api.js
import http from 'http';
import { query } from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';

import login from '../api/auth/login.js';
import me from '../api/auth/me.js';
import usersIndex from '../api/users/index.js';
import userById from '../api/users/[id].js';
import projectsIndex from '../api/projects/index.js';
import projectById from '../api/projects/[id].js';
import activation from '../api/activation.js';
import ingest from '../api/ingest.js';
import timeEntries from '../api/time-entries.js';
import consent from '../api/consent.js';
import analytics from '../api/analytics.js';
import reports from '../api/reports.js';

// --- tiny router matching Vercel's file layout ---------------------------
const routes = [
  [/^\/api\/auth\/login$/, login],
  [/^\/api\/auth\/me$/, me],
  [/^\/api\/users$/, usersIndex],
  [/^\/api\/users\/([^/]+)$/, userById, 'id'],
  [/^\/api\/projects$/, projectsIndex],
  [/^\/api\/projects\/([^/]+)$/, projectById, 'id'],
  [/^\/api\/activation$/, activation],
  [/^\/api\/ingest$/, ingest],
  [/^\/api\/time-entries$/, timeEntries],
  [/^\/api\/consent$/, consent],
  [/^\/api\/analytics$/, analytics],
  [/^\/api\/reports$/, reports],
];

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  for (const [re, fn, param] of routes) {
    const m = url.pathname.match(re);
    if (m) {
      req.query = {};
      if (param) req.query[param] = m[1];
      return fn(req, res);
    }
  }
  res.statusCode = 404;
  res.end('{"error":"not found"}');
});

// --- test helpers --------------------------------------------------------
let base;
let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.error(`  ✗ ${label}`); }
}
async function call(method, path, { token, body } = {}) {
  const r = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await r.json(); } catch { /* empty */ }
  return { status: r.status, json };
}

async function resetSchema() {
  // Clean slate for repeatable runs.
  await query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const migDir = path.join(dir, '..', 'deployment', 'migrations');
  for (const f of fs.readdirSync(migDir).filter((x) => x.endsWith('.sql')).sort()) {
    await query(fs.readFileSync(path.join(migDir, f), 'utf8'));
  }
}

async function main() {
  await resetSchema();

  // Seed company + admin directly.
  const { rows: [co] } = await query(`INSERT INTO companies (name) VALUES ('Civil Mantra') RETURNING id`);
  const adminHash = await hashPassword('admin-strong-pass');
  await query(
    `INSERT INTO users (company_id, name, email, password_hash, role, status)
     VALUES ($1,'Admin','admin@cm.com',$2,'admin','active')`,
    [co.id, adminHash]
  );

  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
  console.log('Backend integration test\n');

  // 1. Auth
  let r = await call('POST', '/api/auth/login', { body: { email: 'admin@cm.com', password: 'wrong' } });
  ok(r.status === 401, 'login rejects wrong password');
  r = await call('POST', '/api/auth/login', { body: { email: 'admin@cm.com', password: 'admin-strong-pass' } });
  ok(r.status === 200 && r.json.token, 'admin logs in');
  const adminToken = r.json.token;

  r = await call('GET', '/api/auth/me', { token: adminToken });
  ok(r.status === 200 && r.json.user.role === 'admin', 'me returns admin');
  r = await call('GET', '/api/auth/me');
  ok(r.status === 401, 'me rejects no token');

  // 2. Admin creates a lead
  r = await call('POST', '/api/users', { token: adminToken, body: { name: 'Lead One', email: 'lead@cm.com', role: 'lead', password: 'lead-strong-pass' } });
  ok(r.status === 201 && r.json.user.role === 'lead', 'admin creates lead');
  const leadId = r.json.user.id;

  // 3. Grant authority, then lead logs in
  r = await call('PATCH', `/api/users/${leadId}`, { token: adminToken, body: { can_manage_employees: true } });
  ok(r.status === 200 && r.json.user.can_manage_employees === true, 'admin grants manage authority');
  r = await call('POST', '/api/auth/login', { body: { email: 'lead@cm.com', password: 'lead-strong-pass' } });
  const leadToken = r.json.token;
  ok(!!leadToken, 'lead logs in');

  // 4. Lead creates an employee (no password yet → invited)
  r = await call('POST', '/api/users', { token: leadToken, body: { name: 'Emp One', email: 'emp@cm.com', role: 'employee', hourly_cost: 500 } });
  ok(r.status === 201 && r.json.user.status === 'invited', 'lead creates employee');
  const empId = r.json.user.id;

  // 4b. Lead cannot create another lead (authority boundary)
  r = await call('POST', '/api/users', { token: leadToken, body: { name: 'X', email: 'x@cm.com', role: 'lead' } });
  ok(r.status === 403, 'lead cannot create a lead');

  // 5. Lead generates activation code for the employee
  r = await call('POST', '/api/activation?action=generate', { token: leadToken, body: { user_id: empId } });
  ok(r.status === 201 && /^\d{8}$/.test(r.json.code), 'lead generates 8-digit code');
  const code = r.json.code;

  // 6. Desktop activation requires consent + valid code
  r = await call('POST', '/api/activation?action=verify', { body: { email: 'emp@cm.com', code, consent: false } });
  ok(r.status === 400, 'activation rejected without consent (DPDP)');
  r = await call('POST', '/api/activation?action=verify', { body: { email: 'emp@cm.com', code: '00000000', consent: true } });
  ok(r.status === 401, 'activation rejects wrong code');
  r = await call('POST', '/api/activation?action=verify', { body: { email: 'emp@cm.com', code, consent: true, platform: 'linux', hostname: 'ws-01' } });
  ok(r.status === 200 && r.json.device_token && r.json.user_token, 'activation issues device + user token');
  const deviceToken = r.json.device_token;
  const empToken = r.json.user_token;

  // 6b. Code is single-use
  r = await call('POST', '/api/activation?action=verify', { body: { email: 'emp@cm.com', code, consent: true } });
  ok(r.status === 409, 'activation code is single-use');

  // 7. Daemon ingests telemetry with the device token
  r = await call('POST', '/api/ingest', { body: { samples: [] } }); // no token
  ok(r.status === 401, 'ingest rejects no device token');
  const samples = Array.from({ length: 3 }, (_, k) => ({
    ts: new Date(Date.now() - k * 60000).toISOString(),
    window_title: 'AutoCAD - Bridge.dwg', app_category: 'design',
    input_density: 120, focus_score: 88, is_idle: false, ai_label: 'productive',
  }));
  r = await call('POST', '/api/ingest', { token: deviceToken, body: { samples } });
  ok(r.status === 200 && r.json.accepted === 3, 'daemon ingests telemetry batch');

  // 8. Lead creates a project; employee logs time against it
  r = await call('POST', '/api/projects', { token: leadToken, body: { name: 'Bridge Design', billed_revenue: 100000 } });
  ok(r.status === 201, 'lead creates project');
  const projectId = r.json.project.id;

  const now = Date.now();
  // 8a. Integrity: cannot log against a project you are not assigned to.
  r = await call('POST', '/api/time-entries', { token: empToken, body: {
    project_id: projectId, start_ts: new Date(now - 2 * 3600000).toISOString(), end_ts: new Date(now).toISOString() } });
  ok(r.status === 403, 'time entry rejected when employee not assigned to project');

  // 8b. Assign the employee, then the same entry succeeds.
  r = await call('POST', `/api/projects/${projectId}?action=assign`, { token: leadToken, body: { user_id: empId } });
  ok(r.status === 201, 'lead assigns employee to their project');
  r = await call('POST', '/api/time-entries', { token: empToken, body: {
    project_id: projectId, start_ts: new Date(now - 2 * 3600000).toISOString(), end_ts: new Date(now).toISOString() } });
  ok(r.status === 201 && Number(r.json.entry.hours) === 2, 'employee logs 2h time entry');

  // 8c. Overlap rejection — a window intersecting the one just logged.
  r = await call('POST', '/api/time-entries', { token: empToken, body: {
    project_id: projectId, start_ts: new Date(now - 3600000).toISOString(), end_ts: new Date(now + 3600000).toISOString() } });
  ok(r.status === 409, 'overlapping time entry rejected');

  // 8d. Daily ceiling — a non-overlapping same-day window whose hours blow past
  // the allocatable ceiling (floor 8h; only ~30s tracked) is rejected.
  r = await call('POST', '/api/time-entries', { token: empToken, body: {
    project_id: projectId,
    start_ts: new Date(now - 20 * 3600000).toISOString(),
    end_ts: new Date(now - 3 * 3600000).toISOString() } });
  ok(r.status === 422, 'over-ceiling time entry rejected (17h with no tracked activity)');

  // 8e. Assignments listing reflects the assignment.
  r = await call('GET', `/api/projects/${projectId}?action=assignments`, { token: leadToken });
  ok(r.status === 200 && r.json.assignments.some((a) => a.id === empId), 'project assignments list includes employee');

  // 8f. Cross-lead: the same employee (reports to lead1) can be assigned to a
  // DIFFERENT lead's project — one employee, many projects, many leads.
  r = await call('POST', '/api/users', { token: adminToken, body: {
    name: 'Lead Two', email: `lead2-${Date.now()}@cm.com`, role: 'lead' } });
  const lead2Id = r.json.user.id;
  r = await call('POST', '/api/projects', { token: adminToken, body: {
    name: `Tunnel ${Date.now()}`, team_lead_id: lead2Id, billed_revenue: 50000 } });
  const project2Id = r.json.project.id;
  r = await call('POST', `/api/projects/${project2Id}?action=assign`, { token: adminToken, body: { user_id: empId } });
  ok(r.status === 201, "admin assigns employee to a different lead's project (cross-lead)");
  // A lead may not touch another lead's project.
  r = await call('POST', `/api/projects/${project2Id}?action=assign`, { token: leadToken, body: { user_id: empId } });
  ok(r.status === 403, "lead cannot assign to another lead's project");

  // 8g. Timeline scope: tracked active blocks + allocated entries + assigned projects.
  r = await call('GET', '/api/analytics?scope=timeline', { token: empToken });
  ok(r.status === 200 && Array.isArray(r.json.blocks) && r.json.blocks.length >= 1,
    'timeline returns tracked active blocks');
  ok(r.json.entries.some((e) => e.project_id === projectId) && r.json.summary.allocated_hours === 2,
    'timeline reflects the 2h allocation');
  ok(r.json.projects.some((p) => p.id === projectId),
    'timeline lists the employee\'s assigned projects');

  // 9. ROI computed: cost = 2h * 500 = 1000; revenue 100000 → roi = 99
  r = await call('GET', '/api/projects', { token: leadToken });
  const proj = r.json.projects.find((p) => p.id === projectId);
  ok(proj && Number(proj.cost) === 1000, 'project cost derived from time × hourly_cost');
  ok(proj && Math.round(proj.roi) === 99, 'project ROI computed correctly');

  // 9b. Assigning active_project_id at creation must populate project_assignments
  // (regression: this used to be silently dropped, leaving every employee's
  // "what project were you working on" pick-list permanently empty).
  r = await call('POST', '/api/users', { token: leadToken, body: {
    name: 'Assigned Emp', email: `assigned-${Date.now()}@cm.com`, role: 'employee', active_project_id: projectId } });
  ok(r.status === 201, 'lead creates employee with active_project_id');
  let { rows: assignRows } = await query(
    `SELECT 1 FROM project_assignments WHERE project_id = $1 AND user_id = $2`,
    [projectId, r.json.user.id]
  );
  ok(assignRows.length === 1, 'active_project_id at creation populates project_assignments');

  // 9c. Same check via PATCH (admin/lead assigns a project after the fact).
  r = await call('POST', '/api/users', { token: leadToken, body: {
    name: 'Assigned Later Emp', email: `assigned-later-${Date.now()}@cm.com`, role: 'employee' } });
  const laterEmpId = r.json.user.id;
  r = await call('PATCH', `/api/users/${laterEmpId}`, { token: leadToken, body: { active_project_id: projectId } });
  ok(r.status === 200, 'lead assigns project to existing employee via PATCH');
  ({ rows: assignRows } = await query(
    `SELECT 1 FROM project_assignments WHERE project_id = $1 AND user_id = $2`,
    [projectId, laterEmpId]
  ));
  ok(assignRows.length === 1, 'PATCH active_project_id also populates project_assignments');

  // 10. Consent withdrawal stops collection (DPDP)
  r = await call('DELETE', '/api/consent', { token: empToken });
  ok(r.status === 200, 'employee withdraws consent');
  r = await call('POST', '/api/ingest', { token: deviceToken, body: { samples } });
  ok(r.status === 403, 'ingest blocked after consent withdrawal (device revoked)');

  // 11. Tenant/role isolation: employee cannot list users
  r = await call('GET', '/api/users', { token: empToken });
  ok(r.status === 403, 'employee cannot list users');

  // 12. Analytics from REAL telemetry + time_entries
  r = await call('GET', '/api/analytics?scope=overview&days=7', { token: adminToken });
  ok(r.status === 200 && r.json.telemetry.samples === 3, 'admin overview reads real telemetry (3 samples)');
  ok(r.json.projects.some((p) => p.id === projectId && Math.round(p.roi) === 99), 'overview project ROI real');

  r = await call('GET', '/api/analytics?scope=team&days=7', { token: leadToken });
  ok(r.status === 200 && r.json.members.some((m) => m.id === empId && m.active_pct === 100),
     'lead team analytics shows employee active%');

  r = await call('GET', `/api/analytics?scope=employee&user_id=${empId}&days=7`, { token: leadToken });
  ok(r.status === 200 && r.json.rollup.samples === 3, 'lead sees own member employee analytics');

  r = await call('GET', '/api/analytics?scope=employee', { token: empToken });
  ok(r.status === 200 && r.json.rollup.samples === 3, 'employee sees own analytics');

  r = await call('GET', '/api/analytics?scope=overview', { token: leadToken });
  ok(r.status === 403, 'lead cannot access admin overview');

  // 13. Time-series + categories for charts
  r = await call('GET', '/api/analytics?scope=overview&days=7', { token: adminToken });
  ok(Array.isArray(r.json.trend) && r.json.trend.length >= 1 && r.json.trend[0].active_hours >= 0,
     'overview returns daily trend for charts');
  ok(Array.isArray(r.json.categories) && r.json.categories.length >= 1, 'overview returns category breakdown');
  r = await call('GET', `/api/analytics?scope=employee&user_id=${empId}`, { token: adminToken });
  ok(Array.isArray(r.json.trend), 'employee analytics returns trend');

  // 14. Productivity rules (admin only)
  r = await call('POST', '/api/reports?kind=rules', { token: adminToken, body: { keyword: 'AutoCAD', category: 'whitelist' } });
  ok(r.status === 201 && r.json.rule.keyword === 'autocad', 'admin adds whitelist rule (lowercased)');
  const ruleId = r.json.rule.id;
  r = await call('POST', '/api/reports?kind=rules', { token: leadToken, body: { keyword: 'x', category: 'blacklist' } });
  ok(r.status === 403, 'non-admin cannot add rule');
  r = await call('GET', '/api/reports?kind=rules', { token: adminToken });
  ok(r.json.rules.some((x) => x.keyword === 'autocad'), 'rules list returns added rule');
  r = await call('DELETE', `/api/reports?kind=rules&id=${ruleId}`, { token: adminToken });
  ok(r.status === 200, 'admin deletes rule');

  // 15. Audit log + telemetry feed
  r = await call('GET', '/api/reports?kind=audit', { token: adminToken });
  ok(r.status === 200 && Array.isArray(r.json.logs) && r.json.logs.length > 0, 'admin audit-logs returns real entries');
  r = await call('GET', '/api/reports?kind=audit', { token: leadToken });
  ok(r.status === 403, 'non-admin cannot read audit-logs');
  r = await call('GET', '/api/reports?kind=telemetry&limit=10', { token: adminToken });
  ok(r.status === 200 && Array.isArray(r.json.feed) && r.json.feed.length === 3, 'admin telemetry-feed returns real rows');
  r = await call('GET', '/api/reports?kind=telemetry', { token: empToken });
  ok(r.status === 200 && r.json.feed.every((x) => x.employee === 'Emp One'), 'employee feed scoped to self');

  // 15b. DPDP data rights: export / purge / retention
  r = await call('GET', `/api/reports?kind=export&user_id=${empId}`, { token: adminToken });
  ok(r.status === 200 && Array.isArray(r.json.telemetry) && r.json.user.email === 'emp@cm.com', 'admin exports user data (DPDP)');
  r = await call('GET', '/api/reports?kind=export', { token: empToken });
  ok(r.status === 200 && r.json.user.email === 'emp@cm.com', 'employee exports own data');
  r = await call('DELETE', `/api/reports?kind=purge&user_id=${empId}`, { token: leadToken });
  ok(r.status === 403, 'non-admin cannot purge');
  r = await call('DELETE', `/api/reports?kind=purge&user_id=${empId}`, { token: adminToken });
  ok(r.status === 200 && r.json.telemetry_deleted === 3, 'admin purges user telemetry (erasure)');
  r = await call('POST', '/api/reports?kind=retention', { token: adminToken, body: { days: 365 } });
  ok(r.status === 200 && typeof r.json.deleted === 'number', 'admin runs retention prune');

  // 15c. Hard delete a user (permanent, cascades)
  r = await call('POST', '/api/users', { token: adminToken, body: { name: 'Del Me', email: 'delme@cm.com', role: 'employee' } });
  const delId = r.json.user.id;
  r = await call('DELETE', `/api/users/${delId}?hard=1`, { token: adminToken });
  ok(r.status === 200 && r.json.deleted === true, 'admin hard-deletes user');
  r = await call('GET', '/api/users', { token: adminToken });
  ok(!r.json.users.some((u) => u.id === delId), 'deleted user removed from directory');

  // 16. Self profile + password change (auth/me PATCH)
  r = await call('POST', '/api/users', { token: adminToken, body: { name: 'Lead Two', email: 'lead2@cm.com', role: 'lead', password: 'lead2-strong-pass', can_manage_employees: true } });
  ok(r.status === 201 && r.json.user.can_manage_employees === true, 'admin creates lead WITH authority in one call');
  let l2 = (await call('POST', '/api/auth/login', { body: { email: 'lead2@cm.com', password: 'lead2-strong-pass' } })).json.token;
  r = await call('PATCH', '/api/auth/me', { token: l2, body: { current_password: 'wrong', new_password: 'changed-pass-1' } });
  ok(r.status === 401, 'password change rejects wrong current password');
  r = await call('PATCH', '/api/auth/me', { token: l2, body: { current_password: 'lead2-strong-pass', new_password: 'changed-pass-1' } });
  ok(r.status === 200, 'password change succeeds with correct current');
  r = await call('POST', '/api/auth/login', { body: { email: 'lead2@cm.com', password: 'changed-pass-1' } });
  ok(r.status === 200 && r.json.token, 'login works with new password');
  r = await call('POST', '/api/auth/login', { body: { email: 'lead2@cm.com', password: 'lead2-strong-pass' } });
  ok(r.status === 401, 'old password no longer works');

  console.log(`\n${passed} passed, ${failed} failed`);
  server.close();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
