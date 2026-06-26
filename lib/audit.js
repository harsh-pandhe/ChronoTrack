// lib/audit.js — append-only audit trail for every privileged mutation.
import { query } from './db.js';

export async function audit(req, actor, action, target = null) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    null;
  try {
    await query(
      `INSERT INTO audit_logs (company_id, actor_user_id, actor_name, action, target, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actor.company_id, actor.id, actor.name, action, target, ip]
    );
  } catch (err) {
    // Never let audit failure break the request, but make it visible.
    console.error('[audit] failed to write', err.message);
  }
}
