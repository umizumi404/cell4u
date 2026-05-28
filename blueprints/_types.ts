/**
 * Blueprint primitives.
 *
 * These types are the contract every vertical implements. Per AGENTS.md
 * invariant #5, nothing outside `blueprints/` may branch on `vertical_id`;
 * downstream code must read everything it needs from a `CampaignBlueprint`
 * + `BlueprintAdapter` pair returned by the registry.
 *
 * Shape source of truth: cell_for_you_prd_v2.md section 2.
 *
 * Note on `dynamic_var_schema`: the PRD shows it as
 * `Record<string, "string" | "number" | "enum">`. We carry a richer
 * `DynamicVarField` here because intake (Ticket 4) needs the field prompt
 * and required-flag to drive question generation, and Retell dispatch needs
 * to type-check values before injecting them. The PRD-shape view is exposed
 * via `dynamicVarSchemaTypes(blueprint)` for any consumer that wants it.
 */

export type AudienceKind = "business" | "consumer";

export type DynamicVarKind = "string" | "number" | "enum";

export interface DynamicVarField {
  readonly kind: DynamicVarKind;
  readonly required: boolean;
  /** Short label shown in the live profile card. */
  readonly label: string;
  /** Spoken prompt the intake agent asks if this field is still empty. */
  readonly prompt: string;
  /** Only present when kind === "enum". */
  readonly options?: ReadonlyArray<string>;
  /**
   * Optional example for the intake agent. Never injected into call dynamic
   * variables — this is a hint for the intake LLM only.
   */
  readonly example?: string;
}

export type DynamicVarSchema = Readonly<Record<string, DynamicVarField>>;

export interface ComplianceProfile {
  readonly dnc_scrub_required: boolean;
  /**
   * If present, the call template flow generator injects this verbatim into
   * the opening node. Set for any blueprint where regulators require an
   * AI/identity disclosure.
   */
  readonly disclosure_line?: string;
  readonly max_call_minutes: number;
}

export interface WinCondition {
  /** Human-readable CTA the call drives toward (e.g. "booked_demo"). */
  readonly cta_type: string;
  /** Name of the Retell tool-call whose success means win_condition met. */
  readonly success_event: string;
}

export interface CampaignBlueprint {
  readonly vertical_id: string;
  readonly lead_source_strategy: string;
  readonly target_audience: AudienceKind;
  readonly compliance_profile: ComplianceProfile;
  readonly persona_set: ReadonlyArray<string>;
  readonly flow_template_id: string;
  readonly dynamic_var_schema: DynamicVarSchema;
  readonly win_condition: WinCondition;
  readonly enrichment_recipe: string;
}

/* -------------------------------------------------------------------------- */
/* Adapter input/output shapes                                                */
/* -------------------------------------------------------------------------- */

/**
 * Output of intake. Keys mirror the active blueprint's `dynamic_var_schema`
 * after coercion; values are always strings here because Retell dynamic
 * variables are stringified on the wire. Number/enum coercion happens in
 * `buildCallContext`.
 */
export interface CampaignProfile {
  readonly campaignId: string;
  readonly verticalId: string;
  readonly filled: Readonly<Record<string, string>>;
  /** Free-form notes captured during intake (not injected). */
  readonly notes?: string;
}

export interface Lead {
  readonly id: string;
  readonly campaignId: string;
  /** E.164. Phone validation lives in lib/clay/ (Ticket 5). */
  readonly phone: string;
  /** Display name (business or person), depending on audience. */
  readonly displayName: string;
  /**
   * Bag of extra fields a sourcing adapter chose to surface (rating, address,
   * owner name, parcel id, ...). Each adapter owns its own keys.
   */
  readonly attributes: Readonly<Record<string, string | number | null>>;
  readonly enrichmentStatus: "pending" | "ready" | "failed";
}

/**
 * Per-call node override the dispatcher hands to Retell. Mirrors the subset
 * of Retell's per-call override surface we actually need; the typed Retell
 * client (Ticket 3) is what serializes this.
 */
export interface NodeOverride {
  readonly nodeId: string;
  readonly promptOverride?: string;
  readonly modelOverride?: string;
}

export interface CallContext {
  readonly dynamicVars: Readonly<Record<string, string>>;
  readonly nodeOverrides?: ReadonlyArray<NodeOverride>;
}

/* -------------------------------------------------------------------------- */
/* Outcome                                                                    */
/* -------------------------------------------------------------------------- */

export type OutcomeKind =
  | "won" // win_condition.success_event fired
  | "callback"
  | "not_interested"
  | "do_not_call"
  | "no_answer"
  | "voicemail"
  | "failed";

export interface Outcome {
  readonly kind: OutcomeKind;
  /**
   * If `kind === "won"`, the payload from the success_event tool call
   * (e.g. booked-meeting details). Otherwise the best classifier evidence.
   */
  readonly evidence?: Readonly<Record<string, unknown>>;
}

/**
 * The minimal transcript shape `classifyOutcome` receives. The full
 * Retell `call_analyzed` payload may carry more — adapters pluck what they
 * need.
 */
export interface CallTranscript {
  readonly callId: string;
  readonly turns: ReadonlyArray<{ role: "agent" | "lead"; text: string }>;
  /** Tool calls Retell logged during the call, in order. */
  readonly toolCalls: ReadonlyArray<{
    name: string;
    arguments: Readonly<Record<string, unknown>>;
  }>;
}

/* -------------------------------------------------------------------------- */
/* Adapter contract                                                           */
/* -------------------------------------------------------------------------- */

export interface SourceLeadsParams {
  readonly campaignId: string;
  readonly profile: CampaignProfile;
  /** Caps the request; the dispatcher decides actual fleet size. */
  readonly limit: number;
}

export interface BlueprintAdapter {
  sourceLeads(params: SourceLeadsParams): Promise<ReadonlyArray<Lead>>;
  buildCallContext(
    profile: CampaignProfile,
    leadId: string,
    personaId: string,
  ): Promise<CallContext>;
  classifyOutcome(transcript: CallTranscript): Outcome;
}

/**
 * What `registerBlueprint` produces and what the registry returns. Pairing
 * the static blueprint with its adapter in one shape means downstream code
 * can never get one without the other.
 */
export interface RegisteredBlueprint {
  readonly blueprint: CampaignBlueprint;
  readonly adapter: BlueprintAdapter;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * PRD-shape view of `dynamic_var_schema`:
 *   Record<string, "string" | "number" | "enum">
 *
 * Provided for any consumer that wants the bare type map without the
 * intake-side metadata.
 */
export function dynamicVarSchemaTypes(
  blueprint: CampaignBlueprint,
): Record<string, DynamicVarKind> {
  const out: Record<string, DynamicVarKind> = {};
  for (const [name, field] of Object.entries(blueprint.dynamic_var_schema)) {
    out[name] = field.kind;
  }
  return out;
}

export class BlueprintContractError extends Error {
  constructor(verticalId: string, reason: string) {
    super(`Blueprint "${verticalId}" violates contract: ${reason}`);
    this.name = "BlueprintContractError";
  }
}

export class NotImplementedError extends Error {
  constructor(what: string, ticket: string) {
    super(`${what} is not implemented yet (lands in ${ticket}).`);
    this.name = "NotImplementedError";
  }
}

/**
 * Runtime sanity-check on a blueprint. Called once per module at registry
 * load time so a malformed blueprint surfaces at import, not at dispatch.
 */
export function validateBlueprint(blueprint: CampaignBlueprint): void {
  const v = blueprint.vertical_id;

  if (!v || !/^[a-z][a-z0-9_]*$/.test(v)) {
    throw new BlueprintContractError(
      v || "<empty>",
      "vertical_id must be snake_case ASCII",
    );
  }
  if (!blueprint.flow_template_id) {
    throw new BlueprintContractError(
      v,
      "flow_template_id is required (provisioned in Ticket 2.5)",
    );
  }
  if (blueprint.persona_set.length === 0) {
    throw new BlueprintContractError(v, "persona_set cannot be empty");
  }
  if (blueprint.compliance_profile.max_call_minutes <= 0) {
    throw new BlueprintContractError(
      v,
      "compliance_profile.max_call_minutes must be > 0",
    );
  }
  if (!blueprint.win_condition.cta_type || !blueprint.win_condition.success_event) {
    throw new BlueprintContractError(v, "win_condition must have cta_type and success_event");
  }

  for (const [name, field] of Object.entries(blueprint.dynamic_var_schema)) {
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      throw new BlueprintContractError(
        v,
        `dynamic_var_schema key "${name}" must be snake_case`,
      );
    }
    if (field.kind === "enum" && (!field.options || field.options.length === 0)) {
      throw new BlueprintContractError(
        v,
        `dynamic_var_schema "${name}" is enum but has no options`,
      );
    }
    if (field.kind !== "enum" && field.options) {
      throw new BlueprintContractError(
        v,
        `dynamic_var_schema "${name}" has options but kind is "${field.kind}"`,
      );
    }
  }

  if (
    blueprint.target_audience === "consumer" &&
    !blueprint.compliance_profile.dnc_scrub_required
  ) {
    throw new BlueprintContractError(
      v,
      "consumer-audience blueprints must set dnc_scrub_required: true",
    );
  }
}
