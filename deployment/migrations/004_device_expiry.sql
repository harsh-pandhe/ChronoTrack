-- 004_device_expiry.sql
-- Device bearer tokens were valid forever unless the whole consent was withdrawn.
-- Give them an expiry so a leaked/abandoned token stops working on its own, and
-- so re-activation naturally rotates the token. NULL = no expiry (back-compat for
-- devices activated before this migration; the app sets a real expiry going
-- forward). Enforced in /api/ingest.
ALTER TABLE devices ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Index the hash we authenticate ingest against (was a full scan per batch).
CREATE INDEX IF NOT EXISTS idx_devices_token_hash ON devices(device_token_hash);
