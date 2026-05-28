"use client";

import { useMemo, useState } from "react";

import { useCampaignChannel } from "@/lib/realtime/client";

import { AgentTile } from "./agent-tile";
import { CallDrawer } from "./call-drawer";
import { StatRow } from "./primitives";
import type { Agent, Campaign } from "./types";

/**
 * War-room grid. Ticket 7 will wire `useCampaignChannel` to update tiles
 * from real `tile_update` events. The local `setAgents` setter is kept on
 * the props because the orchestrator still owns the array; this component
 * is render-only for v0's stripped skeleton.
 *
 * Removed in Ticket 2:
 *   - `war-room-sim.ts` / `tickAgent` (faked transitions)
 *   - the `setInterval(500ms)` simulator
 *   - filler-tile padding
 */

export function WarRoom({
  agents,
  campaign,
  fleetSize,
  onReviewCall,
}: {
  agents: Agent[];
  setAgents: (next: Agent[]) => void;
  campaign: Campaign;
  fleetSize: number;
  onReviewCall: (agent: Agent) => void;
}) {
  const [focusId, setFocusId] = useState<number | null>(null);

  // Subscribes to the campaign's realtime channel. v0 stub returns
  // `connected: false`; Ticket 7 fills in the handlers.
  useCampaignChannel(campaign?.id ?? null);

  const focusAgent = agents.find((a) => a.id === focusId) || null;

  const stats = useMemo(() => {
    const count = (s: Agent["state"]) =>
      agents.filter((a) => a.state === s).length;
    return [
      {
        label: "Live calls",
        value: count("connected") + count("pitch") + count("closing"),
        color: "var(--c4u-coral)",
      },
      {
        label: "Booked",
        value: count("closed-won"),
        color: "var(--state-closed-won)",
      },
      {
        label: "Voicemail",
        value: count("voicemail"),
        color: "var(--state-voicemail)",
      },
      {
        label: "No answer",
        value: count("no-answer"),
        color: "var(--state-no-answer)",
      },
      {
        label: "Queued",
        value: count("queued"),
        color: "var(--state-queued)",
      },
    ];
  }, [agents]);

  const headline = `${campaign?.url || "your fleet"} · ${
    agents.length
  } of ${fleetSize} deployed`;

  return (
    <div className="c4u-screen c4u-screen--dark">
      <div className="c4u-war">
        <div className="c4u-war__head">
          <div>
            <div
              className="c4u-eyebrow"
              style={{ color: "var(--c4u-coral)" }}
            >
              ● Live
            </div>
            <h2
              className="c4u-h3"
              style={{ color: "var(--c4u-snow)", marginTop: 4 }}
            >
              {headline}
            </h2>
          </div>
          <StatRow stats={stats} />
        </div>
        <div className="c4u-war__grid">
          {agents.map((a) => (
            <AgentTile
              key={a.id}
              agent={a}
              isFocused={a.id === focusId}
              onClick={() => setFocusId(a.id)}
            />
          ))}
        </div>
      </div>
      {focusAgent ? (
        <CallDrawer
          agent={focusAgent}
          onClose={() => setFocusId(null)}
          onReview={() => onReviewCall(focusAgent)}
        />
      ) : null}
    </div>
  );
}
