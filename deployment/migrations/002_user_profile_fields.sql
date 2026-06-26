-- 002_user_profile_fields.sql
-- Carry the workforce profile fields the dashboard needs so the UI can run
-- entirely off the backend (no localStorage). hourly_cost stays authoritative
-- for ROI; it is auto-derived from salary+benefits when not set explicitly.

ALTER TABLE users ADD COLUMN IF NOT EXISTS emp_code      VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS dept          VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS title         VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS base_salary   NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS benefits      NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_hours     INTEGER NOT NULL DEFAULT 160;
