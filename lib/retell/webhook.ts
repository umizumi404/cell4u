/**
 * Retell webhook signature verification.
 *
 * Retell signs every webhook delivery (events + tools) with HMAC-SHA256
 * keyed on your RETELL_API_KEY, in the format `v=<ms_timestamp>,d=<hex>`,
 * with a 5-minute replay window. The SDK exposes `Retell.verify` which
 * implements exactly this. We wrap it so route handlers don't have to
 * know the signature header name.
 *
 * AGENTS.md invariants honored here:
 *   #1  Edge-safe: uses Web Crypto via the SDK helper, no Node `crypto`.
 *   #2  Cheap (one HMAC); routes return < 5s.
 *
 * The signature header Retell sends is `x-retell-signature`.
 */

import { verify as retellVerify } from "retell-sdk";

export const RETELL_SIGNATURE_HEADER = "x-retell-signature";

export class WebhookVerificationError extends Error {
  constructor(reason: string) {
    super(`Retell webhook verification failed: ${reason}`);
    this.name = "WebhookVerificationError";
  }
}

interface VerifyArgs {
  /** Raw request body (exact bytes — do NOT parse then re-stringify). */
  rawBody: string;
  /** Value of the `x-retell-signature` header. */
  signature: string | null | undefined;
  /** Override API key (tests only). Defaults to process.env.RETELL_API_KEY. */
  apiKey?: string;
}

export async function verifyRetellWebhook(args: VerifyArgs): Promise<void> {
  const apiKey = args.apiKey ?? process.env.RETELL_API_KEY;
  if (!apiKey) {
    throw new WebhookVerificationError("RETELL_API_KEY is not configured");
  }
  if (!args.signature) {
    throw new WebhookVerificationError(
      `missing ${RETELL_SIGNATURE_HEADER} header`,
    );
  }
  let ok = false;
  try {
    ok = await retellVerify(args.rawBody, apiKey, args.signature);
  } catch (err) {
    throw new WebhookVerificationError(
      `verify threw: ${(err as Error).message}`,
    );
  }
  if (!ok) {
    throw new WebhookVerificationError("signature mismatch or replay window expired");
  }
}
