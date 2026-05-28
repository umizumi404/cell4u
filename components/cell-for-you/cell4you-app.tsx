"use client";

import { useEffect, useMemo, useState } from "react";

import { Deploy } from "@/components/c4u/deploy";
import { Landing } from "@/components/c4u/landing";
import { Onboarding } from "@/components/c4u/onboarding";
import { Review } from "@/components/c4u/review";
import { TopBar } from "@/components/c4u/top-bar";
import {
  STATE_LABELS,
  type Agent,
  type Campaign,
  type Profile,
  type Screen,
} from "@/components/c4u/types";
import { WarRoom } from "@/components/c4u/war-room";

/**
 * Cell4YouApp — top-level orchestration.
 *
 * Ticket 2 stripped the OLD `/api/campaign/create` / `/api/leads/find` /
 * `/api/calls/start` wiring. `launchFromDeploy` now mints an anonymous
 * campaign id (AGENTS.md invariant #11) and flips the screen — the full
 * intake → sourceLeads → dispatch pipeline gets wired in Ticket 8.
 *
 * `agents` is empty in v0; the war-room subscribes to the campaign channel
 * and gets populated by `tile_update` events once Ticket 7 lands. No more
 * filler tiles (AGENTS.md invariant #6).
 */

const DEFAULT_PROFILE: Profile = {
  url: "",
  industry: "",
  icp: "",
  goal: "",
  geo: "Toronto, ON",
};

/** Marketing fleet size shown in the UI ("100 salespeople"). */
const FLEET_SIZE = 100;

const STEP_LABELS: Record<Screen, string> = {
  landing: "00 · Landing",
  onboarding: "01 · Intake",
  deploy: "02 · Confirm",
  warroom: "03 · Live",
  review: "04 · Review",
};

export function Cell4YouApp() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [campaign, setCampaign] = useState<Campaign>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [reviewAgent, setReviewAgent] = useState<Agent | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (!warning) return;
    const id = window.setTimeout(() => setWarning(null), 8000);
    return () => window.clearTimeout(id);
  }, [warning]);

  const enabledNav = useMemo<Set<Screen>>(() => {
    const set = new Set<Screen>(["landing", "onboarding"]);
    if (profile.url) set.add("deploy");
    if (campaign) set.add("warroom");
    if (reviewAgent) set.add("review");
    return set;
  }, [profile.url, campaign, reviewAgent]);

  async function launchFromDeploy() {
    if (launching) return;
    setLaunching(true);
    setWarning(null);
    try {
      // Invariant #11: mint an anonymous campaign id at START.
      const nextCampaign: Campaign = {
        id: crypto.randomUUID(),
        url: profile.url || undefined,
        geo: profile.geo,
      };
      setCampaign(nextCampaign);
      setAgents([]);
      setScreen("warroom");
      setWarning(
        "Dispatch pipeline lands in Ticket 8. War room is subscribed to the campaign channel — tiles will appear as call events arrive.",
      );
    } finally {
      setLaunching(false);
    }
  }

  function openReview(agent: Agent) {
    setReviewAgent(agent);
    setScreen("review");
  }

  const dark = screen === "warroom";

  return (
    <div
      className={`c4u-root ${dark ? "is-dark" : ""}`}
      data-screen-label={STEP_LABELS[screen]}
    >
      <TopBar
        theme={dark ? "dark" : "light"}
        step={STEP_LABELS[screen]}
        current={screen}
        enabled={enabledNav}
        onNav={(s) => {
          if (s === "review" && !reviewAgent) return;
          if (s === "warroom" && !campaign) return;
          setScreen(s);
        }}
      />

      <main className="c4u-main">
        {screen === "landing" ? (
          <Landing
            onStart={() => {
              setProfile(DEFAULT_PROFILE);
              setScreen("onboarding");
            }}
          />
        ) : null}

        {screen === "onboarding" ? (
          <Onboarding
            initialProfile={profile}
            onAdvance={(next) => {
              setProfile(next);
              setScreen("deploy");
            }}
          />
        ) : null}

        {screen === "deploy" ? (
          <Deploy
            profile={profile}
            fleetSize={FLEET_SIZE}
            launching={launching}
            onLaunch={launchFromDeploy}
            onBack={() => setScreen("onboarding")}
          />
        ) : null}

        {screen === "warroom" ? (
          <WarRoom
            agents={agents}
            setAgents={setAgents}
            campaign={campaign}
            fleetSize={FLEET_SIZE}
            onReviewCall={openReview}
          />
        ) : null}

        {screen === "review" ? (
          <Review
            agent={reviewAgent}
            onBack={() => {
              if (campaign) setScreen("warroom");
              else setScreen("landing");
            }}
          />
        ) : null}
      </main>

      {warning ? (
        <div
          role="status"
          className="c4u-toast"
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 50,
            background: "var(--c4u-snow)",
            border: "1px solid var(--c4u-coral)",
            color: "var(--c4u-charcoal)",
            padding: "10px 14px",
            borderRadius: 12,
            boxShadow: "var(--shadow-md)",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            maxWidth: 340,
          }}
        >
          {warning}
        </div>
      ) : null}
    </div>
  );
}

export { STATE_LABELS };
