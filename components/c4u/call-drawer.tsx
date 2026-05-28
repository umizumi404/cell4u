"use client";

import {
  Button,
  Pill,
  TranscriptList,
  Waveform,
  formatTimer,
  type TranscriptTurn,
} from "./primitives";
import { STATE_LABELS, type Agent } from "./types";

/**
 * Call drawer. Ticket 7 wires the live transcript ticker to
 * `transcript_chunk` events from the campaign channel.
 *
 * Removed in Ticket 2: the hard-coded LIVE_SCRIPT fake. The component now
 * renders whatever transcript turns it's given (empty by default), so a
 * just-opened drawer reads as "live, no audio yet" rather than as a
 * canned demo.
 */

export function CallDrawer(props: {
  agent: Agent;
  onClose: () => void;
  onReview: () => void;
  /** Transcript turns delivered so far (Ticket 7 will source these). */
  transcript?: ReadonlyArray<TranscriptTurn>;
}) {
  return <CallDrawerInner key={props.agent.id} {...props} />;
}

function CallDrawerInner({
  agent,
  onClose,
  onReview,
  transcript = [],
}: {
  agent: Agent;
  onClose: () => void;
  onReview: () => void;
  transcript?: ReadonlyArray<TranscriptTurn>;
}) {
  const phoneFallback = `+1 (000) 000-0000`;
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
            {agent.archetype || "—"} · {formatTimer(agent.elapsed)} · {phone}
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
      <TranscriptList turns={[...transcript]} />
      <div className="c4u-drawer__foot">
        <Button variant="navy-on-dark" onClick={onReview}>
          Open full review
        </Button>
      </div>
    </div>
  );
}
