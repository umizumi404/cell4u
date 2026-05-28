/**
 * Realtime: `@upstash/realtime` over Upstash Redis streams.
 *
 * Why this module exists:
 *   - AGENTS.md invariant #1: Vercel cannot host a WebSocket server. Server->
 *     browser realtime goes through `@upstash/realtime` (HTTP/SSE over Redis
 *     streams) or a self-owned SSE Edge route backed by Upstash.
 *   - Invariant #11: every campaign has an id. We never broadcast globally —
 *     each campaign is its own channel.
 *
 * What lives here:
 *   - The single shared `Realtime` instance with the project's event schema.
 *   - `campaignChannel(campaignId)` so callers don't string-concat channel names.
 *   - `publishTileUpdate` — the only writer the dispatcher / webhook handlers
 *     are expected to call for war-room tile state.
 *
 * Token discipline:
 *   - Server-side code uses `UPSTASH_REDIS_REST_TOKEN` (full access).
 *   - Browser subscribes should use `UPSTASH_REDIS_READONLY_TOKEN` exclusively
 *     (or proxy through an Edge SSE route). Never ship the write token to a
 *     client bundle.
 */

import { Realtime } from "@upstash/realtime";
import { Redis } from "@upstash/redis";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Event schema                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Tile state mirrors `AgentState` in components/c4u/types.ts. Kept loose
 * (string) here to avoid a cycle; war-room.tsx narrows it at the subscribe
 * site. Promote to a const-union after Ticket 7 if it stays stable.
 */
export const tileUpdateSchema = z.object({
  campaignId: z.string(),
  agentId: z.union([z.string(), z.number()]),
  state: z.string(),
  elapsed: z.number().optional(),
  archetype: z.string().optional(),
  outcome: z.string().optional(),
  /** Server-side wall-clock timestamp, ms since epoch. */
  ts: z.number(),
});
export type TileUpdate = z.infer<typeof tileUpdateSchema>;

export const transcriptChunkSchema = z.object({
  campaignId: z.string(),
  callId: z.string(),
  role: z.enum(["agent", "lead"]),
  text: z.string(),
  ts: z.number(),
});
export type TranscriptChunk = z.infer<typeof transcriptChunkSchema>;

export const realtimeSchema = {
  tile_update: tileUpdateSchema,
  transcript_chunk: transcriptChunkSchema,
} as const;

/* -------------------------------------------------------------------------- */
/* Singleton                                                                  */
/* -------------------------------------------------------------------------- */

// The Realtime generic is invariant in its Opts argument, so we let TS
// infer it from the constructor call rather than naming a synthetic
// generic that doesn't quite match.
function createRealtime() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    );
  }
  return new Realtime({
    redis: new Redis({ url, token }),
    schema: realtimeSchema,
    history: { maxLength: 500 },
  });
}

let _realtime: ReturnType<typeof createRealtime> | null = null;

function getRealtime(): ReturnType<typeof createRealtime> {
  if (!_realtime) _realtime = createRealtime();
  return _realtime;
}

/* -------------------------------------------------------------------------- */
/* Channel naming                                                             */
/* -------------------------------------------------------------------------- */

export function campaignChannelName(campaignId: string): string {
  if (!campaignId) throw new Error("campaignId is required");
  return `campaign:${campaignId}`;
}

function campaignChannel(campaignId: string) {
  return getRealtime().channel(campaignChannelName(campaignId));
}

/* -------------------------------------------------------------------------- */
/* Publishers                                                                 */
/* -------------------------------------------------------------------------- */

export async function publishTileUpdate(update: Omit<TileUpdate, "ts">): Promise<void> {
  await campaignChannel(update.campaignId).emit("tile_update", {
    ...update,
    ts: Date.now(),
  });
}

export async function publishTranscriptChunk(
  chunk: Omit<TranscriptChunk, "ts">,
): Promise<void> {
  await campaignChannel(chunk.campaignId).emit("transcript_chunk", {
    ...chunk,
    ts: Date.now(),
  });
}
