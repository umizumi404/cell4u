/**
 * Shared Retell SDK client for provisioning scripts.
 *
 * Provisioning is the one place we deliberately call Retell admin APIs
 * (AGENTS.md invariant #10: provisioning happens once, out of the request
 * path). The runtime Retell client lives in `lib/retell/` (Ticket 3) and
 * only does call-time operations.
 */

import Retell from "retell-sdk";

export function makeRetellClient(): Retell {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RETELL_API_KEY is not set. Provisioning requires the API key in your local env.",
    );
  }
  return new Retell({ apiKey });
}

/**
 * Pretty-print a slice of any structured value so the operator can audit
 * what the script is about to do. Truncates long arrays/strings.
 */
export function preview(value: unknown, depth = 2): string {
  return JSON.stringify(
    value,
    (_key, v) => {
      if (typeof v === "string" && v.length > 160) return v.slice(0, 160) + "…";
      return v;
    },
    depth,
  );
}

export const PROVISION_NAME_PREFIX = "cell4u";

/** Canonical Retell resource name for a per-vertical template flow. */
export function flowName(verticalId: string, kind: "call" | "intake"): string {
  return `${PROVISION_NAME_PREFIX}/${verticalId}/${kind}/v1`;
}
