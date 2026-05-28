# db/

Postgres schema (Neon-compatible) for Cell For You.

## Applying migrations

Migrations are plain SQL, ordered by filename. Run them against `POSTGRES_URL`
(or `DATABASE_URL`) however you prefer — `psql`, Neon's web SQL editor, or a
migration runner of your choice. Ticket 2's scope is the schema definition,
not a migration runner; if/when one is added it should pick up everything in
`db/migrations/*.sql` in lexicographic order.

```sh
psql "$POSTGRES_URL" -f db/migrations/0001_init.sql
```

## Schema notes

- No auth in v0 (AGENTS.md invariant #11). Campaign ids are anonymous.
- Every operational table carries `vertical_id` so ops queries can filter per
  blueprint without joining campaigns.
- `outcomes` is intentionally separate from `calls` so wins are a distinct
  durable record (invariant #6 — outcomes are real).
- `call_events.delivery_id` carries Retell's webhook delivery id and has a
  partial unique index for idempotent webhook handling.
