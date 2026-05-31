import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DispatchNotReadyError, getBlueprint } from "../../../blueprints";
import { resolveAgentId, resolveFlowTemplateId } from "../flows";

const ENV_KEYS = [
  "RETELL_FLOW_TEMPLATE_B2B_LOCAL_SERVICES",
  "RETELL_AGENT_B2B_LOCAL_SERVICES",
];

describe("resolveFlowTemplateId / resolveAgentId", () => {
  const originals: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) originals[k] = process.env[k];
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (originals[k] === undefined) delete process.env[k];
      else process.env[k] = originals[k];
    }
  });

  it("prefers the env var for flow id when set", () => {
    process.env.RETELL_FLOW_TEMPLATE_B2B_LOCAL_SERVICES = "flow_from_env";
    const { blueprint } = getBlueprint("b2b_local_services");
    expect(resolveFlowTemplateId(blueprint)).toBe("flow_from_env");
  });

  it("throws DispatchNotReadyError when neither env nor blueprint has a flow id", () => {
    delete process.env.RETELL_FLOW_TEMPLATE_B2B_LOCAL_SERVICES;
    const { blueprint } = getBlueprint("b2b_local_services");
    // Blueprint ships with an empty flow_template_id pre-provision.
    expect(blueprint.flow_template_id).toBe("");
    expect(() => resolveFlowTemplateId(blueprint)).toThrow(DispatchNotReadyError);
  });

  it("throws DispatchNotReadyError when the agent env var is missing", () => {
    delete process.env.RETELL_AGENT_B2B_LOCAL_SERVICES;
    const { blueprint } = getBlueprint("b2b_local_services");
    expect(() => resolveAgentId(blueprint)).toThrow(DispatchNotReadyError);
  });

  it("returns the agent id when env var is set", () => {
    process.env.RETELL_AGENT_B2B_LOCAL_SERVICES = "agent_abc";
    const { blueprint } = getBlueprint("b2b_local_services");
    expect(resolveAgentId(blueprint)).toBe("agent_abc");
  });
});
