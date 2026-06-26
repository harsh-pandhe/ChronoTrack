// scripts/seed-admin.js — one-time secure bootstrap of a company + first admin.
// Usage: COMPANY="Civil Mantra" ADMIN_EMAIL=a@b.com ADMIN_PASSWORD=... node scripts/seed-admin.js
import { query } from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';

async function main() {
  const company = process.env.COMPANY || 'Civil Mantra';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Administrator';
  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD env vars.');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('ADMIN_PASSWORD must be at least 10 characters.');
    process.exit(1);
  }

  const { rows: [co] } = await query(
    `INSERT INTO companies (name) VALUES ($1) RETURNING id`, [company]
  );
  const hash = await hashPassword(password);
  const { rows: [admin] } = await query(
    `INSERT INTO users (company_id, name, email, password_hash, role, status)
     VALUES ($1,$2,$3,$4,'admin','active') RETURNING id`,
    [co.id, name, email, hash]
  );
  console.log(`Seeded company "${company}" (${co.id}) with admin ${email} (${admin.id}).`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
