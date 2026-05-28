/**
 * Client-side realtime subscribe helper.
 *
 * AGENTS.md invariant #1: never expose the write token to the browser.
 * This module is `"use client"` and must only ever read the read-only
 * token (or, preferred for production, subscribe through a self-owned
 * SSE Edge route that proxies the stream).
 *
 * v0 implementation: stubbed surface. Ticket 7 wires the real
 * `useCampaignChannel` against `@upstash/realtime/client` once we decide
 * between direct read-only-token subscribes and proxied SSE. Keeping the
 * stub here so component code can already import the expected shape.
 */

"use client";

import { useEffect, useState } from "react";

import type { TileUpdate, TranscriptChunk } from "./index";

export type CampaignChannelEvents = {
  tile_update: TileUpdate;
  transcript_chunk: TranscriptChunk;
};

export interface CampaignChannelState {
  readonly connected: boolean;
  readonly lastError: string | null;
}

/**
 * v0 stub: returns a never-connecting state. Components should not crash
 * when they mount before Ticket 7 wires the real subscription.
 */
export function useCampaignChannel(
  _campaignId: string | null,
  _handlers: Partial<{
    onTileUpdate: (e: TileUpdate) => void;
    onTranscriptChunk: (e: TranscriptChunk) => void;
  }> = {},
): CampaignChannelState {
  const [state] = useState<CampaignChannelState>({
    connected: false,
    lastError: null,
  });

  useEffect(() => {
    // Intentionally empty in v0. Real subscription lands in Ticket 7.
  }, []);

  return state;
}
