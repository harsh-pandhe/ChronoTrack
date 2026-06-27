// /api/rules — productivity keyword rules (whitelist/blacklist), per company.
// GET: list (any authed user). POST/DELETE: admin only.
import { handler, requireAuth, readBody, send, HttpError } from '../lib/http.js';
import { query } from '../lib/db.js';
import { audit } from '../lib/audit.js';

export default handler(async (req, res) => {
  const actor = await requireAuth(req);

  if (req.method === 'GET') {
    const { rows } = await query(
      `SELECT id, keyword, category FROM productivity_rules
        WHERE company_id=$1 ORDER BY category, keyword`,
      [actor.company_id]
    );
    return send(res, 200, { rules: rows });
  }

  if (req.method === 'POST') {
    if (actor.role !== 'admin') throw new HttpError(403, 'Admin only');
    const { keyword, category } = await readBody(req);
    if (!keyword || !['whitelist', 'blacklist'].includes(category))
      throw new HttpError(400, 'keyword + category (whitelist|blacklist) required');
    const kw = String(keyword).trim().toLowerCase();
    if (!kw) throw new HttpError(400, 'Empty keyword');
    let row;
    try {
      ({ rows: [row] } = await query(
        `INSERT INTO productivity_rules (company_id, keyword, category)
         VALUES ($1,$2,$3) RETURNING id, keyword, category`,
        [actor.company_id, kw, category]
      ));
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, 'Keyword already exists');
      throw err;
    }
    await audit(req, actor, `add ${category} rule`, kw);
    return send(res, 201, { rule: row });
  }

  if (req.method === 'DELETE') {
    if (actor.role !== 'admin') throw new HttpError(403, 'Admin only');
    const id = req.query?.id || new URL(req.url, 'http://localhost').searchParams.get('id');
    if (!id) throw new HttpError(400, 'Missing id');
    await query(`DELETE FROM productivity_rules WHERE id=$1 AND company_id=$2`, [id, actor.company_id]);
    await audit(req, actor, 'remove rule', id);
    return send(res, 200, { ok: true });
  }

  throw new HttpError(405, 'Method Not Allowed');
});
