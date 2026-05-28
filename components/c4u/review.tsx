"use client";

import {
  AudioScrubber,
  Pill,
  TranscriptList,
  Waveform,
  type TranscriptTurn,
} from "./primitives";
import type { Agent } from "./types";

// NOTE: Review-screen data (transcript, score, recording) is currently
// hard-coded fake content. Real recordings + scoring depend on a
// post-call pipeline we haven't built yet. See CLAUDE.md → "Review data".
const REVIEW_TRANSCRIPT: TranscriptTurn[] = [
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
  {
    who: "lead",
    ts: "00:36",
    text: "That actually sounds useful. Can you send me a calendar link?",
    initials: "ML",
    speaker: "Maple Studio",
  },
  {
    who: "agent",
    ts: "00:41",
    text: "Yes, let me book it directly. How does Tuesday at 2pm look?",
  },
  {
    who: "lead",
    ts: "00:48",
    text: "Tuesday works.",
    initials: "ML",
    speaker: "Maple Studio",
  },
  {
    who: "agent",
    ts: "00:51",
    text: "Great — sending a confirmation now. Thanks for your time.",
  },
];

export function Review({
  agent,
  onBack,
}: {
  agent: Agent | null;
  onBack: () => void;
}) {
  const a = agent ?? {
    business: "Maple Studio Yoga",
    variant: "B" as const,
  };
  const phoneFallback = agent?.phone || "+1 (416) 555-0142";
  return (
    <div className="c4u-screen c4u-screen--cream">
      <div className="c4u-review">
        <div className="c4u-review__head">
          <button
            type="button"
            className="c4u-btn c4u-btn--quiet c4u-btn--sm"
            onClick={onBack}
          >
            ← Back to live
          </button>
          <div className="c4u-eyebrow" style={{ marginTop: 12 }}>
            Call review · Variant {a.variant}
          </div>
          <h1 className="c4u-h2" style={{ marginTop: 4 }}>
            {a.business}
          </h1>
          <div className="c4u-review__meta">
            <Pill state="closed-won" label="Booked discovery call" />
            <span className="c4u-small">Tuesday 2:00 PM · 15 min</span>
            <span className="c4u-small">{phoneFallback}</span>
          </div>
        </div>

        <div className="c4u-review__grid">
          <div className="c4u-card c4u-review__player">
            <div className="c4u-eyebrow">Recording</div>
            <Waveform
              bars={64}
              active={false}
              height={64}
              color="var(--c4u-navy)"
            />
            <AudioScrubber progress={0.42} duration={174} />
            <div className="c4u-review__playermeta">
              <span className="c4u-mono">
                2 min 54 sec · 12 turns · variant {a.variant} (direct opener) · simulated
              </span>
            </div>
          </div>

          <div className="c4u-card c4u-review__score">
            <div className="c4u-eyebrow">Quality</div>
            <div className="c4u-review__bignum">
              87<span>/100</span>
            </div>
            <div className="c4u-score-row">
              <span>Stayed on script</span>
              <span className="c4u-mono">94</span>
            </div>
            <div className="c4u-score-row">
              <span>Handled objection</span>
              <span className="c4u-mono">82</span>
            </div>
            <div className="c4u-score-row">
              <span>Booked next step</span>
              <span className="c4u-mono">100</span>
            </div>
          </div>
        </div>

        <div className="c4u-card c4u-review__transcript">
          <div className="c4u-eyebrow">Transcript</div>
          <TranscriptList turns={REVIEW_TRANSCRIPT} />
        </div>
      </div>
    </div>
  );
}
