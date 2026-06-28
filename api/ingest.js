// POST /api/ingest — daemon pushes a batch of telemetry samples.
// Auth: device bearer token (hashed match against devices table). Revocable.
import { handler, readBody, send, HttpError } from '../lib/http.js';
import { rateLimitKey } from '../lib/ratelimit.js';
import { query } from '../lib/db.js';
import { sha256 } from '../lib/auth.js';

const MAX_BATCH = 500; // backpressure cap

async function authDevice(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new HttpError(401, 'Missing device token');
  const { rows: [device] } = await query(
    `SELECT id, company_id, user_id, revoked FROM devices WHERE device_token_hash = $1`,
    [sha256(token)]
  );
  if (!device) throw new HttpError(401, 'Unknown device');
  if (device.revoked) throw new HttpError(403, 'Device revoked');
  return device;
}

export default handler(async (req, res) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method Not Allowed');
  const device = await authDevice(req);
  // Abuse/backpressure guard PER DEVICE (not IP — many agents share an office
  // NAT IP). 30 batches/min/device is generous (real daemon syncs every 30s).
  rateLimitKey(`ingest:${device.id}`, 30, 60_000);
  const body = await readBody(req);
  const samples = Array.isArray(body.samples) ? body.samples : [];
  if (samples.length === 0) return send(res, 200, { accepted: 0 });
  if (samples.length > MAX_BATCH)
    throw new HttpError(413, `Batch too large (max ${MAX_BATCH})`);

  // Build a single multi-row insert. company_id/user_id come from the device,
  // never from the client payload (prevents cross-tenant injection).
  const values = [];
  const params = [];
  let i = 1;
  for (const s of samples) {
    values.push(
      `($${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++})`
    );
    params.push(
      device.company_id, device.user_id, device.id,
      s.ts || new Date().toISOString(),
      s.window_title ?? null, s.app_category ?? null,
      Number(s.input_density) || 0, Number(s.focus_score) || 0,
      Boolean(s.is_idle), s.ai_label ?? null, Boolean(s.anomaly_flag)
    );
  }

  await query(
    `INSERT INTO telemetry_logs
       (company_id, user_id, device_id, ts, window_title, app_category,
        input_density, focus_score, is_idle, ai_label, anomaly_flag)
     VALUES ${values.join(',')}`,
    params
  );
  await query(`UPDATE devices SET last_seen = now() WHERE id = $1`, [device.id]);

  // Return the company's productivity rules so the daemon classifies
  // productive/unproductive from admin-defined keywords (not just built-ins).
  const { rows: ruleRows } = await query(
    `SELECT keyword, category FROM productivity_rules WHERE company_id = $1`,
    [device.company_id]
  );
  const rules = { whitelist: [], blacklist: [] };
  for (const r of ruleRows) rules[r.category]?.push(r.keyword);

  return send(res, 200, { accepted: samples.length, rules });
});
