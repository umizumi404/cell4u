/**
 * Retell call-events webhook.
 *
 * Receives: call_started, transcript_updated, call_ended, call_analyzed.
 *
 * AGENTS.md invariants:
 *   #1  No persistent socket here — we publish to Upstash and return.
 *   #2  Must return < 5s. Validate signature, write the minimum-viable
 *       row to Postgres, publish a tile update, return 200. Slow work
 *       (e.g. summary scoring) goes through `waitUntil`.
 *   #6  Outcomes are NOT written here speculatively. The `tools` route
 *       is where the success-event tool call lands and an outcome row
 *       is committed with verbatim evidence. Events here can only set
 *       a transient `state`.
 *   #11 Every event must carry a campaign_id via `call.metadata.campaignId`
 *       (set at dispatch). If it's missing we still 200 (Retell would
 *       just retry forever) but we log loudly.
 */

import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";

import {
  recordCallEvent,
  upsertCallByRetellId,
  type CallStatus,
} from "../../../../../lib/db/calls";
import { publishTileUpdate, publishTranscriptChunk } from "../../../../../lib/realtime";
import {
  RETELL_SIGNATURE_HEADER,
  WebhookVerificationError,
  verifyRetellWebhook,
} from "../../../../../lib/retell";

export const runtime = "edge";

/* -------------------------------------------------------------------------- */
/* Payload schema                                                             */
/* -------------------------------------------------------------------------- */

const eventNameSchema = z.enum([
  "call_started",
  "call_ended",
  "call_analyzed",
  "transcript_updated",
]);

const callMetadataSchema = z
  .object({
    campaignId: z.string().optional(),
    leadId: z.string().uuid().optional(),
    verticalId: z.string().optional(),
    archetype: z.string().optional(),
  })
  .passthrough();

const transcriptTurnSchema = z.object({
  role: z.enum(["agent", "user"]).optional(),
  content: z.string().optional(),
});

const callSchema = z
  .object({
    call_id: z.string(),
    call_status: z.string().optional(),
    start_timestamp: z.number().optional(),
    end_timestamp: z.number().optional(),
    transcript: z.string().optional(),
    recording_url: z.string().optional(),
    metadata: z.unknown().optional(),
    transcript_object: z.array(transcriptTurnSchema).optional(),
    call_analysis: z
      .object({
        call_summary: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const payloadSchema = z.object({
  event: eventNameSchema,
  call: callSchema,
});

/* -------------------------------------------------------------------------- */
/* Status mapping                                                             */
/* -------------------------------------------------------------------------- */

const RETELL_STATUS_TO_CALL_STATUS: Record<string, CallStatus> = {
  ongoing: "in_call",
  ended: "completed",
  registered: "dialing",
  error: "failed",
};

function statusForEvent(
  event: z.infer<typeof eventNameSchema>,
  retellStatus: string | undefined,
): CallStatus | undefined {
  if (event === "call_started") return "in_call";
  if (event === "call_ended") {
    if (retellStatus && RETELL_STATUS_TO_CALL_STATUS[retellStatus]) {
      return RETELL_STATUS_TO_CALL_STATUS[retellStatus];
    }
    return "completed";
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Route                                                                      */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get(RETELL_SIGNATURE_HEADER);

  try {
    await verifyRetellWebhook({ rawBody, signature });
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return new NextResponse(err.message, { status: 401 });
    }
    throw err;
  }

  let parsed: z.infer<typeof payloadSchema>;
  try {
    parsed = payloadSchema.parse(JSON.parse(rawBody));
  } catch (err) {
    return new NextResponse(
      `bad payload: ${(err as Error).message}`,
      { status: 400 },
    );
  }

  const { event, call } = parsed;
  const meta = callMetadataSchema.safeParse(call.metadata ?? {});
  const campaignId = meta.success ? meta.data.campaignId : undefined;
  const leadId = meta.success ? meta.data.leadId : undefined;
  const verticalId = meta.success ? meta.data.verticalId : undefined;
  const archetype = meta.success ? meta.data.archetype : undefined;
  const deliveryId = req.headers.get("x-retell-delivery-id");

  const status = statusForEvent(event, call.call_status);

  // Minimum-viable write so subsequent events can attach. Idempotent
  // via unique index on retell_call_id.
  const callRowId = campaignId
    ? await upsertCallByRetellId({
        retellCallId: call.call_id,
        campaignId,
        leadId,
        verticalId,
        status,
        archetype,
        startedAt: call.start_timestamp ? new Date(call.start_timestamp) : null,
        completedAt: call.end_timestamp ? new Date(call.end_timestamp) : null,
        transcript: call.transcript ?? null,
        recordingUrl: call.recording_url ?? null,
        summary: call.call_analysis?.call_summary ?? null,
      })
    : null;

  await recordCallEvent({
    callId: callRowId,
    campaignId: campaignId ?? null,
    eventType: event,
    payload: { call },
    deliveryId,
  });

  // Realtime fan-out happens in the background — invariant #2 forbids
  // making the 200 wait on it.
  if (campaignId) {
    waitUntil(
      (async () => {
        const tileState = status ?? "in_call";
        await publishTileUpdate({
          campaignId,
          agentId: call.call_id,
          state: tileState,
          archetype,
        });

        if (event === "transcript_updated" && call.transcript_object) {
          // Stream only the last turn — full transcript is on the call row.
          const last = call.transcript_object.at(-1);
          if (last?.content && last.role) {
            await publishTranscriptChunk({
              campaignId,
              callId: call.call_id,
              role: last.role === "user" ? "lead" : "agent",
              text: last.content,
            });
          }
        }
      })().catch((err) => {
        console.error("[retell/events] background publish failed", err);
      }),
    );
  } else {
    console.warn(
      `[retell/events] event ${event} for call ${call.call_id} arrived without a campaignId in metadata; skipping realtime publish.`,
    );
  }

  return NextResponse.json({ ok: true });
}
