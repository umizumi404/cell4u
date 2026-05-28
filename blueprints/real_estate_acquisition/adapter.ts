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
import { realEstateAcquisitionBlueprint } from "./blueprint";

/**
 * Real-estate acquisition adapter.
 *
 * Behind a feature flag (`ENABLE_BLUEPRINT_REAL_ESTATE_ACQUISITION`) until
 * Ticket 5 ships `scrubLeads()`. The classifier is implemented here because
 * it's deterministic; sourcing + context-building are stubs.
 */

function classifyOutcome(transcript: CallTranscript): Outcome {
  const { success_event } = realEstateAcquisitionBlueprint.win_condition;

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
    "real_estate_acquisition.sourceLeads (CSV import + scrubLeads)",
    "Ticket 5",
  );
}

async function buildCallContext(
  _profile: CampaignProfile,
  _leadId: string,
  _personaId: string,
): Promise<CallContext> {
  throw new NotImplementedError(
    "real_estate_acquisition.buildCallContext (persona + dynamic-var injection)",
    "Ticket 6",
  );
}

/**
 * Real-estate acquisition calls residential numbers, which means we MUST
 * route every lead through a DNC/registry scrub before dialing
 * (AGENTS.md invariant #8). Ticket 5 implements the real scrub; until
 * then we throw — this is the explicit gate keeping the flag-gated
 * blueprint from accidentally dialing without scrub.
 */
async function scrubLeads(
  _leads: ReadonlyArray<Lead>,
): Promise<ReadonlyArray<Lead>> {
  throw new NotImplementedError(
    "real_estate_acquisition.scrubLeads (DNC + state registry scrub)",
    "Ticket 5",
  );
}

export const realEstateAcquisitionAdapter: BlueprintAdapter = {
  sourceLeads,
  buildCallContext,
  classifyOutcome,
  scrubLeads,
};
