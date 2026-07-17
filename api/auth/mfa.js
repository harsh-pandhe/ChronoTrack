// /api/auth/mfa?action=... — TOTP + WebAuthn passkey enrollment and the
// second-factor login step. One file, ?action= routed (matches api/activation.js)
// to keep Vercel's function count flat. 2FA is admin/lead-only and opt-in.
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { handler, requireAuth, readBody, send, HttpError } from '../../lib/http.js';
import { verifyToken, signToken, verifyPassword } from '../../lib/auth.js';
import { query } from '../../lib/db.js';
import { rateLimitKey } from '../../lib/ratelimit.js';
import { audit } from '../../lib/audit.js';
import {
  newTotpSecret, totpUri, encryptSecret, consumeTotp, checkTotp,
  generateRecoveryCodes, consumeRecoveryCode,
  storeChallenge, consumeChallenge, isCounterRegression,
  assertNotLocked, MFA,
} from '../../lib/mfa.js';
import { sha256 } from '../../lib/auth.js';

const RP_ID = process.env.MFA_RP_ID || 'chrono-track-tau.vercel.app';
const RP_ORIGIN = process.env.MFA_ORIGIN || `https://${RP_ID}`;
const RP_NAME = 'ChronoTrack';

// Pending-token gate for the two login-completion endpoints. requireAuth
// deliberately rejects mfa_pending tokens, so these verify the token directly.
function requirePending(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const claims = token ? verifyToken(token) : null;
  if (!claims || claims.typ !== 'mfa_pending') throw new HttpError(401, 'Invalid or expired MFA session');
  return claims; // { sub, company_id, role, typ }
}

// Enrollment succeeds → if this is the account's first confirmed factor, flip
// mfa_enabled on and mint recovery codes ONCE (returned for one-time display).
async function enableAndMaybeRecovery(userId, companyId) {
  const { rows } = await query(`SELECT mfa_enabled FROM users WHERE id=$1`, [userId]);
  if (rows[0]?.mfa_enabled) return null; // already on — don't regenerate silently
  const codes = generateRecoveryCodes(10);
  for (const c of codes) {
    await query(
      `INSERT INTO mfa_recovery_codes (user_id, company_id, code_hash) VALUES ($1,$2,$3)`,
      [userId, companyId, sha256(c.replace(/-/g, ''))]
    );
  }
  await query(`UPDATE users SET mfa_enabled = true WHERE id=$1`, [userId]);
  return codes;
}

async function issueSession(res, claims) {
  const { rows } = await query(
    `SELECT id, name, email, role, company_id, can_manage_employees FROM users WHERE id=$1`,
    [claims.sub]
  );
  const u = rows[0];
  if (!u) throw new HttpError(401, 'User not found');
  const token = signToken({ sub: u.id, company_id: u.company_id, role: u.role, amr: ['pwd', 'mfa'] });
  return send(res, 200, {
    token,
    user: { id: u.id, name: u.name, email: u.email, role: u.role, company_id: u.company_id, can_manage_employees: !!u.can_manage_employees },
  });
}

export default handler(async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') throw new HttpError(405, 'Method Not Allowed');
  const action = new URL(req.url, 'http://localhost').searchParams.get('action');

  // ---- login-completion endpoints (pending token, NOT a full session) --------
  if (action === 'passkey-auth-options') {
    const claims = requirePending(req);
    await rateLimitKey(`mfa-authopt:${claims.sub}`, 10, 5 * 60_000);
    const { rows: creds } = await query(
      `SELECT credential_id, transports FROM mfa_credentials WHERE user_id=$1`, [claims.sub]
    );
    if (!creds.length) throw new HttpError(400, 'No passkeys registered');
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: creds.map((c) => ({ id: c.credential_id, transports: c.transports || undefined })),
      userVerification: 'preferred',
    });
    await storeChallenge(claims.sub, 'authenticate', options.challenge);
    return send(res, 200, { options });
  }

  if (action === 'verify') {
    const claims = requirePending(req);
    await assertNotLocked(claims.sub);
    await rateLimitKey(`mfa-verify:${claims.sub}`, 5, 5 * 60_000);
    const body = await readBody(req);
    const method = body.method;

    let ok = false;
    if (method === 'totp') {
      ok = await consumeTotp(claims.sub, body.code);
    } else if (method === 'recovery') {
      ok = await consumeRecoveryCode(claims.sub, body.code);
    } else if (method === 'passkey') {
      const expectedChallenge = await consumeChallenge(claims.sub, 'authenticate');
      if (!expectedChallenge) throw new HttpError(400, 'Challenge expired — retry');
      const resp = body.response;
      const { rows } = await query(
        `SELECT credential_id, public_key, counter, transports FROM mfa_credentials
          WHERE user_id=$1 AND credential_id=$2`,
        [claims.sub, resp?.id]
      );
      const cred = rows[0];
      if (!cred) throw new HttpError(400, 'Unknown passkey');
      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: resp,
          expectedChallenge,
          expectedOrigin: RP_ORIGIN,
          expectedRPID: RP_ID,
          credential: {
            id: cred.credential_id,
            publicKey: new Uint8Array(cred.public_key),
            counter: Number(cred.counter),
            transports: cred.transports || undefined,
          },
        });
      } catch {
        verification = { verified: false };
      }
      if (verification.verified) {
        const newCounter = verification.authenticationInfo.newCounter;
        if (isCounterRegression(cred.counter, newCounter)) {
          await audit(req, { id: claims.sub, company_id: claims.company_id, name: 'user' }, 'passkey counter regression (possible clone)', cred.credential_id);
          ok = false;
        } else {
          await query(`UPDATE mfa_credentials SET counter=$2, last_used_at=now() WHERE credential_id=$1`, [cred.credential_id, newCounter]);
          ok = true;
        }
      }
    } else {
      throw new HttpError(400, 'Unknown method');
    }

    if (!ok) {
      await MFA.recordFailure(claims.sub);
      throw new HttpError(401, 'Invalid code');
    }
    await MFA.clearFailures(claims.sub);
    return issueSession(res, claims);
  }

  // ---- enrollment + management (full session, admin/lead only) ---------------
  const actor = await requireAuth(req, ['admin', 'lead']);

  if (action === 'status' && req.method === 'GET') {
    const [{ rows: totp }, { rows: creds }, { rows: recov }] = await Promise.all([
      query(`SELECT confirmed_at FROM mfa_totp WHERE user_id=$1`, [actor.id]),
      query(`SELECT id, label, created_at, last_used_at FROM mfa_credentials WHERE user_id=$1 ORDER BY created_at`, [actor.id]),
      query(`SELECT count(*)::int AS n FROM mfa_recovery_codes WHERE user_id=$1 AND used_at IS NULL`, [actor.id]),
    ]);
    const { rows: u } = await query(`SELECT mfa_enabled FROM users WHERE id=$1`, [actor.id]);
    return send(res, 200, {
      mfa_enabled: !!u[0]?.mfa_enabled,
      totp: totp.length > 0 && !!totp[0].confirmed_at,
      passkeys: creds,
      recovery_remaining: recov[0].n,
    });
  }

  if (action === 'totp-init') {
    await rateLimitKey(`mfa-totpinit:${actor.id}`, 5, 60 * 60_000);
    const secret = newTotpSecret();
    await query(
      `INSERT INTO mfa_totp (user_id, company_id, secret_enc, confirmed_at)
       VALUES ($1,$2,$3,NULL)
       ON CONFLICT (user_id) DO UPDATE SET secret_enc=EXCLUDED.secret_enc, confirmed_at=NULL, last_step=NULL`,
      [actor.id, actor.company_id, encryptSecret(secret)]
    );
    return send(res, 200, { secret, otpauth_uri: totpUri(secret, actor.email) });
  }

  if (action === 'totp-activate') {
    await rateLimitKey(`mfa-totpact:${actor.id}`, 10, 10 * 60_000);
    const { code } = await readBody(req);
    const { rows } = await query(`SELECT confirmed_at FROM mfa_totp WHERE user_id=$1`, [actor.id]);
    if (!rows[0]) throw new HttpError(400, 'Start TOTP setup first');
    const ok = await checkTotp(actor.id, code); // confirm possession without consuming the step
    if (!ok) throw new HttpError(401, 'Code did not match — check your authenticator clock');
    await query(`UPDATE mfa_totp SET confirmed_at=now() WHERE user_id=$1`, [actor.id]);
    const recovery = await enableAndMaybeRecovery(actor.id, actor.company_id);
    await audit(req, actor, 'enabled TOTP 2FA');
    return send(res, 200, { ok: true, recovery_codes: recovery });
  }

  if (action === 'passkey-register-options') {
    await rateLimitKey(`mfa-regopt:${actor.id}`, 10, 60 * 60_000);
    const { rows: existing } = await query(`SELECT credential_id, transports FROM mfa_credentials WHERE user_id=$1`, [actor.id]);
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: new TextEncoder().encode(actor.id),
      userName: actor.email,
      userDisplayName: actor.name || actor.email,
      attestationType: 'none',
      excludeCredentials: existing.map((c) => ({ id: c.credential_id, transports: c.transports || undefined })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    });
    await storeChallenge(actor.id, 'register', options.challenge);
    return send(res, 200, { options });
  }

  if (action === 'passkey-register-verify') {
    await rateLimitKey(`mfa-regverify:${actor.id}`, 10, 60 * 60_000);
    const { response, label } = await readBody(req);
    const expectedChallenge = await consumeChallenge(actor.id, 'register');
    if (!expectedChallenge) throw new HttpError(400, 'Challenge expired — retry');
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response, expectedChallenge, expectedOrigin: RP_ORIGIN, expectedRPID: RP_ID,
      });
    } catch (e) {
      throw new HttpError(400, `Passkey verification failed: ${e.message}`);
    }
    if (!verification.verified || !verification.registrationInfo) throw new HttpError(400, 'Passkey not verified');
    const c = verification.registrationInfo.credential; // v13 shape: { id, publicKey, counter, transports }
    await query(
      `INSERT INTO mfa_credentials (user_id, company_id, credential_id, public_key, counter, transports, device_type, backed_up, label)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [actor.id, actor.company_id, c.id, Buffer.from(c.publicKey), c.counter || 0,
       c.transports || null, verification.registrationInfo.credentialDeviceType || null,
       verification.registrationInfo.credentialBackedUp ?? null, (label || 'Passkey').slice(0, 60)]
    );
    const recovery = await enableAndMaybeRecovery(actor.id, actor.company_id);
    await audit(req, actor, 'registered a passkey');
    return send(res, 200, { ok: true, recovery_codes: recovery });
  }

  if (action === 'passkey-remove') {
    const { credential_id } = await readBody(req);
    await query(`DELETE FROM mfa_credentials WHERE user_id=$1 AND credential_id=$2`, [actor.id, credential_id]);
    await audit(req, actor, 'removed a passkey', credential_id);
    return send(res, 200, { ok: true });
  }

  if (action === 'recovery-regenerate') {
    await rateLimitKey(`mfa-recov:${actor.id}`, 3, 60 * 60_000);
    const { password } = await readBody(req);
    const { rows } = await query(`SELECT password_hash FROM users WHERE id=$1`, [actor.id]);
    if (!(await verifyPassword(password, rows[0]?.password_hash))) throw new HttpError(401, 'Password incorrect');
    await query(`DELETE FROM mfa_recovery_codes WHERE user_id=$1`, [actor.id]);
    const codes = generateRecoveryCodes(10);
    for (const c of codes) {
      await query(`INSERT INTO mfa_recovery_codes (user_id, company_id, code_hash) VALUES ($1,$2,$3)`,
        [actor.id, actor.company_id, sha256(c.replace(/-/g, ''))]);
    }
    await audit(req, actor, 'regenerated 2FA recovery codes');
    return send(res, 200, { recovery_codes: codes });
  }

  if (action === 'disable') {
    await rateLimitKey(`mfa-disable:${actor.id}`, 5, 60 * 60_000);
    const { password } = await readBody(req);
    const { rows } = await query(`SELECT password_hash FROM users WHERE id=$1`, [actor.id]);
    if (!(await verifyPassword(password, rows[0]?.password_hash))) throw new HttpError(401, 'Password incorrect');
    await query(`DELETE FROM mfa_totp WHERE user_id=$1`, [actor.id]);
    await query(`DELETE FROM mfa_credentials WHERE user_id=$1`, [actor.id]);
    await query(`DELETE FROM mfa_recovery_codes WHERE user_id=$1`, [actor.id]);
    await query(`UPDATE users SET mfa_enabled=false, mfa_failed_count=0, mfa_locked_until=NULL WHERE id=$1`, [actor.id]);
    await audit(req, actor, 'disabled 2FA');
    return send(res, 200, { ok: true });
  }

  throw new HttpError(400, 'Invalid action');
});
