/**
 * Agent provisioning.
 *
 * Retell's BatchCall API dispatches through an Agent (which wraps a
 * voice_id + a response engine — for us, a Conversation Flow). Per
 * AGENTS.md invariant #10, Agents are provisioned out-of-band, not
 * lazily at request time. One Agent per template flow.
 *
 * The Agent also carries the events webhook URL (call_started,
 * call_ended, call_analyzed, transcript_updated). We bake the concrete
 * URL at provision time because Retell does not template-render the
 * webhook field at call time.
 */

import type Retell from "retell-sdk";

export interface AgentBuildArgs {
  /** Human label for the Retell dashboard. */
  name: string;
  /** Conversation Flow id this agent wraps. */
  conversationFlowId: string;
  /** Voice id (Cartesia, configured in Retell — invariant #7). */
  voiceId: string;
  /** Concrete URL where /api/webhooks/retell/events is served. */
  eventsWebhookUrl: string;
}

export function buildAgentParams(
  args: AgentBuildArgs,
): Retell.AgentCreateParams {
  return {
    agent_name: args.name,
    voice_id: args.voiceId,
    response_engine: {
      type: "conversation-flow",
      conversation_flow_id: args.conversationFlowId,
    },
    webhook_url: args.eventsWebhookUrl,
    webhook_events: [
      "call_started",
      "call_ended",
      "call_analyzed",
      "transcript_updated",
    ],
  };
}
