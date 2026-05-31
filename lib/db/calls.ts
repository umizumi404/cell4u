/**
 * Call / event / outcome write helpers used by Retell webhook handlers.
 *
 * Design rules:
 *   - Everything keyed on `retell_call_id` (Retell's id) because that's
 *     what we receive on the webhook. Our internal `calls.id` is the
 *     stable foreign-key target but webhooks don't know it.
 *   - `recordCallEvent` is idempotent via a unique index on
 *     `delivery_id`. Re-deliveries from Retell collapse to no-ops.
 *   - All writes return `void` (or the internal id where the caller
 *     needs it). Webhook handlers don't return data to Retell beyond
 *     the 200 envelope.
 *   - These functions are intentionally small and synchronous-shaped so
 *     the webhook routes can hit them, publish to Upstash, and return
 *     within the 5-second SLO (AGENTS.md invariant #2).
 */

import { sql } from "./index";
import type { OutcomeKind } from "../../blueprints";

/* -------------------------------------------------------------------------- */
/* Calls                                                                      */
/* -------------------------------------------------------------------------- */

export type CallStatus =
  | "queued"
  | "dialing"
  | "ringing"
  | "in_call"
  | "completed"
  | "failed"
  | "no_answer"
  | "voicemail";

/**
 * Upsert by retell_call_id. Used when Retell delivers `call_started`
 * (the call may already exist in our DB if we created the row at
 * dispatch time, or we may be hearing about it for the first time).
 */
export async function upsertCallByRetellId(args: {
  retellCallId: string;
  campaignId?: string;
  leadId?: string;
  verticalId?: string;
  status?: CallStatus;
  archetype?: string;
  startedAt?: Date | null;
  completedAt?: Date | null;
  transcript?: string | null;
  recordingUrl?: string | null;
  summary?: string | null;
}): Promise<string> {
  const q = sql();
  const rows = (await q`
    insert into calls (
      retell_call_id, campaign_id, lead_id, vertical_id,
      status, archetype, started_at, completed_at,
      transcript, recording_url, summary
    )
    values (
      ${args.retellCallId}, ${args.campaignId ?? null}, ${args.leadId ?? null}, ${args.verticalId ?? null},
      ${args.status ?? "queued"}, ${args.archetype ?? null}, ${args.startedAt ?? null}, ${args.completedAt ?? null},
      ${args.transcript ?? null}, ${args.recordingUrl ?? null}, ${args.summary ?? null}
    )
    on conflict (retell_call_id) do update set
      status        = coalesce(excluded.status, calls.status),
      started_at    = coalesce(excluded.started_at, calls.started_at),
      completed_at  = coalesce(excluded.completed_at, calls.completed_at),
      transcript    = coalesce(excluded.transcript, calls.transcript),
      recording_url = coalesce(excluded.recording_url, calls.recording_url),
      summary       = coalesce(excluded.summary, calls.summary)
    returning id;
  `) as { id: string }[];
  return rows[0].id;
}

/* -------------------------------------------------------------------------- */
/* Call events (idempotent)                                                   */
/* -------------------------------------------------------------------------- */

export async function recordCallEvent(args: {
  callId: string | null;
  campaignId: string | null;
  eventType: string;
  payload: unknown;
  deliveryId: string | null;
}): Promise<void> {
  const q = sql();
  // ON CONFLICT (delivery_id) DO NOTHING gives us idempotency for free
  // — the unique partial index in 0001_init.sql guarantees it.
  await q`
    insert into call_events (call_id, campaign_id, event_type, payload, delivery_id)
    values (${args.callId}, ${args.campaignId}, ${args.eventType}, ${JSON.stringify(args.payload)}::jsonb, ${args.deliveryId})
    on conflict (delivery_id) where delivery_id is not null do nothing;
  `;
}

/* -------------------------------------------------------------------------- */
/* Outcomes                                                                   */
/* -------------------------------------------------------------------------- */

export async function writeOutcome(args: {
  callId: string;
  campaignId: string;
  verticalId: string;
  kind: OutcomeKind;
  evidence: Record<string, unknown>;
}): Promise<void> {
  const q = sql();
  // `outcomes.call_id` is unique — the first terminal outcome wins.
  // Webhook idempotency is enforced upstream via delivery_id; this
  // ON CONFLICT is belt + suspenders for any out-of-order retries.
  await q`
    insert into outcomes (call_id, campaign_id, vertical_id, kind, evidence)
    values (${args.callId}, ${args.campaignId}, ${args.verticalId}, ${args.kind}, ${JSON.stringify(args.evidence)}::jsonb)
    on conflict (call_id) do nothing;
  `;
}
