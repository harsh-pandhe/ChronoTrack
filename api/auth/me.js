// GET /api/auth/me — return the authenticated user (session check).
import { handler, requireAuth, send, HttpError } from '../../lib/http.js';

export default handler(async (req, res) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method Not Allowed');
  const user = await requireAuth(req);
  return send(res, 200, { user });
});
