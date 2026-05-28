import {
  NotImplementedError,
  type BlueprintAdapter,
  type CallContext,
  type CallTranscript,
  type CampaignProfile,
  type Lead,
  type Outcome,
  type SourceLeadsParams,
} from "../_types";
import { b2bLocalServicesBlueprint } from "./blueprint";

/**
 * B2B local services adapter.
 *
 * Ticket 1 scope is the contract surface. Real implementations land in:
 *   - sourceLeads       → Ticket 5 (Clay webhook-in/out + E.164 validation)
 *   - buildCallContext  → Ticket 6 (persona injection + dynamic vars)
 *   - classifyOutcome   → here, in v0, because it's pure deterministic
 *                         logic over the tool-call log — no external deps.
 */

/**
 * classifyOutcome reads the Retell tool-call log. A successful
 * `book_meeting` tool call is the only path to `won` (invariant #6: outcomes
 * are real). Everything else is derived from explicit operator tool calls
 * (`log_objection` with a `do_not_call`/`not_interested` flag) or from the
 * absence of any conversation turns (no answer / voicemail).
 */
function classifyOutcome(transcript: CallTranscript): Outcome {
  const { success_event } = b2bLocalServicesBlueprint.win_condition;

  const booked = transcript.toolCalls.find((c) => c.name === success_event);
  if (booked) {
    return { kind: "won", evidence: booked.arguments };
  }

  const dnc = transcript.toolCalls.find(
    (c) =>
      c.name === "log_objection" &&
      typeof c.arguments?.classification === "string" &&
      c.arguments.classification === "do_not_call",
  );
  if (dnc) {
    return { kind: "do_not_call", evidence: dnc.arguments };
  }

  const callback = transcript.toolCalls.find(
    (c) =>
      c.name === "log_objection" &&
      typeof c.arguments?.classification === "string" &&
      c.arguments.classification === "callback",
  );
  if (callback) {
    return { kind: "callback", evidence: callback.arguments };
  }

  const notInterested = transcript.toolCalls.find(
    (c) =>
      c.name === "log_objection" &&
      typeof c.arguments?.classification === "string" &&
      c.arguments.classification === "not_interested",
  );
  if (notInterested) {
    return { kind: "not_interested", evidence: notInterested.arguments };
  }

  if (transcript.turns.length === 0) {
    return { kind: "no_answer" };
  }

  const agentOnly = transcript.turns.every((t) => t.role === "agent");
  if (agentOnly) {
    return { kind: "voicemail" };
  }

  return { kind: "not_interested" };
}

async function sourceLeads(_params: SourceLeadsParams): Promise<ReadonlyArray<Lead>> {
  throw new NotImplementedError(
    "b2b_local_services.sourceLeads (Clay adapter)",
    "Ticket 5",
  );
}

async function buildCallContext(
  _profile: CampaignProfile,
  _leadId: string,
  _personaId: string,
): Promise<CallContext> {
  throw new NotImplementedError(
    "b2b_local_services.buildCallContext (persona + dynamic-var injection)",
    "Ticket 6",
  );
}

export const b2bLocalServicesAdapter: BlueprintAdapter = {
  sourceLeads,
  buildCallContext,
  classifyOutcome,
};
