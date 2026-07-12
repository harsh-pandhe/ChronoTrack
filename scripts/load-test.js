// scripts/load-test.js — stage test for N autonomous background daemons.
// Provisions N employees, activates each (real device token), then each runs an
// autonomous loop posting telemetry batches to /api/ingest concurrently for a
// duration — simulating N real desktop agents. Reports throughput + verifies
// rows landed. Use against a LOCAL stack (not prod):
//
//   DATABASE_URL=... PGSSL=disable JWT_SECRET=... node scripts/dev-api.js &   # API
//   API_BASE=http://localhost:3031 N=25 DURATION=60 node scripts/load-test.js
import { query } from '../lib/db.js';

const API = process.env.API_BASE || 'http://localhost:3031';
const N = Number(process.env.N || 25);
const DURATION = Number(process.env.DURATION || 60); // seconds
const BATCH = Number(process.env.BATCH || 12);       // samples per post
const INTERVAL = Number(process.env.INTERVAL || 10); // seconds between posts (real daemon = ~30)

const APPS = [
  ['AutoCAD - Bridge.dwg', 'Engineering / Design'],
  ['VS Code - main.py', 'Software Development'],
  ['Excel - Costing.xlsx', 'Finance / Analysis'],
  ['Chrome - YouTube', 'Personal / Entertainment'],
  ['Slack', 'Communication'],
];

async function call(method, path, { token, body } = {}) {
  const t0 = Date.now();
  const r = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = null; try { j = await r.json(); } catch { /* */ }
  return { status: r.status, json: j, ms: Date.now() - t0 };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function sample() {
  const [w, c] = APPS[Math.floor(Math.random() * APPS.length)];
  const dens = Math.floor(Math.random() * 300);
  return {
    ts: new Date().toISOString(), window_title: w, app_category: c,
    input_density: dens, focus_score: Math.min(100, dens), is_idle: dens < 20,
    ai_label: 'normal', anomaly_flag: false,
  };
}

async function provision() {
  // First-admin must already exist (seed-admin). Log in, make a lead, N employees.
  const admin = (await call('POST', '/api/auth/login', { body: { email: process.env.ADMIN_EMAIL || 'admin@cm.com', password: process.env.ADMIN_PASSWORD || 'admin-strong-pass' } })).json.token;
  if (!admin) throw new Error('admin login failed — seed admin first');
  const lead = (await call('POST', '/api/users', { token: admin, body: { name: 'Load Lead', email: `loadlead+${Date.now()}@cm.com`, role: 'lead', password: 'lead-strong-pass' } })).json.user;
  await call('PATCH', `/api/users/${lead.id}`, { token: admin, body: { can_manage_employees: true } });
  const leadTok = (await call('POST', '/api/auth/login', { body: { email: lead.email, password: 'lead-strong-pass' } })).json.token;

  const devices = [];
  for (let i = 0; i < N; i++) {
    const email = `load${Date.now()}_${i}@cm.com`;
    const emp = (await call('POST', '/api/users', { token: leadTok, body: { name: `Load Emp ${i}`, email, role: 'employee', base_salary: 60000 } })).json.user;
    const code = (await call('POST', '/api/activation?action=generate', { token: leadTok, body: { user_id: emp.id } })).json.code;
    const act = (await call('POST', '/api/activation?action=verify', { body: { email, code, consent: true, platform: 'linux', hostname: `load-${i}` } })).json;
    devices.push(act.device_token);
  }
  return devices;
}

async function runDaemon(token, stopAt, stats) {
  // Jitter the first post so N daemons don't march in lockstep.
  await new Promise((r) => setTimeout(r, Math.random() * INTERVAL * 1000));
  while (Date.now() < stopAt) {
    const samples = Array.from({ length: BATCH }, sample);
    try {
      const r = await call('POST', '/api/ingest', { token, body: { samples } });
      stats.latencies.push(r.ms);
      if (r.status === 200) { stats.accepted += r.json.accepted; stats.posts++; }
      else if (r.status === 429) { stats.rateLimited++; }      // limiter working as designed
      else if (r.status === 503) { stats.backpressure++; }     // shed load, not an error
      else { stats.errors++; stats.lastErr = r.status; }
    } catch { stats.errors++; }
    await new Promise((r) => setTimeout(r, INTERVAL * 1000 + Math.random() * 1000));
  }
}

async function main() {
  console.log(`Load test: ${N} daemons, ${DURATION}s, batch ${BATCH} every ~${INTERVAL}s -> ${API}\n`);
  console.log('Provisioning + activating', N, 'devices…');
  const t0 = Date.now();
  const devices = await provision();
  console.log(`Activated ${devices.length} devices in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  const stats = { accepted: 0, posts: 0, errors: 0, rateLimited: 0, backpressure: 0, lastErr: null, latencies: [] };
  const stopAt = Date.now() + DURATION * 1000;
  const start = Date.now();
  await Promise.all(devices.map((tok) => runDaemon(tok, stopAt, stats)));
  const secs = (Date.now() - start) / 1000;

  const sorted = stats.latencies.slice().sort((a, b) => a - b);
  // Verify in DB
  const { rows } = await query(`SELECT count(*)::int AS n FROM telemetry_logs`);
  console.log('--- RESULTS ---');
  console.log(`daemons:          ${N}`);
  console.log(`posts ok:         ${stats.posts}   hard errors: ${stats.errors}${stats.lastErr ? ' (last ' + stats.lastErr + ')' : ''}`);
  console.log(`rate-limited 429: ${stats.rateLimited}   backpressure 503: ${stats.backpressure}  (both = guards working, not failures)`);
  console.log(`samples accepted: ${stats.accepted}`);
  console.log(`ingest rate:      ${(stats.accepted / secs).toFixed(1)} samples/s over ${secs.toFixed(0)}s`);
  console.log(`latency ms:       p50 ${percentile(sorted, 50)}  p95 ${percentile(sorted, 95)}  p99 ${percentile(sorted, 99)}  max ${sorted[sorted.length - 1] || 0}`);
  console.log(`telemetry_logs in DB: ${rows[0].n}`);
  // Only hard errors (5xx that isn't backpressure, connection failures) fail the
  // run. 429/503 are the system correctly protecting itself under load.
  console.log(stats.errors === 0 ? '\nPASS: no hard ingest errors under load.' : `\nFAIL: ${stats.errors} hard errors.`);
  process.exit(stats.errors === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
