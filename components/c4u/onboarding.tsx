"use client";

import { useState } from "react";

import { Button, VoiceSphere } from "./primitives";
import { ProfileCard } from "./profile-card";
import type { Profile } from "./types";

// NOTE: live voice intake (Wispr Flow / Web Speech) is intentionally NOT
// wired here — the user opted to type the four answers instead. See
// CLAUDE.md → "Voice intake" for rationale.
const INTAKE_QUESTIONS: {
  field: keyof Omit<Profile, "geo">;
  q: string;
  helper: string;
  placeholder: string;
  multiline?: boolean;
}[] = [
  {
    field: "url",
    q: "Hi, I'm here to help you sell. What's your website?",
    helper: "Just the domain is fine — e.g. webpro.agency",
    placeholder: "yoursite.com",
  },
  {
    field: "industry",
    q: "What industry would you say you're in?",
    helper: "A short phrase. We'll use it to source matching leads.",
    placeholder: "Web design studio",
  },
  {
    field: "icp",
    q: "Who are you trying to sell to? Your ideal customer.",
    helper: "Describe them: type of business, size, region.",
    placeholder: "Local service SMBs in Toronto",
    multiline: true,
  },
  {
    field: "goal",
    q: "And the goal — when an agent gets through, what should they do?",
    helper: "Be specific. The agent will optimize for this CTA.",
    placeholder: "Book a 15-minute discovery call",
    multiline: true,
  },
];

const TOTAL = INTAKE_QUESTIONS.length;

export function Onboarding({
  initialProfile,
  onAdvance,
}: {
  initialProfile: Profile;
  onAdvance: (p: Profile) => void;
}) {
  const [turn, setTurn] = useState(0);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [draft, setDraft] = useState("");

  const done = turn >= TOTAL;
  const current = INTAKE_QUESTIONS[Math.min(turn, TOTAL - 1)];

  const phase = done ? "done" : "speaking";
  const stateLabel = done ? "Ready" : `Question ${turn + 1} of ${TOTAL}`;

  function commit() {
    if (!draft.trim()) return;
    const step = INTAKE_QUESTIONS[turn];
    setProfile((prev) => ({ ...prev, [step.field]: draft.trim() }));
    setDraft("");
    setTurn((n) => n + 1);
  }

  function startOver() {
    setTurn(0);
    setDraft("");
    setProfile(initialProfile);
  }

  return (
    <div className="c4u-screen c4u-screen--cream">
      <div className="c4u-onb">
        <div className="c4u-onb__hero">
          <div className="c4u-onb__label">
            <span
              className="c4u-dot is-pulse"
              style={{ background: "var(--c4u-coral)" }}
            />
            {stateLabel}
          </div>
          <div className="c4u-onb__sphere">
            <VoiceSphere size={180} phase={phase} />
          </div>
          <h1 className="c4u-onb__q" key={`${turn}-${phase}`}>
            {done ? <>I&apos;ve got enough. Ready to find your leads?</> : current.q}
          </h1>

          {done ? (
            <div className="c4u-onb__cta">
              <Button
                variant="primary"
                size="lg"
                onClick={() => onAdvance(profile)}
              >
                Find my leads
              </Button>
              <button
                type="button"
                className="c4u-btn c4u-btn--quiet c4u-btn--md"
                onClick={startOver}
              >
                Start over
              </button>
            </div>
          ) : (
            <>
              <div className="c4u-onb__input">
                {current.multiline ? (
                  <textarea
                    rows={3}
                    autoFocus
                    placeholder={current.placeholder}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        (e.metaKey || e.ctrlKey)
                      ) {
                        e.preventDefault();
                        commit();
                      }
                    }}
                  />
                ) : (
                  <input
                    autoFocus
                    placeholder={current.placeholder}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commit();
                      }
                    }}
                  />
                )}
                <div className="c4u-onb__input__row">
                  <span className="c4u-onb__input__hint">
                    {current.helper}
                    {current.multiline ? " · ⌘⏎ to continue" : " · ⏎ to continue"}
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={commit}
                    disabled={!draft.trim()}
                  >
                    Next →
                  </Button>
                </div>
              </div>
              <div className="c4u-onb__progress">
                <div className="c4u-onb__bar">
                  <div style={{ width: `${(turn / TOTAL) * 100}%` }} />
                </div>
                <span className="c4u-mono">
                  Question {Math.min(turn + 1, TOTAL)} of {TOTAL}
                </span>
              </div>
            </>
          )}
        </div>
        <aside className="c4u-onb__aside">
          <ProfileCard profile={profile} extracting={!done} />
        </aside>
      </div>
    </div>
  );
}
