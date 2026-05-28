import { afterEach, describe, expect, it } from "vitest";

import {
  DispatchNotReadyError,
  assertDispatchReady,
  validateBlueprint,
  type CampaignBlueprint,
} from "../_types";

/**
 * Two-stage validation contract (AGENTS.md v2.2 patch):
 *   - validateBlueprint: structural, at module load. `flow_template_id`
 *     may be empty here.
 *   - assertDispatchReady: provisioning-readiness, at dispatch.
 *     `flow_template_id` and `RETELL_FROM_NUMBER` must both be set.
 */

function base(overrides: Partial<CampaignBlueprint> = {}): CampaignBlueprint {
  return {
    vertical_id: "test_vertical",
    lead_source_strategy: "test",
    target_audience: "business",
    compliance_profile: { dnc_scrub_required: false, max_call_minutes: 5 },
    persona_set: ["the_mentor"],
    flow_template_id: "",
    dynamic_var_schema: {},
    win_condition: { cta_type: "x", success_event: "book_meeting" },
    enrichment_recipe: "test",
    ...overrides,
  };
}

describe("validateBlueprint (structural)", () => {
  it("accepts a structurally-valid blueprint with empty flow_template_id", () => {
    expect(() => validateBlueprint(base())).not.toThrow();
  });

  it("rejects a non-snake_case vertical_id", () => {
    expect(() => validateBlueprint(base({ vertical_id: "BadName" }))).toThrow(
      /vertical_id/,
    );
  });

  it("rejects an empty persona_set", () => {
    expect(() => validateBlueprint(base({ persona_set: [] }))).toThrow(
      /persona_set/,
    );
  });

  it("rejects a consumer-audience blueprint without dnc_scrub_required", () => {
    expect(() =>
      validateBlueprint(
        base({
          target_audience: "consumer",
          compliance_profile: { dnc_scrub_required: false, max_call_minutes: 5 },
        }),
      ),
    ).toThrow(/dnc_scrub_required/);
  });

  it("rejects an enum field without options", () => {
    expect(() =>
      validateBlueprint(
        base({
          dynamic_var_schema: {
            choice: {
              kind: "enum",
              required: true,
              label: "Choice",
              prompt: "Pick one.",
            },
          },
        }),
      ),
    ).toThrow(/options/);
  });
});

describe("assertDispatchReady (provisioning)", () => {
  const ORIGINAL_FROM = process.env.RETELL_FROM_NUMBER;

  afterEach(() => {
    if (ORIGINAL_FROM === undefined) delete process.env.RETELL_FROM_NUMBER;
    else process.env.RETELL_FROM_NUMBER = ORIGINAL_FROM;
  });

  it("throws when flow_template_id is empty", () => {
    process.env.RETELL_FROM_NUMBER = "+15555550100";
    expect(() => assertDispatchReady(base())).toThrow(DispatchNotReadyError);
  });

  it("throws when RETELL_FROM_NUMBER is missing", () => {
    delete process.env.RETELL_FROM_NUMBER;
    expect(() =>
      assertDispatchReady(base({ flow_template_id: "flow_abc" })),
    ).toThrow(/RETELL_FROM_NUMBER/);
  });

  it("passes when both are set", () => {
    process.env.RETELL_FROM_NUMBER = "+15555550100";
    expect(() =>
      assertDispatchReady(base({ flow_template_id: "flow_abc" })),
    ).not.toThrow();
  });
});
