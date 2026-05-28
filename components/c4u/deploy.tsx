"use client";

import { Button } from "./primitives";
import type { Profile } from "./types";

export function Deploy({
  profile,
  fleetSize,
  launching,
  onLaunch,
  onBack,
}: {
  profile: Profile;
  fleetSize: number;
  launching: boolean;
  onLaunch: () => void;
  onBack: () => void;
}) {
  return (
    <div className="c4u-screen c4u-screen--cream">
      <div className="c4u-deploy">
        <div className="c4u-eyebrow">Step 2 of 3 · Deploy</div>
        <h1 className="c4u-h1">
          We&apos;ll dial <span className="c4u-mark">{fleetSize} leads</span> in{" "}
          {profile.geo}.
        </h1>
        <p className="c4u-lead" style={{ marginTop: 8 }}>
          Sourcing businesses that match your ICP from Google Maps. Each lead
          gets one of four voice agents on a randomized script variant.
        </p>

        <div className="c4u-deploy__grid">
          <div className="c4u-card c4u-deploy__summary">
            <div className="c4u-eyebrow">Your business</div>
            <div className="c4u-profile__url" style={{ marginBottom: 6 }}>
              {profile.url}
            </div>
            <div className="c4u-profile__row">
              <span className="c4u-profile__k">Industry</span>
              <span className="c4u-profile__v">{profile.industry}</span>
            </div>
            <div className="c4u-profile__row">
              <span className="c4u-profile__k">ICP</span>
              <span className="c4u-profile__v">{profile.icp}</span>
            </div>
            <div className="c4u-profile__row">
              <span className="c4u-profile__k">Goal CTA</span>
              <span className="c4u-profile__v">{profile.goal}</span>
            </div>
          </div>
          <div className="c4u-card c4u-deploy__fleet">
            <div className="c4u-eyebrow">The fleet</div>
            <div className="c4u-deploy__fleet-num">{fleetSize}</div>
            <div className="c4u-small">
              voice agents, four script variants, dialing in parallel.
            </div>
            <div className="c4u-deploy__variants">
              <span>
                <b>A</b> Curious opener
              </span>
              <span>
                <b>B</b> Direct opener
              </span>
              <span>
                <b>C</b> Referral framing
              </span>
              <span>
                <b>D</b> Question opener
              </span>
            </div>
          </div>
        </div>

        <div className="c4u-deploy__actions">
          <Button
            variant="primary"
            size="lg"
            onClick={onLaunch}
            disabled={launching}
          >
            {launching ? "Deploying fleet…" : "Deploy fleet"}
          </Button>
          <button
            type="button"
            className="c4u-btn c4u-btn--quiet c4u-btn--md"
            onClick={onBack}
            disabled={launching}
          >
            Back to intake
          </button>
        </div>
      </div>
    </div>
  );
}
