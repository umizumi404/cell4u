"use client";

import { useEffect, useState } from "react";

import { AgentTile } from "./agent-tile";
import {
  AudioScrubber,
  Button,
  Pill,
  VoiceSphere,
  Waveform,
  type SpherePhase,
} from "./primitives";
import { buildInitialAgents, tickAgent } from "./war-room-sim";
import type { Agent } from "./types";

const LANDING_INTAKE_SCRIPT: { q: string; user: string }[] = [
  { q: "Hi, I'm here to help you sell. What's your website?", user: "webpro.agency" },
  { q: "What industry are you in?", user: "Web design studio." },
  { q: "Who are you trying to sell to?", user: "Local service SMBs in Toronto." },
  { q: "What's the call to action?", user: "Book a 15-minute call with me." },
];

function LandingHero({ onStart }: { onStart: () => void }) {
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState<SpherePhase>("speaking");

  useEffect(() => {
    const cycle = LANDING_INTAKE_SCRIPT.length;
    const t1 = window.setTimeout(() => setPhase("listening"), 2400);
    const t2 = window.setTimeout(() => {
      setPhase("speaking");
      setTurn((n) => (n + 1) % cycle);
    }, 4600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [turn]);

  const step = LANDING_INTAKE_SCRIPT[turn];
  const caption =
    phase === "speaking" ? (
      <>&quot;{step.q}&quot;</>
    ) : (
      <span className="c4u-lp-hero__userline">↳ &quot;{step.user}&quot;</span>
    );

  return (
    <section className="c4u-lp-hero">
      <div className="c4u-lp-hero__inner">
        <div className="c4u-lp-hero__copy">
          <div className="c4u-eyebrow">A voice AI sales force for SMBs</div>
          <h1 className="c4u-lp-hero__h1">
            Hire <span className="c4u-mark">100 salespeople</span> in 2&nbsp;minutes.
          </h1>
          <p className="c4u-lp-hero__lead">
            Tell us what you sell. We source your leads, deploy a fleet of
            voice agents, and let you watch every call live.
          </p>
          <div className="c4u-lp-hero__cta">
            <Button variant="primary" size="lg" onClick={onStart}>
              <span
                className="c4u-dot is-pulse"
                style={{ background: "var(--c4u-snow)" }}
              />
              Start now
            </Button>
            <a className="c4u-lp-hero__skipto" href="#how">
              How it works ↓
            </a>
          </div>
          <div className="c4u-lp-hero__trustline">
            <span className="c4u-mono">No login. Type · we dial · you watch.</span>
          </div>
        </div>
        <div className="c4u-lp-hero__sphere">
          <VoiceSphere size={240} phase={phase} />
          <div className="c4u-lp-hero__caption" key={`${turn}-${phase}`}>
            <div className="c4u-lp-hero__state">
              <span
                className="c4u-dot is-pulse"
                style={{ background: "var(--c4u-coral)" }}
              />
              {phase === "speaking" ? "Sam · intake agent" : "You"}
            </div>
            <div className="c4u-lp-hero__line">{caption}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepIntake() {
  return (
    <div className="c4u-lp-stepviz c4u-lp-stepviz--intake">
      <VoiceSphere size={88} phase="speaking" />
      <div className="c4u-lp-stepviz__bubble">
        &quot;What&apos;s your website?&quot;
      </div>
    </div>
  );
}

function StepSource() {
  const rows = [
    { biz: "Maple Studio Yoga", cat: "Yoga · Toronto" },
    { biz: "Riverside Dental", cat: "Dental · Toronto" },
    { biz: "Sunset Auto Body", cat: "Auto · Toronto" },
    { biz: "Northside Notary", cat: "Legal · Toronto" },
    { biz: "Brick Lane Coffee", cat: "Café · Toronto" },
  ];
  return (
    <div className="c4u-lp-stepviz c4u-lp-stepviz--source">
      {rows.map((r, i) => (
        <div
          key={r.biz}
          className="c4u-lp-stepviz__row"
          style={{ animationDelay: `${i * 0.12}s` }}
        >
          <span className="c4u-lp-stepviz__biz">{r.biz}</span>
          <span className="c4u-lp-stepviz__cat c4u-mono">{r.cat}</span>
        </div>
      ))}
      <div className="c4u-lp-stepviz__count">+95 more</div>
    </div>
  );
}

function StepDeploy() {
  const variants: { v: string; label: string }[] = [
    { v: "A", label: "Curious opener" },
    { v: "B", label: "Direct opener" },
    { v: "C", label: "Referral framing" },
    { v: "D", label: "Question opener" },
  ];
  return (
    <div className="c4u-lp-stepviz c4u-lp-stepviz--deploy">
      {variants.map((x, i) => (
        <div
          key={x.v}
          className="c4u-lp-stepviz__chip"
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          <span className="c4u-lp-stepviz__chipv">{x.v}</span>
          <span className="c4u-lp-stepviz__chipl">{x.label}</span>
        </div>
      ))}
    </div>
  );
}

function StepReview() {
  return (
    <div className="c4u-lp-stepviz c4u-lp-stepviz--review">
      <Waveform bars={24} active height={36} color="var(--c4u-coral)" />
      <div className="c4u-lp-stepviz__scorelabel">Quality</div>
      <div className="c4u-lp-stepviz__score">
        87<span>/100</span>
      </div>
      <div className="c4u-lp-stepviz__outcome">
        <span
          className="c4u-dot"
          style={{ background: "var(--state-closed-won)" }}
        />
        Booked discovery call · Tue 2:00
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    eyebrow: "Intake",
    title: "Tell us in two minutes.",
    body: "Four questions — your website, industry, ICP, and goal CTA. No forms.",
    visual: <StepIntake />,
  },
  {
    n: "02",
    eyebrow: "Source",
    title: "100 leads, in seconds.",
    body: "We scrape your site, match your ICP against Google Maps, and queue 100 verified phone numbers.",
    visual: <StepSource />,
  },
  {
    n: "03",
    eyebrow: "Deploy",
    title: "A fleet, in parallel.",
    body: "Four script variants. Twilio outbound. Calls land in seconds, conversations happen live.",
    visual: <StepDeploy />,
  },
  {
    n: "04",
    eyebrow: "Watch · review",
    title: "Every call, reviewed.",
    body: "Live transcripts as they happen. Recordings, transcripts, quality scores, and the next step booked.",
    visual: <StepReview />,
  },
];

function HowItWorks({ onStart }: { onStart: () => void }) {
  return (
    <section id="how" className="c4u-lp-how">
      <div className="c4u-lp-section__head">
        <div className="c4u-eyebrow">How it works</div>
        <h2 className="c4u-h2">Four steps. One conversation.</h2>
      </div>
      <ol className="c4u-lp-how__grid">
        {STEPS.map((s) => (
          <li key={s.n} className="c4u-lp-step">
            <div className="c4u-lp-step__visual">{s.visual}</div>
            <div className="c4u-lp-step__copy">
              <div className="c4u-lp-step__n">{s.n}</div>
              <div
                className="c4u-eyebrow"
                style={{ color: "var(--c4u-stone)" }}
              >
                {s.eyebrow}
              </div>
              <h3 className="c4u-h3 c4u-lp-step__title">{s.title}</h3>
              <p className="c4u-lp-step__body">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="c4u-lp-how__cta">
        <Button variant="primary" size="lg" onClick={onStart}>
          Start your two minutes
        </Button>
      </div>
    </section>
  );
}

function LandingWarRoom() {
  const [agents, setAgents] = useState<Agent[]>(() => buildInitialAgents(20));
  const [t0] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = (Date.now() - t0) / 1000;
      setAgents((prev) => prev.map((a) => tickAgent(a, t)));
    }, 600);
    return () => window.clearInterval(id);
  }, [t0]);

  return (
    <section className="c4u-lp-war">
      <div className="c4u-lp-war__inner">
        <div className="c4u-lp-section__head c4u-lp-section__head--dark">
          <div
            className="c4u-eyebrow"
            style={{ color: "var(--c4u-coral)" }}
          >
            ● Live
          </div>
          <h2 className="c4u-h2" style={{ color: "var(--c4u-snow)" }}>
            Watch every dial, every pitch, every close.
          </h2>
          <p
            className="c4u-lead"
            style={{ color: "var(--c4u-mist)", marginTop: 6 }}
          >
            A wall of voice agents working your leads. Click any tile to drop
            into the live transcript.
          </p>
        </div>
        <div className="c4u-lp-war__grid">
          {agents.map((a) => (
            <AgentTile key={a.id} agent={a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingReview() {
  return (
    <section className="c4u-lp-review">
      <div className="c4u-lp-review__inner">
        <div className="c4u-lp-review__copy">
          <div className="c4u-eyebrow">Every call · reviewed</div>
          <h2 className="c4u-h2">Listen back. Score the script. Iterate.</h2>
          <p className="c4u-lead" style={{ marginTop: 12 }}>
            Each variant&apos;s win rate, every objection, every booked call —
            laid out so you can pick a winner and run it again.
          </p>
          <ul className="c4u-lp-review__bullets">
            <li>
              <span className="c4u-mono">·</span> Full transcripts with speaker
              labels
            </li>
            <li>
              <span className="c4u-mono">·</span> Scrubable audio + waveform
            </li>
            <li>
              <span className="c4u-mono">·</span> Outcome tagging: booked ·
              polite no · voicemail · no answer
            </li>
            <li>
              <span className="c4u-mono">·</span> Per-agent quality score
            </li>
          </ul>
        </div>
        <div className="c4u-card c4u-lp-review__card">
          <Pill state="closed-won" label="Booked discovery call" />
          <h3 className="c4u-h3" style={{ marginTop: 8 }}>
            Maple Studio Yoga
          </h3>
          <div className="c4u-small" style={{ marginBottom: 14 }}>
            Variant B · 2 min 54 sec · Tuesday 2:00 PM
          </div>
          <Waveform bars={48} active={false} height={48} color="var(--c4u-navy)" />
          <AudioScrubber progress={0.42} duration={174} />
          <div className="c4u-lp-review__scorebar">
            <span>Quality</span>
            <span className="c4u-mono">87 / 100</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onStart }: { onStart: () => void }) {
  return (
    <section className="c4u-lp-final">
      <div className="c4u-lp-final__inner">
        <h2 className="c4u-lp-final__h">
          Two minutes of typing.
          <br />
          Hire <span className="c4u-mark">100 salespeople.</span>
        </h2>
        <div className="c4u-lp-final__cta">
          <Button variant="primary" size="lg" onClick={onStart}>
            <span
              className="c4u-dot is-pulse"
              style={{ background: "var(--c4u-snow)" }}
            />
            Start now
          </Button>
        </div>
        <div className="c4u-lp-final__foot c4u-mono">
          cell4you · live calls, in real time · no login
        </div>
      </div>
    </section>
  );
}

export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="c4u-screen c4u-lp" data-screen-label="00 · Landing">
      <LandingHero onStart={onStart} />
      <HowItWorks onStart={onStart} />
      <LandingWarRoom />
      <LandingReview />
      <FinalCTA onStart={onStart} />
    </div>
  );
}
