"use client";

import { useEffect, useState } from "react";

import {
  Button,
  Pill,
  TranscriptList,
  Waveform,
  formatTimer,
  type TranscriptTurn,
} from "./primitives";
import { STATE_LABELS, type Agent } from "./types";

// NOTE: live call transcript is faked — real Twilio call recording +
// transcription will replace LIVE_SCRIPT once the call-status webhook
// pipeline lands. See CLAUDE.md → "Live call transcript".
const LIVE_SCRIPT: TranscriptTurn[] = [
  {
    who: "agent",
    ts: "00:02",
    text: "Hi, this is Sam calling from webpro.agency. Quick one — do you currently work with anyone for your website?",
  },
  {
    who: "lead",
    ts: "00:08",
    text: "We have someone in-house actually, but they're really backed up.",
    initials: "ML",
    speaker: "Maple Studio",
  },
  {
    who: "agent",
    ts: "00:14",
    text: "Got it. We're built for overflow — 30 seconds for how that works?",
  },
  {
    who: "lead",
    ts: "00:18",
    text: "Sure, I've got a minute.",
    initials: "ML",
    speaker: "Maple Studio",
  },
  {
    who: "agent",
    ts: "00:21",
    text: "Most studios like yours hand us the work that's blocking releases — we turn around builds in 5 days, $8–15k. We could book you in next week.",
  },
];

export function CallDrawer(props: {
  agent: Agent;
  onClose: () => void;
  onReview: () => void;
}) {
  // Remount the inner component when the focused agent changes so the
  // transcript reveal restarts cleanly without a setState-in-effect.
  return <CallDrawerInner key={props.agent.id} {...props} />;
}

function CallDrawerInner({
  agent,
  onClose,
  onReview,
}: {
  agent: Agent;
  onClose: () => void;
  onReview: () => void;
}) {
  const [revealed, setRevealed] = useState(1);
  useEffect(() => {
    const id = window.setInterval(
      () => setRevealed((n) => Math.min(n + 1, LIVE_SCRIPT.length)),
      1500,
    );
    return () => window.clearInterval(id);
  }, []);

  const turns = LIVE_SCRIPT.slice(0, revealed);
  const phoneFallback = `+1 (416) 555-${((agent.id * 31 + 142) % 10000)
    .toString()
    .padStart(4, "0")}`;
  const phone = agent.phone || phoneFallback;

  return (
    <div className="c4u-drawer">
      <div className="c4u-drawer__head">
        <div>
          <Pill
            state={agent.state}
            label={STATE_LABELS[agent.state] || agent.state}
            variant="dark"
          />
          <h3
            className="c4u-h4"
            style={{ color: "var(--c4u-snow)", marginTop: 8 }}
          >
            {agent.business}
          </h3>
          <div
            className="c4u-small"
            style={{ color: "var(--c4u-mist)", marginTop: 4 }}
          >
            Variant {agent.variant} · {formatTimer(agent.elapsed)} · {phone}
          </div>
        </div>
        <button
          type="button"
          className="c4u-drawer__close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="c4u-drawer__wave">
        <Waveform bars={48} active height={50} color="var(--c4u-coral)" />
      </div>
      <TranscriptList turns={turns} />
      <div className="c4u-drawer__foot">
        <Button variant="navy-on-dark" onClick={onReview}>
          Open full review
        </Button>
      </div>
    </div>
  );
}
