import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const TL_PASSWORD = process.env.TL_PASSWORD || 'lead123';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { role, password } = req.body || {};

  if (!role || !password) {
    return res.status(400).json({ error: 'Missing role or password' });
  }

  let isMatch = false;
  if (role === 'admin') {
    isMatch = (password === ADMIN_PASSWORD);
  } else if (role === 'tl') {
    isMatch = (password === TL_PASSWORD);
  } else {
    return res.status(400).json({ error: 'Invalid role for password authentication' });
  }

  if (isMatch) {
    const salt = process.env.SESSION_SALT || 'civil-mantra-secret-salt-987';
    const token = crypto
      .createHash('sha256')
      .update(`${role}-${salt}-${new Date().toDateString()}`)
      .digest('hex');

    return res.status(200).json({
      success: true,
      token,
      role
    });
  } else {
    return res.status(401).json({ error: 'Invalid password credential' });
  }
}
