import type { CampaignBrief, GeneratedPrompt, Lead } from "@/lib/domain/schemas";

type ElevenLabsOutboundResponse = {
  success?: boolean;
  callSid?: string;
  conversationId?: string;
  conversation_id?: string;
};

export async function startElevenLabsCall({
  lead,
  brief,
  prompt,
}: {
  lead: Pick<Lead, "businessName" | "phone">;
  brief: CampaignBrief;
  prompt: GeneratedPrompt;
}) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const agentPhoneNumberId = process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID;

  if (!apiKey || !agentId || !agentPhoneNumberId) {
    return {
      success: false,
      callSid: null,
      conversationId: null,
      skipped: "ElevenLabs credentials are not configured.",
    };
  }

  const response = await fetch(
    "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        agent_id: agentId,
        agent_phone_number_id: agentPhoneNumberId,
        to_number: lead.phone,
        call_recording_enabled: true,
        conversation_initiation_client_data: {
          conversation_config_override: {
            agent: {
              first_message: prompt.opener,
              prompt: {
                prompt: prompt.masterPrompt,
              },
            },
          },
          dynamic_variables: {
            business_name: lead.businessName,
            offer: brief.offer,
            target_customer: brief.targetCustomer,
            cta: prompt.cta,
          },
        },
        telephony_call_config: {
          ringing_timeout_secs: 45,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs outbound call failed: ${response.status}`);
  }

  const payload = (await response.json()) as ElevenLabsOutboundResponse;

  return {
    success: Boolean(payload.success ?? true),
    callSid: payload.callSid ?? null,
    conversationId: payload.conversationId ?? payload.conversation_id ?? null,
    skipped: null,
  };
}
