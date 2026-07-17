-- 007_mfa.sql
-- Optional, opt-in two-factor auth (TOTP authenticator apps + WebAuthn passkeys)
-- for admin and lead accounts. Employees never enroll — they don't log into the
-- web console — so nothing here affects the desktop-agent path.

-- Enrollment flag + a DB-backed lockout. The lockout is NOT optional polish:
-- lib/ratelimit.js fails open to a per-instance in-memory counter when Upstash
-- isn't configured, so on serverless a brute-forcer gets a fresh bucket per cold
-- start. A 6-digit TOTP is only ~10^6, so the durable lockout below is the real
-- guard; Redis (if present) is just a cheap first line.
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_failed_count  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_locked_until  TIMESTAMPTZ;

-- TOTP shared secret, AES-256-GCM encrypted at rest (see lib/mfa.js). Encrypted
-- with MFA_ENC_KEY — a SEPARATE env var from JWT_SECRET on purpose: JWT_SECRET
-- rotates (JWT_SECRET_PREVIOUS exists for exactly that), and rotating it must
-- never brick every enrolled authenticator. last_step blocks TOTP replay: a code
-- already accepted at a given 30s step can't be used again.
CREATE TABLE IF NOT EXISTS mfa_totp (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  secret_enc   BYTEA NOT NULL,
  key_version  SMALLINT NOT NULL DEFAULT 1,
  last_step    BIGINT,
  confirmed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WebAuthn passkeys. counter guards against cloned authenticators, but many
-- platform authenticators (iCloud Keychain, most Android) always report 0 — so
-- the verify path only rejects when stored > 0 AND new <= stored (see lib/mfa.js),
-- never a bare non-increment, or it'd break passkeys on day one.
CREATE TABLE IF NOT EXISTS mfa_credentials (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  credential_id  TEXT NOT NULL UNIQUE,          -- base64url
  public_key     BYTEA NOT NULL,
  counter        BIGINT NOT NULL DEFAULT 0,
  transports     TEXT[],
  device_type    TEXT,
  backed_up      BOOLEAN,
  label          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mfa_cred_user ON mfa_credentials(user_id);

-- Single-use recovery codes. sha256 (not bcrypt) is correct: the codes are
-- 80-bit random, so a fast hash is uncrackable regardless, and it lets us
-- consume by indexed hash lookup in one statement instead of bcrypt-looping.
CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code_hash  CHAR(64) NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, code_hash)
);

-- Short-lived, single-use WebAuthn challenges. Serverless has no shared memory
-- between the two round-trips of a register/authenticate ceremony, and the
-- challenge MUST be single-use (a stateless signed challenge would replay until
-- expiry). Consumed atomically with DELETE ... RETURNING in lib/mfa.js.
CREATE TABLE IF NOT EXISTS mfa_challenges (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose    TEXT NOT NULL CHECK (purpose IN ('register','authenticate')),
  challenge  TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mfa_chal_user    ON mfa_challenges(user_id, purpose);
CREATE INDEX IF NOT EXISTS idx_mfa_chal_expires ON mfa_challenges(expires_at);
