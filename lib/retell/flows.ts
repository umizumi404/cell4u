/**
 * Runtime helpers for Retell Conversation Flows.
 *
 * The provisioning script (Ticket 2.5) authors and publishes flows
 * out-of-band. This module is what request-path code reaches for when it
 * needs to know which flow id to use, or (rarely) to push a new version
 * of an existing flow.
 *
 * AGENTS.md invariant #3: published flows are immutable. To change a
 * flow, create a new version then publish. The SDK's `update(id, body)`
 * does exactly that under the hood — calling `update` IS the new-version
 * operation. We expose it under a name that makes the contract obvious.
 *
 * Invariant #5: vertical_id -> flow_template_id mapping lives in env
 * vars (set by provisioning) and is resolved through the blueprint, so
 * no caller hardcodes vertical names.
 */

import type Retell from "retell-sdk";

import {
  DispatchNotReadyError,
  type CampaignBlueprint,
} from "../../blueprints";

import { getRetell } from "./client";

/**
 * Resolve the published flow template id for a blueprint.
 *
 * The blueprint module sets `flow_template_id` to the empty string and
 * the env var (e.g. `RETELL_FLOW_TEMPLATE_B2B_LOCAL_SERVICES`) carries
 * the actual value, set by the provisioning script. We prefer the env
 * var because it's the source of truth post-provision; the blueprint
 * field is the source of truth pre-provision (and is what
 * `assertDispatchReady` reads from when validating).
 */
export function resolveFlowTemplateId(blueprint: CampaignBlueprint): string {
  const envKey = flowEnvKeyFor(blueprint.vertical_id);
  const fromEnv = envKey ? process.env[envKey] : undefined;
  const id = fromEnv && fromEnv.length > 0 ? fromEnv : blueprint.flow_template_id;
  if (!id) {
    throw new DispatchNotReadyError(
      blueprint.vertical_id,
      `flow template id is unset (looked in env ${envKey ?? "<no mapping>"} and blueprint.flow_template_id)`,
    );
  }
  return id;
}

/**
 * Resolve the published Agent id for a blueprint. Agents wrap the flow
 * with a voice and the events webhook URL; BatchCall dispatches through
 * the Agent, not the flow. Provisioning sets these.
 */
export function resolveAgentId(blueprint: CampaignBlueprint): string {
  const envKey = agentEnvKeyFor(blueprint.vertical_id);
  const fromEnv = envKey ? process.env[envKey] : undefined;
  if (!fromEnv) {
    throw new DispatchNotReadyError(
      blueprint.vertical_id,
      `agent id is unset (looked in env ${envKey ?? "<no mapping>"})`,
    );
  }
  return fromEnv;
}

function flowEnvKeyFor(verticalId: string): string | undefined {
  switch (verticalId) {
    case "b2b_local_services":
      return "RETELL_FLOW_TEMPLATE_B2B_LOCAL_SERVICES";
    case "real_estate_acquisition":
      return "RETELL_FLOW_TEMPLATE_REAL_ESTATE_ACQUISITION";
    default:
      return undefined;
  }
}

function agentEnvKeyFor(verticalId: string): string | undefined {
  switch (verticalId) {
    case "b2b_local_services":
      return "RETELL_AGENT_B2B_LOCAL_SERVICES";
    case "real_estate_acquisition":
      return "RETELL_AGENT_REAL_ESTATE_ACQUISITION";
    default:
      return undefined;
  }
}

/**
 * Pass-through retrieve.
 */
export async function getFlow(flowId: string): Promise<Retell.ConversationFlowResponse> {
  return getRetell().conversationFlow.retrieve(flowId);
}

/**
 * Republish a flow as a new version (AGENTS.md invariant #3). Wraps
 * `update`, which versions under the hood. This is intentionally NOT
 * exposed to request-path code — callable only from offline tasks
 * (e.g. a future blueprint-aware re-author script).
 */
export async function republishFlow(
  flowId: string,
  patch: Retell.ConversationFlowUpdateParams,
): Promise<Retell.ConversationFlowResponse> {
  return getRetell().conversationFlow.update(flowId, patch);
}
