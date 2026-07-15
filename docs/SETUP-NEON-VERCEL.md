# Go-live: Neon + Vercel (exact steps)

Follow top to bottom. ~30 min. You need: GitHub (done), a Neon account, a Vercel account.

## A. Neon Postgres
1. Go to https://neon.tech → sign in with GitHub → **New Project** → name `chronotrack`, region closest to your users (e.g. AWS Mumbai `ap-south-1`).
2. After it creates, copy the **pooled connection string** (Dashboard → Connection Details → "Pooled connection"). Looks like:
   `postgresql://USER:PASS@ep-xxx-pooler.ap-south-1.aws.neon.tech/neondb?sslmode=require`
3. On your machine, apply schema + seed the first admin:
   ```bash
   export DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"   # paste yours
   npm run migrate
   COMPANY="ChronoTrack" ADMIN_EMAIL=admin@chronotrack.app \
     ADMIN_PASSWORD='pick-a-strong-one' ADMIN_NAME="Admin" npm run seed:admin
   ```
   (Do NOT set `PGSSL=disable` here — Neon needs TLS, which the app verifies.)

## B. Vercel (web portal + API)
1. Go to https://vercel.com → **Add New → Project** → import `harsh-pandhe/ChronoTrack`.
2. Framework auto-detects **Vite** (build `npm run build`, output `dist`). Leave defaults.
3. **Environment Variables** (Settings → Environment Variables), add for **Production**:
   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Neon pooled string from A.2 |
   | `JWT_SECRET` | run `openssl rand -hex 32` and paste |
   | `ALLOWED_ORIGINS` | your Vercel URL, e.g. `https://chronotrack.vercel.app` |
   | `CONSENT_VERSION` | `1.0` |
4. **Deploy**. Note the production URL (e.g. `https://chronotrack.vercel.app`).
5. Smoke test:
   ```bash
   curl -s -X POST https://YOUR-URL/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"admin@chronotrack.app","password":"the-one-you-set"}'
   ```
   Expect `{"token": "...", "user": {...}}`.

## C. Point the desktop installer at the cloud
The Windows/Linux installers must bake the cloud URL so the agent syncs there.
1. In GitHub → repo **Settings → Secrets and variables → Actions → Variables** →
   New variable: `VITE_API_BASE` = your Vercel URL (e.g. `https://chronotrack.vercel.app`).
2. Build installers via the **Release** workflow (next section).

## D. Build the Windows installer
You have no Windows machine needed — it builds on GitHub's Windows runner.
1. GitHub → **Actions → "Release (build installers)" → Run workflow** (manual), or push a tag:
   ```bash
   git tag v3.0.0 && git push origin v3.0.0
   ```
2. When it finishes: tag run → **Release** has `ChronoTrackAgent Setup *.exe` (+ Linux
   AppImage/deb) attached. Manual run → download from the workflow's **Artifacts**.
3. Give the `.exe` to pilot employees. They run it → activate with email + 8-digit code
   (admin/lead generates the code in the web portal → Provision Keys).

## E. First pilot (25 employees)
1. Admin logs into the Vercel URL → create team leads → leads create employees →
   generate activation codes.
2. Employees install the `.exe`, activate (consent + email + code).
3. Watch the **Admin → Dashboard / Contribution ROI** fill with real data.
4. Monitor `devices.last_seen` and ingest health before scaling past 25.

## Notes
- Unsigned Windows installer → SmartScreen "Unknown publisher" warning (click "More
  info → Run anyway" for pilot). For wider rollout, buy an Authenticode cert and add
  signing to the release workflow.
- Privacy/legal: hand `docs/DPIA-brief.md` to counsel before rollout.
