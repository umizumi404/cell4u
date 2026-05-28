"use client";

import { useEffect, useMemo, useState } from "react";

import { AgentTile } from "./agent-tile";
import { CallDrawer } from "./call-drawer";
import { StatRow } from "./primitives";
import { tickAgent } from "./war-room-sim";
import type { Agent, Campaign } from "./types";

export function WarRoom({
  agents,
  setAgents,
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
  const [t0] = useState(() => Date.now());

  // Tile-state simulator. Drives queued → … → outcome transitions until
  // real Twilio webhooks land. See CLAUDE.md.
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = (Date.now() - t0) / 1000;
      setAgents(agents.map((a) => tickAgent(a, t)));
    }, 500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t0, agents.length]);

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
