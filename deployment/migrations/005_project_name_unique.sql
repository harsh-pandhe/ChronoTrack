-- 005_project_name_unique.sql
-- Project name de-duplication was only ever checked at the application layer
-- (SELECT-then-INSERT in api/projects/index.js) — a real, if narrow, race
-- condition under concurrent requests. Enforce it at the DB level too.
--
-- Scoped to non-archived projects: an archived project's name shouldn't block
-- reusing that name (archived projects are already excluded from every
-- listing/dropdown/revenue total by default). This also matches real
-- production data found when first applying this migration: old test runs
-- had left an active + an archived project sharing the same name (e.g. one
-- "Race Condition Test" active, one archived) — a real, harmless case this
-- scoping accommodates without deleting any historical data.
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_company_name_unique
  ON projects (company_id, lower(name))
  WHERE status <> 'archived';
