import type { CampaignBlueprint } from "../_types";

/**
 * Real-estate acquisition (B2C).
 *
 * Calls residential numbers — the most litigated area in telephony
 * (TCPA, federal + state DNC, state AI-disclosure laws). Per PRD §3 this
 * blueprint stays feature-flagged until `scrubLeads()` is implemented in
 * Ticket 5; the registry enforces the flag, not this module.
 *
 * Two compliance things land NOW even though the feature is dark:
 *   1. `dnc_scrub_required: true` — `validateBlueprint` enforces this for
 *      any consumer-audience blueprint, so we can't accidentally turn it off.
 *   2. `disclosure_line` — injected verbatim into the opening node by the
 *      flow generator (Ticket 2.5). The exact wording will be reviewed by
 *      counsel before launch; the placeholder is intentionally conservative.
 */

const FLOW_TEMPLATE_ID =
  process.env.RETELL_FLOW_TEMPLATE_REAL_ESTATE_ACQUISITION ?? "";

export const realEstateAcquisitionBlueprint: CampaignBlueprint = {
  vertical_id: "real_estate_acquisition",
  lead_source_strategy: "csv_import",
  target_audience: "consumer",
  compliance_profile: {
    dnc_scrub_required: true,
    disclosure_line:
      "Hi, this is an AI assistant calling on behalf of a property buyer — is now an okay time for a quick question?",
    max_call_minutes: 5,
  },
  persona_set: [
    "the_mentor",
    "the_smooth_operator",
  ],
  flow_template_id: FLOW_TEMPLATE_ID,
  dynamic_var_schema: {
    buyer_name: {
      kind: "string",
      required: true,
      label: "Your name (the buyer)",
      prompt: "What's the name we should give the homeowner if they ask who's calling for?",
      example: "Jordan from Maple Investments",
    },
    buyer_market: {
      kind: "string",
      required: true,
      label: "Market",
      prompt: "What city or county are you buying in?",
      example: "Cuyahoga County, OH",
    },
    property_criteria: {
      kind: "string",
      required: true,
      label: "Property criteria",
      prompt: "Briefly, what kind of properties are you looking for?",
      example: "3-bed single-family, off-market, any condition",
    },
    price_range: {
      kind: "string",
      required: false,
      label: "Price range",
      prompt: "Any price range you want the agent to mention if asked?",
      example: "$80k–$160k cash",
    },
    win_cta: {
      kind: "enum",
      required: true,
      label: "Goal of the call",
      prompt: "Are we asking for a callback or trying to set a property visit?",
      options: ["callback", "property_visit"],
    },
  },
  win_condition: {
    cta_type: "callback",
    success_event: "book_meeting",
  },
  enrichment_recipe: "csv_skip_trace_v0",
};
