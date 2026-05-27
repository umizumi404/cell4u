import {
  campaignBriefSchema,
  generatedPromptSchema,
  type CampaignBrief,
  type GeneratedPrompt,
} from "@/lib/domain/schemas";

function fallbackBrief(transcript: string): CampaignBrief {
  return {
    businessName: "Cell For You Campaign",
    offer: transcript.slice(0, 140),
    targetCustomer: "Local businesses matching the spoken description",
    problemSolved: "The target customer has demand but limited outbound follow-up.",
    successCriteria: "Booked meeting or explicit purchase intent",
    location: "User-specified market",
    price: null,
    notes: transcript,
  };
}

export function fallbackPrompt(brief: CampaignBrief): GeneratedPrompt {
  return {
    opener: `Hi, this is an AI assistant calling about ${brief.offer}. I had one quick question for the owner.`,
    masterPrompt: `You are a professional outbound sales agent for ${brief.businessName}. Speak naturally, qualify whether ${brief.targetCustomer} have the problem "${brief.problemSolved}", handle objections without pressure, and ask for ${brief.successCriteria}.`,
    objections: [
      {
        objection: "We are not interested.",
        response:
          "Understood. Before I let you go, is that because the timing is wrong or because this is not a priority at all?",
      },
      {
        objection: "Send me information.",
        response:
          "Absolutely. The most useful next step is a short call so the information matches what you actually need.",
      },
    ],
    cta: brief.successCriteria,
    qualificationQuestions: [
      "Is this a current priority for the business?",
      "Who normally decides on this kind of purchase?",
      "Would a short follow-up meeting be useful?",
    ],
  };
}

function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as { output_text?: unknown; output?: unknown };
  if (typeof record.output_text === "string") {
    return record.output_text;
  }

  if (Array.isArray(record.output)) {
    for (const item of record.output) {
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) {
        continue;
      }
      for (const part of content) {
        const text = (part as { text?: unknown }).text;
        if (typeof text === "string") {
          return text;
        }
      }
    }
  }

  return null;
}

async function createStructuredOutput<T>({
  instructions,
  input,
  schemaName,
  schema,
  fallback,
}: {
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
  fallback: T;
}): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      instructions,
      input,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!response.ok) {
    return fallback;
  }

  const payload = await response.json();
  const outputText = extractOutputText(payload);

  if (!outputText) {
    return fallback;
  }

  return JSON.parse(outputText) as T;
}

export async function generateCampaignBrief(
  transcript: string,
): Promise<CampaignBrief> {
  const fallback = fallbackBrief(transcript);
  const result = await createStructuredOutput({
    instructions:
      "Extract a concise outbound sales campaign brief from the user's spoken input. Preserve specific market, offer, customer, price, and success criteria when present.",
    input: transcript,
    schemaName: "campaign_brief",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        businessName: { type: "string" },
        offer: { type: "string" },
        targetCustomer: { type: "string" },
        problemSolved: { type: "string" },
        successCriteria: { type: "string" },
        location: { type: "string" },
        price: { type: "string" },
        notes: { type: "string" },
      },
      required: [
        "businessName",
        "offer",
        "targetCustomer",
        "problemSolved",
        "successCriteria",
        "location",
        "price",
        "notes",
      ],
    },
    fallback,
  });

  return campaignBriefSchema.parse(result);
}

export async function generateSalesPrompt(
  brief: CampaignBrief,
): Promise<GeneratedPrompt> {
  const fallback = fallbackPrompt(brief);
  const result = await createStructuredOutput({
    instructions:
      "Create a professional outbound AI voice sales prompt. Be concise, natural, compliant, and focused on qualification and meeting booking.",
    input: JSON.stringify(brief),
    schemaName: "sales_prompt",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        opener: { type: "string" },
        masterPrompt: { type: "string" },
        objections: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              objection: { type: "string" },
              response: { type: "string" },
            },
            required: ["objection", "response"],
          },
        },
        cta: { type: "string" },
        qualificationQuestions: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: [
        "opener",
        "masterPrompt",
        "objections",
        "cta",
        "qualificationQuestions",
      ],
    },
    fallback,
  });

  return generatedPromptSchema.parse(result);
}
