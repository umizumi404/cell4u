/**
 * Singleton Retell client for runtime (request-path) callers.
 *
 * Distinct from `scripts/provision/client.ts`, which is for the
 * out-of-band provisioning seed (AGENTS.md invariant #10). This module
 * is what the call-time pipeline imports.
 *
 * Edge-safe: retell-sdk is fetch-based; no Node-only deps.
 */

import Retell from "retell-sdk";

let _client: Retell | null = null;

export function getRetell(): Retell {
  if (_client) return _client;
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RETELL_API_KEY is not set. Set it locally in .env (gitignored) and in Vercel project env.",
    );
  }
  _client = new Retell({ apiKey });
  return _client;
}

/**
 * Test seam: forcibly reset the singleton. Production code must never
 * call this. Tests use it between cases to swap mocked clients.
 */
export function __resetRetellForTests(client: Retell | null): void {
  _client = client;
}
