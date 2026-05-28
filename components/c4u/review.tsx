"use client";

import { Pill, TranscriptList, type TranscriptTurn } from "./primitives";
import type { Agent } from "./types";

/**
 * Call review. Ticket 7 threads the real `Call` record (transcript,
 * recordingUrl, summary, outcome) into this component.
 *
 * Removed in Ticket 2: REVIEW_TRANSCRIPT, the synthetic 87/100 score, the
 * recording waveform with fake duration, and the "Variant X" label. The
 * component now renders an explicit empty state instead of canned content
 * — AGENTS.md invariant #6: outcomes and scores must never be faked.
 */

export interface CallReviewData {
  readonly transcript?: ReadonlyArray<TranscriptTurn>;
  readonly outcomeLabel?: string;
  readonly summary?: string;
  readonly recordingUrl?: string | null;
}

export function Review({
  agent,
  data,
  onBack,
}: {
  agent: Agent | null;
  data?: CallReviewData;
  onBack: () => void;
}) {
  const businessName = agent?.business ?? "Call review";
  const archetype = agent?.archetype ?? "";
  const phone = agent?.phone ?? "";
  const transcript = data?.transcript ?? [];

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
            Call review{archetype ? ` · ${archetype}` : ""}
          </div>
          <h1 className="c4u-h2" style={{ marginTop: 4 }}>
            {businessName}
          </h1>
          <div className="c4u-review__meta">
            {data?.outcomeLabel ? (
              <Pill state="closed-won" label={data.outcomeLabel} />
            ) : (
              <Pill state="queued" label="No outcome yet" />
            )}
            {phone ? <span className="c4u-small">{phone}</span> : null}
          </div>
        </div>

        <div className="c4u-card c4u-review__transcript">
          <div className="c4u-eyebrow">Transcript</div>
          {transcript.length > 0 ? (
            <TranscriptList turns={[...transcript]} />
          ) : (
            <p className="c4u-small" style={{ marginTop: 8 }}>
              Transcript will appear here once the call is analyzed.
            </p>
          )}
        </div>

        {data?.summary ? (
          <div className="c4u-card">
            <div className="c4u-eyebrow">Summary</div>
            <p className="c4u-small" style={{ marginTop: 8 }}>
              {data.summary}
            </p>
          </div>
        ) : null}

        {data?.recordingUrl ? (
          <div className="c4u-card">
            <div className="c4u-eyebrow">Recording</div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={data.recordingUrl} style={{ width: "100%" }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
