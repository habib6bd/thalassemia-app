-- Phase 0: enable the extensions later phases and CI depend on.
-- pg_cron drives scheduled jobs (ARCHITECTURE.md §11); pgtap is test-only.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pgtap with schema extensions;
