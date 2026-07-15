-- 001_init.sql
-- ChronoTrack — production multi-tenant schema (idempotent).
-- Replaces the prototype schema.sql. Apply with: node scripts/migrate.js
-- DPDP-compliant: telemetry stores input DENSITIES + window TITLES only,
-- never keystroke content, never screenshots, never URLs.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    plan        VARCHAR(50)  NOT NULL DEFAULT 'enterprise',
    settings    JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Users: admin / lead / employee
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name                 VARCHAR(255) NOT NULL,
    email                VARCHAR(255) NOT NULL,
    password_hash        VARCHAR(255),                       -- null until employee sets password
    role                 VARCHAR(20)  NOT NULL CHECK (role IN ('admin','lead','employee')),
    team_lead_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    can_manage_employees BOOLEAN NOT NULL DEFAULT false,     -- authority granted by admin
    hourly_cost          NUMERIC(12,2) NOT NULL DEFAULT 0,   -- blended cost/hr for ROI
    status               VARCHAR(20) NOT NULL DEFAULT 'invited'
                            CHECK (status IN ('invited','active','disabled')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_company_email UNIQUE (company_id, email)
);

-- ---------------------------------------------------------------------------
-- Projects + assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(50),
    team_lead_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    client          VARCHAR(255),
    budget          NUMERIC(14,2) NOT NULL DEFAULT 0,
    billed_revenue  NUMERIC(14,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','completed','on_hold','archived')),
    start_date      DATE,
    end_date        DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_on_project VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_assignment UNIQUE (project_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Activation codes (onboarding) + devices
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activation_codes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash   VARCHAR(255) NOT NULL,             -- 8-digit code, hashed at rest
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token_hash  VARCHAR(255) NOT NULL,       -- bearer token, hashed
    platform           VARCHAR(20),
    hostname           VARCHAR(255),
    revoked            BOOLEAN NOT NULL DEFAULT false,
    last_seen          TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Telemetry (raw activity samples) — densities + titles only
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id             BIGSERIAL PRIMARY KEY,
    company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id      UUID REFERENCES devices(id) ON DELETE SET NULL,
    ts             TIMESTAMPTZ NOT NULL,
    window_title   TEXT,
    app_category   VARCHAR(50),
    input_density  INTEGER NOT NULL DEFAULT 0,
    focus_score    INTEGER NOT NULL DEFAULT 0,
    is_idle        BOOLEAN NOT NULL DEFAULT false,
    ai_label       VARCHAR(50),
    anomaly_flag   BOOLEAN NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Time entries (self-reported project attribution from the "what project?" prompt)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_entries (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
    start_ts    TIMESTAMPTZ NOT NULL,
    end_ts      TIMESTAMPTZ NOT NULL,
    hours       NUMERIC(8,2) NOT NULL,
    source      VARCHAR(20) NOT NULL DEFAULT 'prompt' CHECK (source IN ('prompt','manual')),
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Productivity rules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productivity_rules (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    keyword     VARCHAR(100) NOT NULL,
    category    VARCHAR(20) NOT NULL CHECK (category IN ('whitelist','blacklist')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_company_keyword UNIQUE (company_id, keyword)
);

-- ---------------------------------------------------------------------------
-- Consent records (DPDP) + audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consents (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_version  VARCHAR(20) NOT NULL,
    granted_at       TIMESTAMPTZ,
    withdrawn_at     TIMESTAMPTZ,                 -- DPDP: withdrawal must be honored
    ip               VARCHAR(64),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id             BIGSERIAL PRIMARY KEY,
    company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    actor_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name     VARCHAR(255),
    action         TEXT NOT NULL,
    target         TEXT,
    ip             VARCHAR(64),
    ts             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes (scale to 1,600 users)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_company       ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_team_lead      ON users(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_projects_company     ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_assign_project       ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_assign_user          ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_user_ts    ON telemetry_logs(company_id, user_id, ts);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user    ON time_entries(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_devices_user         ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_activation_user      ON activation_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_company_ts     ON audit_logs(company_id, ts);
