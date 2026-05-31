/**
 * setVoice — mutate the Retell Agent's voice configuration.
 *
 * AGENTS.md invariant #7: the voice provider is a config field on
 * Retell, not a hardcoded import in our code. We never call Cartesia (or
 * any TTS provider) ourselves; we tell Retell to use a specific voice id
 * and Retell handles the audio.
 *
 * Provider is recorded here only for caller intent — Retell associates
 * voice ids with providers internally; mismatching the provider in this
 * call doesn't break anything, but lying about it would make logs
 * misleading.
 *
 * This is an admin operation: not for the call path. Use it from the
 * provisioning script or an offline ops task.
 */

import { getRetell } from "./client";

export type VoiceProvider = "cartesia" | "elevenlabs" | "openai" | "play-ht" | string;

export async function setVoice(
  agentId: string,
  provider: VoiceProvider,
  voiceId: string,
): Promise<void> {
  // Provider isn't a field on the Agent update — it's implicit in the
  // voice_id. We log it for traceability only.
  console.log(
    `[setVoice] agent=${agentId} provider=${provider} voice_id=${voiceId}`,
  );
  await getRetell().agent.update(agentId, { voice_id: voiceId });
}
