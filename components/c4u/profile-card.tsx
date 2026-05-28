"use client";

import type { Profile } from "./types";

export function ProfileCard({
  profile,
  extracting,
}: {
  profile: Profile;
  extracting: boolean;
}) {
  return (
    <div className="c4u-card c4u-profile">
      <div className="c4u-eyebrow">
        Profile · {extracting ? "capturing" : "ready"}
      </div>
      <div className="c4u-profile__url">{profile.url || "awaiting URL…"}</div>
      <Row k="Industry" v={profile.industry} />
      <Row k="ICP" v={profile.icp} />
      <Row k="Goal CTA" v={profile.goal} />
      <Row k="Geography" v={profile.geo} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="c4u-profile__row">
      <span className="c4u-profile__k">{k}</span>
      <span className={`c4u-profile__v ${!v ? "is-empty" : ""}`}>
        {v || "—"}
      </span>
    </div>
  );
}
