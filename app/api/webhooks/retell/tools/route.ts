/**
 * Retell tools webhook.
 *
 * The Conversation Flow's CustomTool nodes POST here when the agent
 * decides to invoke a tool. We host four tools:
 *
 *   - detect_blueprint   (intake only)  -> returns the vertical_id so
 *                                          the intake flow can branch.
 *   - report_stage_change                -> publishes a tile state.
 *   - log_objection                      -> may produce a do_not_call
 *                                          outcome.
 *   - <success_event>                    -> per-blueprint win condition
 *                                          (e.g. book_meeting). Writes
 *                                          a `won` outcome with verbatim
 *                                          tool args as evidence
 *                                          (invariant #6).
 *
 * AGENTS.md invariants:
 *   #2  Returns < 5s. The reply Retell needs is small — the tool
 *       result. Slow work goes through waitUntil.
 *   #5  This file refuses to know vertical names beyond looking up the
 *       blueprint by id and using `blueprint.win_condition.success_event`
 *       to recognize the success tool.
 *   #6  Outcome rows are only written when there is structured tool
 *       evidence (book_meeting args, log_objection classification).
 */

import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";

import {
  hasBlueprint,
  getBlueprint,
  type OutcomeKind,
} from "../../../../../blueprints";
import {
  recordCallEvent,
  upsertCallByRetellId,
  writeOutcome,
} from "../../../../../lib/db/calls";
import { publishTileUpdate } from "../../../../../lib/realtime";
import {
  RETELL_SIGNATURE_HEADER,
  WebhookVerificationError,
  verifyRetellWebhook,
} from "../../../../../lib/retell";

export const runtime = "edge";

/* -------------------------------------------------------------------------- */
/* Payload schemas                                                            */
/* -------------------------------------------------------------------------- */

const toolMetadataSchema = z
  .object({
    campaignId: z.string().optional(),
    leadId: z.string().uuid().optional(),
    verticalId: z.string().optional(),
  })
  .passthrough();

const callRefSchema = z
  .object({
    call_id: z.string(),
    metadata: z.unknown().optional(),
  })
  .passthrough();

/**
 * Retell's CustomTool wraps tool args under `args` by default
 * (`args_at_root: false`). We also accept root-level for robustness.
 */
const payloadSchema = z
  .object({
    name: z.string(),
    call: callRefSchema.optional(),
    args: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

/* -------------------------------------------------------------------------- */
/* Tool implementations                                                       */
/* -------------------------------------------------------------------------- */

interface ToolContext {
  campaignId: string | null;
  callRowId: string | null;
  retellCallId: string;
  verticalId: string | null;
}

function pickArgs(
  parsed: z.infer<typeof payloadSchema>,
): Record<string, unknown> {
  if (parsed.args && Object.keys(parsed.args).length > 0) return parsed.args;
  const { name: _name, call: _call, args: _args, ...rest } = parsed;
  return rest as Record<string, unknown>;
}

const stageSchema = z.object({
  stage: z.enum(["ice_break", "discovery", "pitch", "objection", "closing"]),
});

const objectionSchema = z.object({
  classification: z.enum(["not_interested", "callback", "do_not_call"]),
  reason: z.string().optional(),
});

const detectSchema = z.object({
  vertical_id: z.string(),
  confidence: z.number().optional(),
});

async function handleReportStageChange(
  ctx: ToolContext,
  rawArgs: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const parsed = stageSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return { ok: false, error: "invalid stage args" };
  }
  if (ctx.campaignId) {
    waitUntil(
      publishTileUpdate({
        campaignId: ctx.campaignId,
        agentId: ctx.retellCallId,
        state: parsed.data.stage,
      }).catch((err) =>
        console.error("[retell/tools] publishTileUpdate failed", err),
      ),
    );
  }
  return { ok: true };
}

async function handleLogObjection(
  ctx: ToolContext,
  rawArgs: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const parsed = objectionSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return { ok: false, error: "invalid objection args" };
  }
  // Only do_not_call is a terminal outcome here. The other classifications
  // are signal-only; the eventual call_ended event finalizes them.
  if (
    parsed.data.classification === "do_not_call" &&
    ctx.callRowId &&
    ctx.campaignId &&
    ctx.verticalId
  ) {
    waitUntil(
      writeOutcome({
        callId: ctx.callRowId,
        campaignId: ctx.campaignId,
        verticalId: ctx.verticalId,
        kind: "do_not_call" as OutcomeKind,
        evidence: { reason: parsed.data.reason ?? null, source: "log_objection" },
      }).catch((err) =>
        console.error("[retell/tools] writeOutcome(do_not_call) failed", err),
      ),
    );
  }
  return { ok: true };
}

async function handleDetectBlueprint(
  rawArgs: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const parsed = detectSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return { ok: false, error: "invalid detect args" };
  }
  if (!hasBlueprint(parsed.data.vertical_id)) {
    return {
      ok: false,
      error: `unknown or disabled blueprint: ${parsed.data.vertical_id}`,
    };
  }
  const { blueprint } = getBlueprint(parsed.data.vertical_id);
  return {
    ok: true,
    vertical_id: blueprint.vertical_id,
    dynamic_var_schema: blueprint.dynamic_var_schema,
  };
}

async function handleSuccessEvent(
  ctx: ToolContext,
  rawArgs: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!ctx.callRowId || !ctx.campaignId || !ctx.verticalId) {
    return { ok: false, error: "missing call context for success event" };
  }
  waitUntil(
    writeOutcome({
      callId: ctx.callRowId,
      campaignId: ctx.campaignId,
      verticalId: ctx.verticalId,
      kind: "won" as OutcomeKind,
      evidence: rawArgs,
    }).catch((err) =>
      console.error("[retell/tools] writeOutcome(won) failed", err),
    ),
  );
  if (ctx.campaignId) {
    waitUntil(
      publishTileUpdate({
        campaignId: ctx.campaignId,
        agentId: ctx.retellCallId,
        state: "won",
        outcome: "won",
      }).catch((err) =>
        console.error("[retell/tools] publishTileUpdate(won) failed", err),
      ),
    );
  }
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Route                                                                      */
/* -------------------------------------------------------------------------- */

function isSuccessEventName(toolName: string, verticalId: string | null): boolean {
  if (!verticalId || !hasBlueprint(verticalId)) return false;
  return getBlueprint(verticalId).blueprint.win_condition.success_event === toolName;
}

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

  const toolName = parsed.name;
  const rawArgs = pickArgs(parsed);
  const meta = toolMetadataSchema.safeParse(parsed.call?.metadata ?? {});
  const campaignId = meta.success ? meta.data.campaignId ?? null : null;
  const verticalId = meta.success ? meta.data.verticalId ?? null : null;
  const retellCallId = parsed.call?.call_id ?? "<unknown>";

  // Best-effort upsert so we have a calls.id to attach outcomes to.
  const callRowId =
    parsed.call && campaignId
      ? await upsertCallByRetellId({
          retellCallId,
          campaignId,
          leadId: meta.success ? meta.data.leadId : undefined,
          verticalId: verticalId ?? undefined,
        })
      : null;

  const deliveryId = req.headers.get("x-retell-delivery-id");
  await recordCallEvent({
    callId: callRowId,
    campaignId,
    eventType: `tool:${toolName}`,
    payload: parsed,
    deliveryId,
  });

  const ctx: ToolContext = {
    campaignId,
    callRowId,
    retellCallId,
    verticalId,
  };

  let result: Record<string, unknown>;
  switch (toolName) {
    case "detect_blueprint":
      result = await handleDetectBlueprint(rawArgs);
      break;
    case "report_stage_change":
      result = await handleReportStageChange(ctx, rawArgs);
      break;
    case "log_objection":
      result = await handleLogObjection(ctx, rawArgs);
      break;
    default:
      if (isSuccessEventName(toolName, verticalId)) {
        result = await handleSuccessEvent(ctx, rawArgs);
      } else {
        result = { ok: false, error: `unknown tool: ${toolName}` };
      }
      break;
  }

  return NextResponse.json(result);
}
