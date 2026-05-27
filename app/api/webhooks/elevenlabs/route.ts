import { NextResponse } from "next/server";
import {
  elevenLabsWebhookSchema,
  normalizeProviderStatus,
} from "@/lib/domain/schemas";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const payload = elevenLabsWebhookSchema.parse(await request.json());
  const callSid = payload.call_sid;
  const conversationId = payload.conversation_id;
  const status = normalizeProviderStatus(payload.status);

  try {
    const supabase = createServiceClient();
    let query = supabase
      .from("calls")
      .select("id,campaign_id,lead_id")
      .limit(1);

    if (callSid) {
      query = query.eq("provider_call_id", callSid);
    } else if (conversationId) {
      query = query.eq("provider_conversation_id", conversationId);
    } else {
      return NextResponse.json({ received: true, stored: false });
    }

    const { data: calls } = await query;
    const call = calls?.[0];

    if (call) {
      await supabase
        .from("calls")
        .update({
          provider_conversation_id: conversationId ?? undefined,
          transcript: payload.transcript ?? undefined,
          summary: payload.summary ?? undefined,
          status,
          outcome: status,
          completed_at:
            status === "booked" ||
            status === "interested" ||
            status === "callback" ||
            status === "not_interested"
              ? new Date().toISOString()
              : undefined,
        })
        .eq("id", call.id);

      await supabase.from("leads").update({ status }).eq("id", call.lead_id);

      await supabase.from("call_events").insert({
        campaign_id: call.campaign_id,
        lead_id: call.lead_id,
        call_id: call.id,
        provider: "elevenlabs",
        event_type: payload.status ?? "conversation_update",
        payload,
      });
    }
  } catch {
    return NextResponse.json({ received: true, stored: false });
  }

  return NextResponse.json({ received: true, stored: true });
}
