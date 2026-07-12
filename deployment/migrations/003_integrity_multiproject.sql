-- 003_integrity_multiproject.sql
-- Time-entry integrity + multi-project support.
--   * telemetry_active_seconds: snapshot of the tracked active time that backed
--     this entry at insert time (lets leads see logged-vs-tracked at a glance and
--     gives the ROI numbers an auditable basis).
--   * uq_time_entry_slot: cheap exact-duplicate backstop (double-submit / retry).
--   * idx_time_entries_user_start: overlap checks + per-day timeline queries.
-- project_assignments already exists (001) and is the many-to-many join that lets
-- one employee belong to several projects under different leads; no schema change
-- needed there, only the API/UI write paths added in this phase.

ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS telemetry_active_seconds INTEGER;

-- Exact-duplicate guard. project_id is nullable; NULLs are distinct in a unique
-- index (Postgres default), so this only blocks true exact repeats.
CREATE UNIQUE INDEX IF NOT EXISTS uq_time_entry_slot
  ON time_entries(user_id, start_ts, end_ts, project_id);

-- Overlap detection + day-scoped timeline reads (Phase 2).
CREATE INDEX IF NOT EXISTS idx_time_entries_user_start
  ON time_entries(company_id, user_id, start_ts);
