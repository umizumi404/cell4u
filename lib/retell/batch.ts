/**
 * BatchCall dispatch wrapper.
 *
 * Each task carries `to_number` (E.164) + per-lead
 * `retell_llm_dynamic_variables`. The batch dispatches through a single
 * Agent (which wraps the per-vertical Conversation Flow + voice +
 * events webhook URL). The Agent is referenced via `override_agent_id`
 * on each task so the caller can target a vertical-specific Agent
 * without rebinding it to the from_number.
 *
 * Concurrency: Retell's BatchCall API exposes `reserved_concurrency`
 * (slots reserved for non-batch traffic, e.g. inbound). The total
 * concurrency is account-level. We surface `reservedConcurrency` so
 * callers can keep some headroom for tests/inbound during a large blast.
 *
 * E.164: every to_number is validated. Anything else is dropped with a
 * warning rather than failing the whole batch — partial dispatch beats
 * an all-or-nothing fail.
 */

import type Retell from "retell-sdk";

import { getRetell } from "./client";

/** Loose E.164: leading '+', 8–15 digits. */
const E164 = /^\+[1-9]\d{7,14}$/;

export function isE164(n: string): boolean {
  return E164.test(n);
}

export interface DispatchTask {
  toNumber: string;
  /** Per-lead dynamic vars injected into the flow's response engine. */
  dynamicVars?: Record<string, string>;
  /**
   * Arbitrary metadata blob Retell will echo back on call events. We
   * stuff `{ leadId, campaignId }` here so webhook handlers can correlate
   * without a DB lookup. Edge SLO honored (invariant #2).
   */
  metadata?: Record<string, unknown>;
}

export interface DispatchBatchArgs {
  /** From-number provisioned by Ticket 2.5 (E.164). */
  fromNumber: string;
  /** Agent id provisioned by Ticket 2.5 (one per vertical). */
  agentId: string;
  /** Human-readable label shown in the Retell dashboard. */
  name?: string;
  tasks: ReadonlyArray<DispatchTask>;
  reservedConcurrency?: number;
}

export interface DispatchBatchResult {
  batchCallId: string;
  dispatched: number;
  dropped: ReadonlyArray<{ toNumber: string; reason: string }>;
}

export async function dispatchBatch(
  args: DispatchBatchArgs,
): Promise<DispatchBatchResult> {
  if (!isE164(args.fromNumber)) {
    throw new Error(
      `from_number must be E.164, got "${args.fromNumber}".`,
    );
  }

  const dropped: { toNumber: string; reason: string }[] = [];
  const tasks: Retell.BatchCallCreateBatchCallParams.Task[] = [];

  for (const t of args.tasks) {
    if (!isE164(t.toNumber)) {
      dropped.push({ toNumber: t.toNumber, reason: "not E.164" });
      continue;
    }
    tasks.push({
      to_number: t.toNumber,
      override_agent_id: args.agentId,
      retell_llm_dynamic_variables: t.dynamicVars,
      metadata: t.metadata,
    });
  }

  if (tasks.length === 0) {
    throw new Error(
      `No valid tasks to dispatch (all ${args.tasks.length} were dropped).`,
    );
  }

  const payload: Retell.BatchCallCreateBatchCallParams = {
    from_number: args.fromNumber,
    tasks,
    name: args.name,
    reserved_concurrency: args.reservedConcurrency,
  };

  const result = await getRetell().batchCall.createBatchCall(payload);

  return {
    batchCallId: result.batch_call_id,
    dispatched: tasks.length,
    dropped,
  };
}
