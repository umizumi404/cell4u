# Cell For You — PRD v2.0

> **Supersedes** `cell_for_you_prd.md` (v1, hackathon). v1 was a single-path demo
> (scrape a site → Google Maps dentists → pitch). v2 is a multi-vertical voice-AI
> sales platform. Where the two conflict, **v2 wins**. v1 is retained only as a
> historical artifact.

**One-liner**: Talk to our agent for two minutes about what you sell and who you
sell to. We source and enrich your leads, build a salesperson tuned to your
business, and put a fleet of voice agents on the phones — while you watch them
work in real time.

**Status**: Production foundation (demo-ready v0 → platform v1 → scale v2).

---

## 0. What changed from v1, and why it matters

| Dimension | v1 (hackathon) | v2 (this doc) |
|---|---|---|
| Product | One-path demo for dentists | Multi-vertical platform (B2B local, real-estate acquisition, extensible) |
| Voice platform | ElevenLabs Agents + custom Twilio WS bridge | **Retell AI** (Conversation Flows + Batch Call API) |
| Lead source | Google Maps Places API | **Clay** (Maps source + waterfall enrichment) + CSV import |
| Backend | Custom Node/Express + self-hosted WebSocket | **None** — Vercel Edge Functions only |
| Realtime | Self-hosted WebSocket | **Upstash Redis** (state + pub/sub); Vercel cannot host sockets |
| Conversation logic | Hand-coded state machine | Retell template flow per vertical + dynamic-variable persona layer |
| Personas | A/B/C/D script variants | Named/archetype persona library as a style layer |
| Compliance | Ignored | Out of build scope for v0, but the **foundation must support it** (see §3) |

The single most important design constraint: **the same pipeline must serve a web
agency pitching dentists (B2B) and a real-estate investor calling property owners
(B2C).** These share almost nothing at the data, contact, persona, or compliance
layer. The architecture is organized around that fact — see §2.

---

## 1. Goals & non-goals

**v0 (demo) goals**
- One screen, one START button, voice-first intake, live war-room dashboard.
- Real outbound calls to real leads for at least one vertical (B2B local services).
- A planted number connects live; a second tile books a real outcome.
- 24 genuinely concurrent tiles (not 100 theatrical, mostly-queued tiles).

**v1 (platform) goals**
- Two live verticals (B2B local + real-estate acquisition).
- Persona library with archetype selection.
- CSV import for leads in addition to Clay sourcing.
- Outcome capture writes to a real store (and, where applicable, a calendar booking).

**v2 (scale) goals**
- Filtering/search/history (ops console), multi-campaign, account model.
- Compliance module (DNC scrub, disclosure injection, dial pacing) activated per blueprint.
- Feedback loop: per-persona/per-node performance analytics that actually inform tuning.

**Non-goals (all phases unless stated)**
- Auth/accounts in v0 (arrives v1+). Mobile-responsive demo. Omnichannel (SMS/email) in v0.
- Compliance *features* in v0 — but never design anything that blocks adding them (§3).

---

## 2. Core abstraction — the Campaign Blueprint

Everything downstream reads from one object. There is **no vertical-specific logic
anywhere except inside a blueprint module.**

```ts
type CampaignBlueprint = {
  vertical_id: string;               // "b2b_local_services" | "real_estate_acquisition"
  lead_source_strategy: string;      // which sourcing adapter to invoke
  target_audience: "business" | "consumer";
  compliance_profile: {
    dnc_scrub_required: boolean;
    disclosure_line?: string;        // injected into flow when present
    max_call_minutes: number;
  };
  persona_set: string[];             // allowed persona/archetype ids
  flow_template_id: string;          // stable, versioned Retell flow for this vertical
  dynamic_var_schema: Record<string, "string" | "number" | "enum">;
  win_condition: { cta_type: string; success_event: string };
  enrichment_recipe: string;         // which Clay columns / data to pull
};
```

Each blueprint module also exports three adapters behind one interface:

```ts
interface BlueprintAdapter {
  sourceLeads(params): Promise<Lead[]>;            // Clay, CSV, skip-trace, etc.
  buildCallContext(profile, leadId, personaId):    // returns dynamic vars + overrides
      Promise<{ dynamicVars: Record<string,string>; nodeOverrides?: NodeOverride[] }>;
  classifyOutcome(transcript): Outcome;            // maps to win_condition
}
```

**Two blueprints ship:**

- **`b2b_local_services`** — Clay (Google Maps source + enrichment), `business` audience,
  receptionist-gatekeeper flow, CTA = booked demo/discovery call. *Fully live in v0.*
- **`real_estate_acquisition`** — `consumer` audience, `dnc_scrub_required: true`,
  owner-direct flow, CTA = callback/appointment. Lead source = **Clay (where it can
  find owners) + CSV import**; richer skip-trace adapters slot in later behind the same
  interface. *Behind a feature flag until the compliance module exists.*

The intake agent's real job: **detect which blueprint applies, then fill its
`dynamic_var_schema`.**

---

## 3. Compliance posture (foundation now, features later)

v0 does not build compliance. But the foundation must make it a drop-in, because the
real-estate vertical calls residential numbers — the most litigated area in telephony
(TCPA, the Do-Not-Call registry, state autodialer/AI-disclosure laws).

Two cheap things are built now so nothing is retrofitted later:
1. Every blueprint carries a `compliance_profile`. When `disclosure_line` is set, the
   flow generator injects it into the opening node. When `dnc_scrub_required` is true,
   the dispatcher routes leads through a (stubbed in v0) `scrubLeads()` step before dialing.
2. A hard dialer kill-switch at the campaign level.

The `real_estate_acquisition` blueprint stays flag-gated until `scrubLeads()` is real.

---

## 4. Architecture (serverless, no backend)

```
Browser (Next.js on Vercel)
   │ click START
   ▼
Intake — Retell web/WebRTC widget
   │ transcript_update events stream live to the profile card (via Upstash)
   ▼
Vercel Edge: /api/intake/complete
   │   detect blueprint • extract dynamic_var_schema • parallel: /api/scrape
   ├─► Clay table (webhook-in)  ── async enrichment ──►  /api/webhooks/clay
   └─► buildCallContext(profile, persona)  → dynamic vars + per-call overrides
            │
            ▼
   Retell Batch Call API  (one stable template flow per vertical;
            │               persona + lead injected via dynamic vars / overrides;
            │               voice = Cartesia by default, provider is a config field)
            ▼  during each call:
   transcript_update • tool calls (report_stage_change / log_objection / book_meeting)
            │     → /api/webhooks/retell/*  (Edge, MUST return < 5s)
            ▼
   Upstash Redis  (write call_event + publish tile update)
            │
            ▼
   War-room dashboard  (subscribes to campaign channel; 24 live tiles;
                        click → drawer: live transcript ticker + outcome)
```

**Why no backend:** Vercel Functions cannot host WebSocket servers — even with Fluid
Compute. All server↔client realtime goes through Upstash (or Pusher/Ably). Edge
Functions handle every webhook and API route. Stateful data lives in Postgres
(Vercel Postgres / Neon) + Upstash for hot state and pub/sub.

**Hard platform facts that shape the build** (verified, May 2026):
- Retell PAYG = **20 concurrent calls**, upgradeable; one agent serves unlimited calls
  within quota (do **not** spin up an agent or a fresh published flow per campaign).
- Retell webhooks time out at **5 seconds** — no slow work inline; ack fast, resolve async.
- Retell LLM prompt cap **32,768 chars**; >3,500 tokens billed extra; per-flow-version size limit.
- Published Retell flows are **immutable** — change = new version → publish (rare, deliberate).
- Vercel Edge: respond within **25s** to start streaming, **300s** max stream.

---

## 5. Voice & flow strategy

- **One template flow per vertical**, versioned and published deliberately. Structural
  nodes: ice-break → discovery → pitch → objection → close, plus tool nodes
  (`report_stage_change`, `log_objection`, `book_meeting`).
- **Persona = style layer**, not a separate flow. Tone, openers, objection style, and an
  `intensity` (0–1, guard-railed) are injected via dynamic variables and per-call prompt
  overrides into the template's nodes. Structural persona differences are a later upgrade.
- **Voice is swappable.** Cartesia is the v0 default (cheap, ~$0.015/min). ElevenLabs,
  MiniMax, OpenAI sit behind a single `setVoice(provider, voiceId)` config per blueprint.
  Budget a phonetic-override pass for business/street names (Cartesia mispronounces more
  than ElevenLabs).

---

## 6. Model selection

In-call models are **latency-bound**; offline models are **quality-bound**. Never put a
frontier reasoning model in the live call loop.

| Role | Model | Why |
|---|---|---|
| In-call sales agent (Retell) | **Gemini 3.5 Flash** or **GPT-5 mini** default | Sub-second first token holds the ~600ms loop; cheap at 24 concurrent |
| In-call objection node only | **GPT-5.5** (per-node override) | Reasoning matters most here; escalate selectively |
| In-call intake agent | **GPT-4o** / **Gemini 3.5 Flash** | Fast, reliable structured extraction |
| Persona + flow generation (offline) | **Claude Opus 4.7** | Best structured generation; emits valid flow JSON |
| Site scrape → profile (offline) | **Gemini 3.1 Pro** | 10M context swallows whole sites; Sonnet 4.6 as cheaper fallback |
| Lead enrichment reasoning | **Clay Claygent** (native) | Don't rebuild Clay's pipeline |
| Dev / migration agent | **Claude Opus 4.7** (hard), **Sonnet 4.6** (routine) | SWE-bench leader / best daily balance |

Cost lever: in-call model choice swings per-minute cost ~27×. Default cheap, escalate per node.

---

## 7. Personas / archetypes

Ship v0 with named personalities mapped to neutral archetypes; expose **archetypes** in
the UI. Rename-only path to de-risk likeness/IP before public launch.

| v0 internal name | Archetype (UI) | Style |
|---|---|---|
| Hormozi-style | The Offer-Stacker | High-ticket value framing, ROI math |
| Cardone-style | The Direct-Closer | Urgency, tempo, assumptive close |
| Belfort-style | The Smooth-Operator | Rapport, tonality, controlled confidence |
| Elliott-style | The Energizer | High-energy motivator |
| (neutral) | The Mentor | Consultative, low-pressure |

Each persona = prompt fragment + paired voice id + `intensity` + guardrails so style
enhances rather than sabotages a real call.

---

## 8. Demo runbook (v0, realistic)

- **24 real concurrent tiles** (6×4), sized to true concurrency. Tiles ramp as the
  dialer paces — the animation reflects real ramp, not fake instant-fill.
- Flow: START → intake (blueprint detect + profile + live card) → confirm → Clay
  pre-warmed leads → persona/template dispatch (Cartesia) → live events → tiles →
  one planted tile connects live → a second books a real outcome.
- **Planted-number override** injected into the task list so we know which tile is live;
  **pre-recorded fallback** triggered by clicking that tile if the live call fails.
- Pre-warm Clay tables for the demo vertical/geography so the "60-second" promise is real.

---

## 9. Risks & mitigations

1. **Clay enrichment latency** (async, 1–2 min). → Pre-warm for demo; in prod, dial
   ready leads while the rest enrich.
2. **Bad phone data** (fax, disconnected, call centers). → Validate/format (E.164),
   filter before dialing.
3. **Persona too aggressive** on a live call. → `intensity` dial + guardrails + dry runs.
4. **Planted phone fails** on venue WiFi. → Two planted numbers + pre-recorded fallback.
5. **Webhook 5s timeout** stalls a call. → Enrichment before dispatch; ack-fast/resolve-async.
6. **Faked terminal state** is the most-scrutinized tile. → Outcomes are real tool-call writes.

---

## 10. Build plan

Layered context, thin tickets. The agent reads `AGENTS.md` + this PRD + one ticket.
Tickets 0–2 are blocking; 3–7 parallelize after the foundation lands. Ticket bodies live
in `BUILD_PLAN.md`.

| # | Ticket | Blocks |
|---|---|---|
| 0 | Orientation / migration map (no code) | all |
| 1 | Campaign Blueprint abstraction + 2 blueprints | all downstream |
| 2 | Strip old stack + Vercel/Edge/Upstash/Postgres skeleton | 3–7 |
| 3 | Retell integration layer (flows, batch, voice config, webhooks) | 4,6,8 |
| 4 | Intake → profile → blueprint detection | 8 |
| 5 | Clay sourcing adapter + CSV import + phone validation | 8 |
| 6 | Persona + template-flow strategy (dynamic-var injection) | 8 |
| 7 | War-room dashboard (Upstash subscribe, drawer, outcomes) | 8 |
| 8 | End-to-end wiring + planted-number + dry run | ship |
