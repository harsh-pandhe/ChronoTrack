// scripts/serve-test-ingest.js — boots the real api/* handlers on a fixed port
// against the (ephemeral) Postgres, seeds an activated employee+device, and
// writes {base, device_token, user_id} to $CREDS_FILE. Used by the daemon E2E test.
import http from 'http';
import fs from 'fs';
import { query } from '../lib/db.js';
import { hashPassword, generateDeviceToken, sha256 } from '../lib/auth.js';
import ingest from '../api/ingest.js';
import consent from '../api/consent.js';
import login from '../api/auth/login.js';

const routes = [
  [/^\/api\/ingest$/, ingest],
  [/^\/api\/consent$/, consent],
  [/^\/api\/auth\/login$/, login],
];

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  for (const [re, fn] of routes) if (url.pathname.match(re)) return fn(req, res);
  res.statusCode = 404;
  res.end('{"error":"not found"}');
});

async function seed() {
  await query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
  const sql = fs.readFileSync(new URL('../deployment/migrations/001_init.sql', import.meta.url), 'utf8');
  await query(sql);
  const { rows: [co] } = await query(`INSERT INTO companies (name) VALUES ('ChronoTrack') RETURNING id`);
  const { rows: [emp] } = await query(
    `INSERT INTO users (company_id, name, email, password_hash, role, status)
     VALUES ($1,'Emp','emp@cm.com',$2,'employee','active') RETURNING id`,
    [co.id, await hashPassword('emp-strong-pass')]
  );
  const deviceToken = generateDeviceToken();
  const { rows: [dev] } = await query(
    `INSERT INTO devices (company_id, user_id, device_token_hash, platform, hostname)
     VALUES ($1,$2,$3,'linux','test-ws') RETURNING id`,
    [co.id, emp.id, sha256(deviceToken)]
  );
  return { company_id: co.id, user_id: emp.id, device_id: dev.id, device_token: deviceToken };
}

const ctx = await seed();
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
const creds = { base, ...ctx };
fs.writeFileSync(process.env.CREDS_FILE || '/tmp/ct_creds.json', JSON.stringify(creds));
console.log('READY ' + base);
// Stay up until killed by the orchestrator.
