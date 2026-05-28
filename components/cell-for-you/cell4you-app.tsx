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
  type AgentState,
  type Campaign,
  type Profile,
  type Screen,
} from "@/components/c4u/types";
import { buildInitialAgents } from "@/components/c4u/war-room-sim";
import { WarRoom } from "@/components/c4u/war-room";

/**
 * Cell4YouApp — top-level orchestration.
 *
 * Backend wiring (Phase 4):
 *  - Deploy → POST /api/campaign/create   (stores intake transcript)
 *  - Deploy → POST /api/leads/find        (Google Maps lead source)
 *  - Deploy → POST /api/calls/start       (Twilio dial)
 *
 * War-room tile transitions and call-drawer transcript are simulated
 * locally until Twilio call-status webhooks land. See CLAUDE.md.
 *
 * Live agent fleet is capped at LIVE_AGENT_LIMIT to stay inside the
 * provider quota during development. The UI still presents "100 leads"
 * as the marketing message, and the on-screen agent grid is padded with
 * simulated tiles so the war room looks alive.
 */

const DEFAULT_PROFILE: Profile = {
  url: "",
  industry: "",
  icp: "",
  goal: "",
  geo: "Toronto, ON",
};

const LIVE_AGENT_LIMIT = 3;
/** Marketing fleet size shown in the UI ("100 salespeople"). */
const FLEET_SIZE = 100;
/** How many tiles to render in the war room (mix of real + simulated). */
const WAR_ROOM_TILES = 36;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function normalizeCampaignId(payload: unknown): Campaign {
  const root = asRecord(payload);
  const raw = asRecord(root?.campaign);
  if (!raw) return null;
  const id =
    getString(raw, "id") ??
    getString(raw, "campaignId") ??
    crypto.randomUUID();
  return {
    id,
    url: getString(raw, "businessName") ?? getString(raw, "url") ?? undefined,
    geo: getString(raw, "location") ?? undefined,
  };
}

type ApiLead = {
  id: string;
  businessName: string;
  phone: string;
};

function normalizeLeads(payload: unknown): ApiLead[] {
  const root = asRecord(payload);
  const arr = Array.isArray(root?.leads) ? root.leads : [];
  return arr
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      id:
        getString(entry, "id") ??
        getString(entry, "leadId") ??
        crypto.randomUUID(),
      businessName:
        getString(entry, "businessName") ??
        getString(entry, "business_name") ??
        "Unknown lead",
      phone: getString(entry, "phone") ?? "",
    }));
}

function normalizeWarningMessage(message: string | null): string | null {
  if (!message) return null;
  const normalized = message.replace(/\s+/g, " ").trim();
  const duplicate = /^(.+?[.!?])\s+\1$/;
  const match = normalized.match(duplicate);
  return match ? match[1] : normalized;
}

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

  // Auto-dismiss warnings.
  useEffect(() => {
    if (!warning) return;
    const id = window.setTimeout(() => setWarning(null), 8000);
    return () => window.clearTimeout(id);
  }, [warning]);

  const enabledNav = useMemo<Set<Screen>>(() => {
    const set = new Set<Screen>(["landing", "onboarding"]);
    if (profile.url) set.add("deploy");
    if (agents.length > 0) set.add("warroom");
    if (reviewAgent) set.add("review");
    return set;
  }, [profile.url, agents.length, reviewAgent]);

  async function launchFromDeploy() {
    if (launching) return;
    setLaunching(true);
    setWarning(null);
    try {
      const transcript = `Website: ${profile.url}. Industry: ${profile.industry}. ICP: ${profile.icp}. Goal: ${profile.goal}. Geography: ${profile.geo}.`;

      const campaignRes = await fetch("/api/campaign/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const campaignPayload = await campaignRes.json().catch(() => null);
      let nextCampaign = normalizeCampaignId(campaignPayload);
      if (!campaignRes.ok || !nextCampaign) {
        const msg =
          (campaignPayload && getString(asRecord(campaignPayload) ?? {}, "error")) ||
          "Campaign create failed — running in simulated mode.";
        setWarning(normalizeWarningMessage(msg));
        nextCampaign = {
          id: crypto.randomUUID(),
          url: profile.url || undefined,
          geo: profile.geo,
        };
      }
      setCampaign(nextCampaign);

      let realLeads: ApiLead[] = [];
      try {
        const leadsRes = await fetch("/api/leads/find", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: nextCampaign.id,
            query: profile.icp,
            location: profile.geo,
            maxResults: LIVE_AGENT_LIMIT,
          }),
        });
        const leadsPayload = await leadsRes.json().catch(() => null);
        if (leadsRes.ok) realLeads = normalizeLeads(leadsPayload);
        else {
          const msg = getString(asRecord(leadsPayload) ?? {}, "error");
          if (msg) setWarning(normalizeWarningMessage(msg));
        }
      } catch {
        // tolerate — we fall back to simulated tiles below.
      }

      const liveLeads = realLeads.slice(0, LIVE_AGENT_LIMIT);

      if (liveLeads.length > 0) {
        try {
          const callsRes = await fetch("/api/calls/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campaignId: nextCampaign.id,
              leadIds: liveLeads.map((l) => l.id),
            }),
          });
          const callsPayload = await callsRes.json().catch(() => null);
          const callsWarning = getString(
            asRecord(callsPayload) ?? {},
            "warning",
          );
          if (callsWarning) setWarning(normalizeWarningMessage(callsWarning));
        } catch {
          setWarning(
            "Calls didn't start — check Twilio configuration. Showing simulated war room.",
          );
        }
      }

      // Build the on-screen fleet: real leads first, then simulated tiles
      // to fill the war room so it feels alive while we ramp.
      const variants: Agent["variant"][] = ["A", "B", "C", "D"];
      const realTiles: Agent[] = liveLeads.map((lead, idx) => ({
        id: idx,
        business: lead.businessName,
        variant: variants[idx % 4],
        state: "queued" as AgentState,
        elapsed: 0,
        leadId: lead.id,
        phone: lead.phone,
      }));
      const filler = buildInitialAgents(
        Math.max(WAR_ROOM_TILES - realTiles.length, 0),
      ).map((tile, i) => ({ ...tile, id: realTiles.length + i }));
      setAgents([...realTiles, ...filler]);
      setScreen("warroom");
    } catch (err) {
      console.error(err);
      setWarning("Launch failed. Showing simulated war room.");
      const filler = buildInitialAgents(WAR_ROOM_TILES);
      setAgents(filler);
      setScreen("warroom");
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
          if (s === "warroom" && agents.length === 0) return;
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
              if (agents.length > 0) setScreen("warroom");
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

// Keep a reference to STATE_LABELS so re-exports/typing remain stable for
// any external consumer that imports from this module.
export { STATE_LABELS };
