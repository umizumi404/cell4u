# BUILD_PLAN.md

Thin tickets. Each assumes the agent has read `AGENTS.md` + `docs/cell_for_you_prd_v2.md`.
Do **not** restate stack or invariants — reference them. Run a ticket by pasting its body.
(v2.1 — Ticket 0 complete; provisioning ticket 2.5 added; fixes from the migration review
folded in.)

Dependency graph: `0 -> 1 -> 2 -> 2.5 -> {3,4,5,6,7} -> 8`.
Run `0 -> 1 -> 2 -> 2.5` sequentially. 3-7 may parallelize after 2.5. 8 is the join.

Before Ticket 1: complete `SECRETS_REMEDIATION.md` (manual, human-owned) and delete/empty
any legacy `CLAUDE.md` per AGENTS.md context-hygiene.

---

## Ticket 0 — Orientation (COMPLETE)
Migration map delivered and accepted. No code changed.

## Ticket 1 — Campaign Blueprint abstraction (blocking)
```
Implement the CampaignBlueprint type and BlueprintAdapter interface exactly as specified
in PRD section 2. Create blueprints/ as a registry. Ship two modules:
- b2b_local_services (Clay source, business audience, demo-booking CTA) — interface fully implemented.
- real_estate_acquisition (consumer audience, dnc_scrub_required=true, callback CTA,
  sourceLeads = CSV import for now) — behind a feature flag.
The dynamic_var_schema on each blueprint is the contract that drives which fields intake
collects (Ticket 4) — design it as the single source of truth for that. Enforce invariant
#5: nothing downstream may branch on vertical outside these modules.
```

## Ticket 2 — Strip old stack + new skeleton (blocking)
```
Per the Ticket 0 migration map, remove all OLD-stack files/deps (ElevenLabs, direct
Twilio, Google Places, bespoke OpenAI prompt routes, Wispr, Supabase + supabase/ folder,
scaffolding SVGs, war-room-sim.ts, LIVE_SCRIPT/REVIEW_TRANSCRIPT/WAR_ROOM_TILES fakes).
Keep the flagged reusable UI/types; rename Agent.variant -> Agent.archetype.

Stand up: Next.js App Router on Vercel (Edge runtime for webhook/API routes); lib/db/
(Postgres) with migrations for campaigns, leads, calls, call_events, outcomes — keyed by
vertical_id and by a campaign_id (no auth, no auth.users FK; generate an anon
session/campaign id at START per invariant #11); lib/realtime/ using @upstash/realtime
(publishTileUpdate + a token-safe client subscribe per invariant #1); env scaffolding per
AGENTS.md (NO cartesia/openai/twilio/elevenlabs/supabase keys); app/api/healthz. Confirm
a clean Vercel deploy.
```

## Ticket 2.5 — Provision Retell account resources (blocking, one-time seed)
```
Create scripts/provision/ — an idempotent seed run OUT of the request path (invariant #10).
It must:
- Author + publish ONE template Conversation Flow per vertical (structural nodes:
  ice-break -> discovery -> pitch -> objection -> close; tool nodes: detect_blueprint
  [intake flow only], report_stage_change, log_objection, book_meeting). You may author
  the flow JSON with Claude Opus 4.7 or via Retell's MCP; validate against Retell's schema
  before publishing. Record the published flow_template_id into each blueprint.
- Provision the outbound from_number (Retell-managed or BYO Twilio imported INTO Retell)
  and store it as RETELL_FROM_NUMBER.
- Register the Retell webhook URLs (events + tools) pointing at APP_BASE_URL, with the
  signing secret stored as RETELL_WEBHOOK_SECRET.
- Connect the Cartesia voice in Retell config and record the default voice id (voice is
  configured in Retell, NOT called from our code — invariant #7).
Re-running the script must not duplicate resources.
```

## Ticket 3 — Retell integration layer
```
Build lib/retell/: flow CRUD that always does create-version->publish (invariant #3);
Batch Call API wrapper (tasks carry to_number + retell_llm_dynamic_variables, plus a
target_concurrency_limit); setVoice(provider, voiceId) that mutates Retell config only
(invariant #7); Edge webhook handlers at /api/webhooks/retell/events (call_started,
transcript_update, call_ended, call_analyzed) and /api/webhooks/retell/tools
(detect_blueprint, report_stage_change, log_objection, book_meeting). Handlers verify the
signature, write to Postgres, publishTileUpdate to the campaign channel, return < 5s; slow
work via waitUntil() (invariant #2). The in-call LLM is set in Retell config, not here.
```

## Ticket 4 — Intake -> detection -> profile
```
Build intake as a Retell web/WebRTC flow rendered by the existing onboarding component
(keep its typed form behind a discreet "type instead" toggle — invariant #9). The intake
flow must, per AGENTS.md "decided design questions": call the detect_blueprint server tool
EARLY to choose the vertical, then collect exactly the fields named in that blueprint's
dynamic_var_schema (never hardcode dental fields). Run /api/scrape in parallel (Gemini 3.1
Pro -> structured profile). Enforce a hard turn cap via a guaranteed "ready to deploy?"
transition node. Stream transcript_update to the live profile card via the campaign channel.
On confirm, POST /api/intake/complete which validates the filled schema before dispatch.
```

## Ticket 5 — Lead sourcing
```
Implement b2b_local_services.sourceLeads as the Clay adapter (lib/clay/): POST search
params (business type + geography from intake) to the Clay webhook-in; receive enriched
rows at /api/webhooks/clay; upsert into leads; validate/format phones to E.164 and drop
fax/invalid/likely-disconnected; set enrichment_status so the dispatcher can call ready
leads while others enrich. Implement CSV import as real_estate_acquisition.sourceLeads.
Honor compliance_profile.scrubLeads() before any consumer-audience dial (stub ok, but wired).
```

## Ticket 6 — Persona + call-context injection
```
Do NOT generate flows here (they were provisioned in 2.5). Implement
buildCallContext(profile, leadId, personaId): returns the dynamic variables + per-call node
overrides that inject the persona (personas/ fragment + Retell voice id + intensity +
guardrails) and lead specifics into the vertical's template flow. Ship personas per PRD
section 7 (internal names mapped to archetypes; expose archetypes in UI). Runtime does data
injection only — no LLM call at dispatch.
```

## Ticket 7 — War-room dashboard
```
Rewire components/c4u/war-room.tsx: replace the removed setInterval simulator with a
subscription to the campaign channel via lib/realtime (token-safe per invariant #1;
handle SSE reconnection). Tiles sized to real concurrency (default 24, PRD section 8) and
ramp with real dial pacing — no filler/queued padding. Click -> drawer (call-drawer.tsx):
live transcript ticker from transcript_update + full transcript from call_analyzed + the
blueprint's win_condition state (real, never faked — invariant #6). review.tsx shows the
real Call record. Add filters + campaign history (ops-console seed).
```

## Ticket 8 — End-to-end wiring + dry run
```
Wire cell4you-app.tsx launchFromDeploy to the new pipeline: START (mint campaign_id) ->
intake (detect + profile) -> confirm -> sourceLeads -> buildCallContext -> Retell batch
dispatch -> live events -> tiles -> real outcomes. Add a planted-number override
(DEMO_PLANTED_PHONE injected into the task list = known live tile) plus a pre-recorded
fallback triggered by clicking that tile if the live call fails. Run an end-to-end test
against b2b_local_services with 5 real leads. Then update README to the new stack.
```
