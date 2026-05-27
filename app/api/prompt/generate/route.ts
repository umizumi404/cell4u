import { NextResponse } from "next/server";
import { campaignBriefSchema } from "@/lib/domain/schemas";
import { generateSalesPrompt } from "@/lib/integrations/openai";

export async function POST(request: Request) {
  const brief = campaignBriefSchema.parse(await request.json());
  const prompt = await generateSalesPrompt(brief);

  return NextResponse.json({ prompt });
}
