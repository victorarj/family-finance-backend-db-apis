# Database Migrations

## Forward migration

Apply:

`001_extend_schema_planning.sql`

This migration is non-destructive and extends the legacy schema with planning
entities and support columns.

## Rollback migration

Use:

`001_extend_schema_planning_rollback.sql`

Rollback removes only objects introduced by the forward migration. Existing
legacy core tables (`USUARIOS`, `DESPESAS`, `RECEITAS`, etc.) remain intact.

## Notes

- Apply migrations in a maintenance window if running against production data.
- Always take a database backup before rollback.
