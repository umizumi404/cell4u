/**
 * Postgres client (Neon serverless).
 *
 * We use `neon()` (HTTP-based) rather than `Pool` because every consumer is
 * either an Edge route or a one-shot server action; connection pooling on
 * Vercel Functions is a footgun and the HTTP driver is the recommended
 * shape for that environment.
 *
 * The query helpers expose tagged-template SQL with parameter binding —
 * never interpolate user input. See `lib/db/queries.ts` for typed query
 * wrappers; this file is the connection-level surface.
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;

export function sql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Postgres is not configured. Set POSTGRES_URL (or DATABASE_URL).",
    );
  }
  _sql = neon(url);
  return _sql;
}
