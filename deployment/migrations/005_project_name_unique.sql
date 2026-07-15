-- 005_project_name_unique.sql
-- Project name de-duplication was only ever checked at the application layer
-- (SELECT-then-INSERT in api/projects/index.js) — a real, if narrow, race
-- condition under concurrent requests. Enforce it at the DB level too, with
-- the exact same scope as the existing app-level check (company_id +
-- case-insensitive name, regardless of status) so behavior doesn't drift.
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_company_name_unique
  ON projects (company_id, lower(name));
