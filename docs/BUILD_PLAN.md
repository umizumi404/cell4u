# BUILD_PLAN.md

Thin tickets. Each assumes the agent has read `AGENTS.md` + `cell_for_you_prd_v2.md`.
Do **not** restate stack or invariants in a prompt — reference them. Run a ticket by
pasting its body. Tickets 0–2 are blocking; 3–7 parallelize after 2 lands; 8 is the join.

Dependency graph: `0 → 1 → 2 → {3,4,5,6,7} → 8`.

---

## Ticket 0 — Orientation (no code)
```
Read AGENTS.md and cell_for_you_prd_v2.md, then read this entire repo (the v1 MVP).
Produce a migration map: (1) file-by-file inventory, (2) everything tied to the OLD
stack (ElevenLabs, direct Twilio, self-hosted WebSocket, Lovable) that must be removed
or replaced, (3) anything reusable (UI components, types, styles). Do not change code.
Wait for confirmation.
```

## Ticket 1 — Campaign Blueprint abstraction (blocking)
```
Implement the CampaignBlueprint type and BlueprintAdapter interface exactly as specified
in PRD §2. Create blueprints/ as a registry. Ship two modules:
- b2b_local_services (Clay source, business audience, demo-booking CTA) — fully implemented interface.
- real_estate_acquisition (consumer audience, dnc_scrub_required=true, callback CTA,
  sourceLeads = CSV import for now) — behind a feature flag.
Enforce invariant #5: nothing downstream may branch on vertical outside these modules.
```

## Ticket 2 — Strip old stack + new skeleton (blocking)
```
Per the Ticket 0 migration map, remove all OLD-stack code; keep flagged reusable UI/types.
Stand up: Next.js App Router on Vercel (Edge runtime for webhook/API routes); Upstash
client with publishTileUpdate/subscribeCampaign; Postgres schema (campaigns, leads, calls,
call_events, outcomes); env scaffolding per AGENTS.md; /healthz. Confirm a clean Vercel deploy.
```

## Ticket 3 — Retell integration layer
```
Build lib/retell/: flow CRUD that always does create-version→publish (invariant #3);
Batch Call API wrapper (tasks carry to_number + retell_llm_dynamic_variables); voice
config via setVoice(provider, voiceId) defaulting to Cartesia; Edge webhook handlers at
/api/webhooks/retell/events (call_started, transcript_update, call_ended, call_analyzed)
and /api/webhooks/retell/tools (custom-function + MCP nodes). Handlers validate signature,
write to Postgres, publish a tile update, return < 5s; slow work via waitUntil(). In-call
LLM default per AGENTS.md model routing, with per-node override capability.
```

## Ticket 4 — Intake → profile → blueprint detection
```
Build intake as a Retell web/WebRTC flow. The agent must: detect the CampaignBlueprint
from the user's description; extract the fields named in that blueprint's dynamic_var_schema
(do NOT hardcode dental fields); run /api/scrape in parallel (Gemini 3.1 Pro → structured
profile); enforce a hard turn cap via a guaranteed "ready to deploy?" transition node.
Stream transcript_update to the live profile card via Upstash.
```

## Ticket 5 — Lead sourcing
```
Implement b2b_local_services.sourceLeads as the Clay adapter: POST search params
(business type + geography from intake) to the Clay webhook-in; receive enriched rows at
/api/webhooks/clay; upsert into leads; validate/format phones to E.164 and drop
fax/invalid/likely-disconnected; set enrichment_status so the dispatcher can call ready
leads while others enrich. Implement CSV import as the real_estate_acquisition source.
```

## Ticket 6 — Persona + template-flow strategy
```
Do NOT generate a flow per campaign. For each vertical, maintain ONE stable template flow
(structural nodes: ice-break → discovery → pitch → objection → close; tool nodes:
report_stage_change, log_objection, book_meeting mapped to the blueprint's CTA).
Implement buildCallContext(profile, leadId, personaId): returns dynamic vars + per-call
node overrides that inject the persona (personas/ fragment + voice id + intensity +
guardrails) and lead specifics into the template. Ship personas per PRD §7 (internal
names mapped to archetypes; expose archetypes). Generate/validate any template-flow JSON
with Claude Opus 4.7 against Retell's schema before publishing.
```

## Ticket 7 — War-room dashboard
```
Grid of tiles sized to real concurrency (default 24), each = one lead + one agent.
Subscribe to the campaign's Upstash channel (status color, stage, archetype tag, duration);
tiles ramp with real dial pacing. Click → drawer: live transcript ticker (from
transcript_update) + full transcript after call_analyzed + the blueprint's win_condition
state (real, never faked). Add filters + campaign history (the ops-console seed). Keep the
demo path input-free except a discreet "type instead" on intake.
```

## Ticket 8 — End-to-end wiring + dry run
```
Wire: START → intake (detect + profile) → confirm → sourceLeads → buildCallContext →
dispatch batch (Retell, Cartesia) → live events → tiles → real outcomes. Add a
planted-number override injected into the task list (known live tile) plus a pre-recorded
fallback triggered by clicking that tile if the live call fails. Run an end-to-end test
against b2b_local_services with 5 real leads.
```
