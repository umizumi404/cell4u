/**
 * Public surface of the runtime Retell integration.
 *
 * Provisioning utilities live in `scripts/provision/` — DO NOT import
 * from this module in that script (different lifecycle, different
 * invariants).
 */

export { getRetell, __resetRetellForTests } from "./client";
export {
  dispatchBatch,
  isE164,
  type DispatchBatchArgs,
  type DispatchBatchResult,
  type DispatchTask,
} from "./batch";
export {
  getFlow,
  republishFlow,
  resolveAgentId,
  resolveFlowTemplateId,
} from "./flows";
export { setVoice, type VoiceProvider } from "./voice";
export {
  RETELL_SIGNATURE_HEADER,
  WebhookVerificationError,
  verifyRetellWebhook,
} from "./webhook";
