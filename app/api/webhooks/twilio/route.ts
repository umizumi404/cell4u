import { NextResponse } from "next/server";
import {
  normalizeProviderStatus,
  twilioWebhookSchema,
} from "@/lib/domain/schemas";
import { validateTwilioRequest } from "@/lib/integrations/twilio";
import { createServiceClient } from "@/lib/supabase/server";

function getPublicUrl(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    url.host = forwardedHost;
  }

  if (forwardedProto) {
    url.protocol = `${forwardedProto}:`;
  }

  return url.toString();
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const params = Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, String(value)]),
  );
  const payload = twilioWebhookSchema.parse(params);

  if (process.env.TWILIO_AUTH_TOKEN) {
    const isValid = validateTwilioRequest({
      signature: request.headers.get("x-twilio-signature"),
      url: getPublicUrl(request),
      params,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid Twilio signature" }, { status: 401 });
    }
  }

  const callSid = payload.CallSid;
  const status = normalizeProviderStatus(payload.CallStatus);

  if (!callSid) {
    return NextResponse.json({ received: true });
  }

  try {
    const supabase = createServiceClient();
    const { data: call } = await supabase
      .from("calls")
      .select("id,campaign_id,lead_id")
      .eq("provider_call_id", callSid)
      .maybeSingle();

    if (call) {
      await supabase
        .from("calls")
        .update({
          status,
          recording_url: payload.RecordingUrl ?? null,
          completed_at:
            status === "failed" || status === "not_interested"
              ? new Date().toISOString()
              : null,
        })
        .eq("id", call.id);

      await supabase.from("leads").update({ status }).eq("id", call.lead_id);

      await supabase.from("call_events").insert({
        campaign_id: call.campaign_id,
        lead_id: call.lead_id,
        call_id: call.id,
        provider: "twilio",
        event_type: payload.CallStatus ?? "unknown",
        payload,
      });
    }
  } catch {
    return NextResponse.json({ received: true, stored: false });
  }

  return NextResponse.json({ received: true, stored: true });
}
