import { NextResponse } from "next/server";
import {
  campaignBriefSchema,
  generatedPromptSchema,
  startCallsRequestSchema,
} from "@/lib/domain/schemas";
import { startElevenLabsCall } from "@/lib/integrations/elevenlabs";
import { createServiceClient } from "@/lib/supabase/server";

type CampaignRow = {
  id: string;
  business_name: string;
  offer: string;
  target_customer: string;
  problem_solved: string | null;
  success_criteria: string | null;
  location: string | null;
  generated_prompt: unknown;
};

type LeadRow = {
  id: string;
  campaign_id: string;
  business_name: string;
  phone: string;
};

export async function POST(request: Request) {
  const input = startCallsRequestSchema.parse(await request.json());

  try {
    const supabase = createServiceClient();
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select(
        "id,business_name,offer,target_customer,problem_solved,success_criteria,location,generated_prompt",
      )
      .eq("id", input.campaignId)
      .single<CampaignRow>();

    if (campaignError) {
      throw campaignError;
    }

    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id,campaign_id,business_name,phone")
      .in("id", input.leadIds)
      .returns<LeadRow[]>();

    if (leadsError) {
      throw leadsError;
    }

    const brief = campaignBriefSchema.parse({
      businessName: campaign.business_name,
      offer: campaign.offer,
      targetCustomer: campaign.target_customer,
      problemSolved: campaign.problem_solved ?? "",
      successCriteria: campaign.success_criteria ?? "Booked meeting",
      location: campaign.location ?? "",
      price: null,
      notes: null,
    });
    const prompt = generatedPromptSchema.parse(campaign.generated_prompt);

    const results = await Promise.all(
      leads.map(async (lead) => {
        const { data: call, error: callError } = await supabase
          .from("calls")
          .insert({
            campaign_id: input.campaignId,
            lead_id: lead.id,
            status: "queued",
          })
          .select()
          .single();

        if (callError) {
          throw callError;
        }

        const provider = await startElevenLabsCall({
          lead: {
            businessName: lead.business_name,
            phone: lead.phone,
          },
          brief,
          prompt,
        });

        if (provider.callSid || provider.conversationId) {
          await supabase
            .from("calls")
            .update({
              provider_call_id: provider.callSid,
              provider_conversation_id: provider.conversationId,
              status: "calling",
              started_at: new Date().toISOString(),
            })
            .eq("id", call.id);

          await supabase
            .from("leads")
            .update({ status: "calling" })
            .eq("id", lead.id);
        }

        return { callId: call.id, leadId: lead.id, provider };
      }),
    );

    return NextResponse.json({ mode: "live", results });
  } catch (error) {
    return NextResponse.json(
      {
        mode: "preview",
        results: [],
        warning:
          error instanceof Error
            ? error.message
            : "Calling could not be started.",
      },
      { status: 200 },
    );
  }
}
