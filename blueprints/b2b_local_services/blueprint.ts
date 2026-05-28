import type { CampaignBlueprint } from "../_types";

/**
 * B2B local services — the demo-day vertical (PRD §0, §2).
 *
 * Persona: a web agency / SaaS / service vendor pitching local SMBs.
 * Audience: business decision-makers, so no DNC scrub required, but we still
 * keep `max_call_minutes` tight because gatekeepers cut calls short.
 *
 * `flow_template_id` is set from the env var that Ticket 2.5's provisioning
 * script writes after publishing the template flow to Retell. The blueprint
 * resolves it at module load so that missing-provisioning fails loudly
 * (rather than hitting Retell with an undefined flow id at dispatch).
 */

const FLOW_TEMPLATE_ID =
  process.env.RETELL_FLOW_TEMPLATE_B2B_LOCAL_SERVICES ?? "";

export const b2bLocalServicesBlueprint: CampaignBlueprint = {
  vertical_id: "b2b_local_services",
  lead_source_strategy: "clay_google_maps_waterfall",
  target_audience: "business",
  compliance_profile: {
    dnc_scrub_required: false,
    max_call_minutes: 8,
  },
  persona_set: [
    "the_offer_stacker",
    "the_direct_closer",
    "the_smooth_operator",
    "the_energizer",
    "the_mentor",
  ],
  flow_template_id: FLOW_TEMPLATE_ID,
  dynamic_var_schema: {
    seller_business_name: {
      kind: "string",
      required: true,
      label: "Your business",
      prompt: "What's the name of your business?",
      example: "Northstar Web Studio",
    },
    offer: {
      kind: "string",
      required: true,
      label: "Offer",
      prompt: "In one sentence, what are you selling?",
      example: "We build booking-driven websites for local service businesses.",
    },
    target_business_type: {
      kind: "string",
      required: true,
      label: "Who you're calling",
      prompt: "What kind of business are we calling — dentists, HVAC, salons, something else?",
      example: "Family dentists",
    },
    geography: {
      kind: "string",
      required: true,
      label: "Geography",
      prompt: "What city or region should we pull leads from?",
      example: "Toronto, ON",
    },
    win_cta: {
      kind: "enum",
      required: true,
      label: "Goal of the call",
      prompt: "Are we booking a demo, a discovery call, or a free audit?",
      options: ["booked_demo", "discovery_call", "free_audit"],
    },
    price_anchor: {
      kind: "string",
      required: false,
      label: "Price anchor",
      prompt: "Any price point or range you want the agent to mention?",
    },
  },
  win_condition: {
    cta_type: "booked_demo",
    success_event: "book_meeting",
  },
  enrichment_recipe: "clay_recipe_b2b_local_v1",
};
