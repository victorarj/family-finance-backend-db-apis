# Database Migrations

## Forward migration

Apply:

`001_extend_schema_planning.sql`
`002_bank_accounts_management.sql`

These migrations are non-destructive and extend the legacy schema with planning
entities, onboarding support, and bank-account lifecycle columns.

## Rollback migration

Use:

`001_extend_schema_planning_rollback.sql`
`002_bank_accounts_management_rollback.sql`

Rollback removes only objects introduced by the forward migration. Existing
legacy core tables (`USUARIOS`, `DESPESAS`, `RECEITAS`, etc.) remain intact.

## Notes

- Apply migrations in a maintenance window if running against production data.
- Always take a database backup before rollback.
