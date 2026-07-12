// /api/consent — GET (current status) | DELETE (withdraw).
// DPDP: withdrawal must be as easy as granting. Withdrawal revokes the
// employee's devices (stops further collection) and records the timestamp.
import { handler, requireAuth, send, HttpError } from '../lib/http.js';
import { query } from '../lib/db.js';
import { audit } from '../lib/audit.js';

export default handler(async (req, res) => {
  const actor = await requireAuth(req);

  if (req.method === 'GET') {
    // ?devices=1 lists the employee's own devices (for self-service revoke).
    if (new URL(req.url, 'http://localhost').searchParams.get('devices') === '1') {
      const { rows } = await query(
        `SELECT id, platform, hostname, revoked, last_seen, expires_at, created_at
           FROM devices WHERE user_id = $1 ORDER BY created_at DESC`,
        [actor.id]
      );
      return send(res, 200, { devices: rows });
    }
    const { rows } = await query(
      `SELECT consent_version, granted_at, withdrawn_at FROM consents
        WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [actor.id]
    );
    return send(res, 200, { consent: rows[0] || null });
  }

  if (req.method === 'DELETE') {
    // Per-device revoke: ?device_id= revokes a single device (e.g. a lost laptop)
    // WITHOUT withdrawing consent entirely, so the employee's other agents keep
    // working. Scoped to the caller's own devices.
    const deviceId = new URL(req.url, 'http://localhost').searchParams.get('device_id');
    if (deviceId) {
      const { rowCount } = await query(
        `UPDATE devices SET revoked = true WHERE id = $1 AND user_id = $2`,
        [deviceId, actor.id]
      );
      if (rowCount === 0) throw new HttpError(404, 'Device not found');
      await audit(req, actor, 'revoke device', deviceId);
      return send(res, 200, { ok: true, message: 'Device revoked.' });
    }
    // Stop collection immediately: revoke all devices + mark consent withdrawn.
    await query(`UPDATE devices SET revoked = true WHERE user_id = $1`, [actor.id]);
    await query(
      `UPDATE consents SET withdrawn_at = now()
        WHERE user_id = $1 AND withdrawn_at IS NULL`,
      [actor.id]
    );
    await audit(req, actor, 'withdraw consent', actor.id);
    return send(res, 200, { ok: true, message: 'Consent withdrawn; monitoring stopped.' });
  }

  throw new HttpError(405, 'Method Not Allowed');
});
