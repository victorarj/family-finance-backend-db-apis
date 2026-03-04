# API Changes (Phase 1 + 2)

## Stabilized Existing Routes

- `POST /users` added.
- `currencies` now uses `codigo` as canonical key.
- `distributions` now supports composite key operations.
- `expenses` and `recipes` now enforce owner scope and snapshot month locks.
- `categories` deletion now deactivates (`ativo = false`) instead of hard delete.

## New Planning Routes (Legacy-compatible surface)

- `GET/POST /preferences`
- `GET/POST/PUT/DELETE /monthly-budgets`
- `GET/POST/PUT/DELETE /recurring`
- `GET /planning/summary`
- `GET /planning/projection`
- `GET /planning/status`
- `GET/POST /monthly-snapshots`
- `DELETE /monthly-snapshots/:id` (admin-only via `ADMIN_EMAIL`)
- `GET/POST/DELETE /surplus-allocations`
- `GET /dashboard`
- `GET/POST/PUT/DELETE /transactions` (unified API adapter over `DESPESAS` and `RECEITAS`)

## Notes

- Routes remain non-versioned by design in this phase (`/api/v1` deferred).
- All new routes require existing auth middleware.
