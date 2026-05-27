import { NextResponse } from "next/server";
import { voiceIntakeSchema } from "@/lib/domain/schemas";
import {
  generateCampaignBrief,
  generateSalesPrompt,
} from "@/lib/integrations/openai";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const input = voiceIntakeSchema.parse(await request.json());
  const brief = await generateCampaignBrief(input.transcript);
  const prompt = await generateSalesPrompt(brief);

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        user_id: null,
        business_name: brief.businessName,
        offer: brief.offer,
        target_customer: brief.targetCustomer,
        problem_solved: brief.problemSolved,
        success_criteria: brief.successCriteria,
        location: brief.location,
        generated_prompt: prompt,
        status: "ready",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ mode: "live", campaign: data });
  } catch (error) {
    return NextResponse.json({
      mode: "preview",
      campaign: {
        ...brief,
        generatedPrompt: prompt,
      },
      warning:
        error instanceof Error
          ? error.message
          : "Supabase is not configured; returned generated preview only.",
    });
  }
}
