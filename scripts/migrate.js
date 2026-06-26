// scripts/migrate.js — apply ordered SQL migrations, tracked in schema_migrations.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, '..', 'deployment', 'migrations');

async function main() {
  await query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  const { rows } = await query(`SELECT name FROM schema_migrations`);
  const done = new Set(rows.map((r) => r.name));

  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
  let applied = 0;
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = fs.readFileSync(path.join(DIR, f), 'utf8');
    process.stdout.write(`Applying ${f} ... `);
    await query(sql);
    await query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [f]);
    console.log('ok');
    applied++;
  }
  console.log(applied === 0 ? 'No new migrations.' : `Applied ${applied} migration(s).`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
