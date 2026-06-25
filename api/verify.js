import crypto from 'crypto';

const salt = process.env.SESSION_SALT || 'civil-mantra-secret-salt-987';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { token, role } = req.body || {};

  if (!token || !role) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const expectedToken = crypto
    .createHash('sha256')
    .update(`${role}-${salt}-${new Date().toDateString()}`)
    .digest('hex');

  if (token === expectedToken) {
    return res.status(200).json({ valid: true, role });
  } else {
    return res.status(401).json({ valid: false, error: 'Session expired or invalid' });
  }
}
