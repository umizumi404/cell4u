import { z } from "zod";

export const callStatusSchema = z.enum([
  "queued",
  "calling",
  "interested",
  "booked",
  "callback",
  "not_interested",
  "do_not_call",
  "failed",
]);

export const campaignStatusSchema = z.enum([
  "draft",
  "ready",
  "finding_leads",
  "calling",
  "paused",
  "completed",
]);

export const voiceIntakeSchema = z.object({
  transcript: z.string().min(12),
  businessName: z.string().min(1).nullable().optional(),
});

export const campaignBriefSchema = z.object({
  businessName: z.string().min(1),
  offer: z.string().min(1),
  targetCustomer: z.string().min(1),
  problemSolved: z.string().min(1),
  successCriteria: z.string().min(1),
  location: z.string().min(1),
  price: z.string().nullable(),
  notes: z.string().nullable(),
});

export const generatedPromptSchema = z.object({
  opener: z.string().min(1),
  masterPrompt: z.string().min(1),
  objections: z
    .array(
      z.object({
        objection: z.string().min(1),
        response: z.string().min(1),
      }),
    )
    .min(1),
  cta: z.string().min(1),
  qualificationQuestions: z.array(z.string().min(1)).min(1),
});

export const campaignSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  businessName: z.string(),
  offer: z.string(),
  targetCustomer: z.string(),
  problemSolved: z.string().nullable(),
  successCriteria: z.string().nullable(),
  location: z.string().nullable(),
  generatedPrompt: generatedPromptSchema.nullable(),
  status: campaignStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const leadSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  businessName: z.string(),
  phone: z.string(),
  address: z.string().nullable(),
  website: z.string().nullable(),
  rating: z.number().nullable(),
  userRatingCount: z.number().nullable(),
  status: callStatusSchema,
  sourcePlaceId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const callSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  campaignId: z.string().uuid(),
  providerCallId: z.string().nullable(),
  providerConversationId: z.string().nullable(),
  status: callStatusSchema,
  transcript: z.string().nullable(),
  recordingUrl: z.string().nullable(),
  summary: z.string().nullable(),
  outcome: callStatusSchema.nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const findLeadsRequestSchema = z.object({
  campaignId: z.string().uuid(),
  query: z.string().min(3),
  location: z.string().min(2),
  maxResults: z.number().int().min(1).max(20).default(12),
});

export const startCallsRequestSchema = z.object({
  campaignId: z.string().uuid(),
  leadIds: z.array(z.string().uuid()).min(1),
});

export const twilioWebhookSchema = z
  .object({
    CallSid: z.string().optional(),
    CallStatus: z.string().optional(),
    To: z.string().optional(),
    From: z.string().optional(),
    RecordingUrl: z.string().optional(),
    CallDuration: z.string().optional(),
  })
  .passthrough();

export const elevenLabsWebhookSchema = z
  .object({
    conversation_id: z.string().optional(),
    call_sid: z.string().optional(),
    transcript: z.string().optional(),
    summary: z.string().optional(),
    status: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export type CallStatus = z.infer<typeof callStatusSchema>;
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;
export type CampaignBrief = z.infer<typeof campaignBriefSchema>;
export type GeneratedPrompt = z.infer<typeof generatedPromptSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type Lead = z.infer<typeof leadSchema>;
export type Call = z.infer<typeof callSchema>;

export function normalizeProviderStatus(status: string | null | undefined): CallStatus {
  const normalized = status?.toLowerCase().replace(/[\s-]+/g, "_");

  switch (normalized) {
    case "queued":
    case "initiated":
    case "ringing":
      return "queued";
    case "answered":
    case "in_progress":
    case "calling":
      return "calling";
    case "booked":
    case "meeting_booked":
      return "booked";
    case "callback":
    case "call_back":
      return "callback";
    case "do_not_call":
    case "dnc":
      return "do_not_call";
    case "not_interested":
    case "busy":
    case "no_answer":
    case "completed":
      return "not_interested";
    case "failed":
    case "canceled":
      return "failed";
    case "interested":
    case "qualified":
      return "interested";
    default:
      return "queued";
  }
}
