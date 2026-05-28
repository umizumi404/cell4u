"use client";

import { formatTimer } from "./primitives";
import { STATE_LABELS, type Agent } from "./types";

export function AgentTile({
  agent,
  onClick,
  isFocused,
}: {
  agent: Agent;
  onClick?: () => void;
  isFocused?: boolean;
}) {
  const cls = `c4u-tile c4u-tile--${agent.state} ${
    isFocused ? "is-focused" : ""
  }`;
  return (
    <button className={cls} onClick={onClick} type="button">
      <div className="c4u-tile__biz">{agent.business}</div>
      <div className="c4u-tile__var">{agent.archetype || "—"}</div>
      <div className="c4u-tile__meta">
        <span className="c4u-tile__stage">
          {STATE_LABELS[agent.state] || agent.state}
        </span>
        <span className="c4u-tile__timer">{formatTimer(agent.elapsed)}</span>
      </div>
    </button>
  );
}
