# AGENTS.md

Repo-root context for AI coding agents (Claude Code / Cursor). Read this **before every
task**, alongside `docs/cell_for_you_prd_v2.md` and the specific ticket in
`docs/BUILD_PLAN.md`. These are invariants — violating one is a bug even if the code
"works." (v2.1 — patched after the Ticket 0 migration map.)

---

## What this project is

Cell For You: a multi-vertical voice-AI sales platform. A user describes their business
by voice; we detect their **vertical (Blueprint)**, source + enrich leads, build a
persona-tuned salesperson, and run a fleet of outbound calls on Retell while the user
watches a live war-room dashboard. The same pipeline must serve B2B (e.g. agency →
dentists) and B2C (e.g. real-estate investor → property owners).

---

## Stack (canonical — do not substitute without updating this file)

- **Frontend / API**: Next.js (App Router) on **Vercel**. API routes use the **Edge runtime**.
- **No traditional backend.** No long-running Node/Express server. No self-hosted sockets.
- **Voice / calls**: **Retell AI** — Conversation Flows + Batch Call API. Voice provider
  (Cartesia default) is selected **inside Retell's config**, not called from our code.
- **Leads**: **Clay** (Google Maps source + waterfall enrichment, webhook-in/out, no SDK) + CSV import.
- **Realtime -> browser**: **`@upstash/realtime`** (HTTP/SSE over Redis streams) or a
  self-owned SSE Edge route backed by Upstash. Upstash Redis also holds hot state + the
  durable event log. (Pusher/Ably are acceptable swaps.)
- **DB**: **Vercel Postgres / Neon** for relational state.

### Dependencies — what belongs in *our* repo
Add: `retell-sdk`, `@upstash/redis`, `@upstash/realtime`, a Postgres driver
(`@vercel/postgres` or `@neondatabase/serverless`), a Gemini client (offline scrape only),
`zod`. Keep React/Next/Tailwind v4/Radix/shadcn/`clsx`.
**Do NOT add**: `@elevenlabs/*`, `twilio`, `openai`, a Cartesia SDK, `@supabase/*`. The
in-call LLM and the TTS voice are chosen in **Retell's** config — neither needs an SDK
or an API key in *our* codebase. The only model SDK we may need at runtime is the Gemini
client used by `/api/scrape`. Flow authoring (Claude Opus 4.7) is a **design-time**
activity done during provisioning (see invariant #10), not a runtime dependency.

---

## Hard invariants (never violate)

1. **Vercel cannot host a WebSocket server.** Browser realtime goes through
   `@upstash/realtime` or a self-owned SSE Edge route. **Never expose the Upstash token to
   the browser** — if a client subscribes directly, use a read-only token; otherwise proxy
   through an Edge route. SSE on Edge is capped at ~300s, so implement reconnection for any
   call/campaign that outlives one stream window.
2. **Retell webhooks must return < 5 seconds.** Validate signature, write state, publish,
   return. Slow work (LLM, enrichment) happens *before dispatch* or async via `waitUntil()` —
   never inline in a webhook handler.
3. **Published Retell flows are immutable.** Change = new version -> publish. Do **not**
   generate a fresh published flow per campaign — use the small set of stable template
   flows (one per vertical, provisioned per invariant #10) and inject per-call data via
   dynamic variables and per-call overrides.
4. **One agent serves unlimited concurrent calls within the concurrency quota.** Never
   create an agent per campaign or per lead. PAYG quota = 20 concurrent (upgradeable).
5. **No vertical-specific logic outside `blueprints/`.** Intake, sourcing, flow context,
   dispatch, and dashboard read from the active `CampaignBlueprint`. If you're about to
   write `if (vertical === "dentist")` outside a blueprint module, stop.
6. **Outcomes are real.** A terminal tile state (e.g. "booked") must correspond to an
   actual tool-call write / booking. Never fake terminal states, transcripts, or scores.
7. **Voice provider is Retell config, not our code.** Set it via the Retell agent/flow
   config (`setVoice(provider, voiceId)` operates on Retell). We never call Cartesia/TTS directly.
8. **Compliance is foundational.** Respect each blueprint's `compliance_profile`: inject
   `disclosure_line` when present; route through `scrubLeads()` when `dnc_scrub_required`.
   The `real_estate_acquisition` blueprint stays feature-flagged until `scrubLeads()` is real.
9. **No text inputs in the demo path** except a discreet "type instead" affordance on intake.
10. **Retell account resources are provisioned once, not per-run.** Template flows (one per
    vertical), the outbound `from_number` (Retell-managed or BYO Twilio imported into Retell),
    the registered webhook URLs, and the Cartesia voice connection are created by a seed
    script (Ticket 2.5) — never created or mutated inside the request path.
11. **Every campaign has an id used as the realtime channel.** v0 has no auth, but generate
    an anonymous session/campaign id at START; all tiles, events, and the dashboard
    subscription are keyed to it. No global broadcast channels.

---

## Decided design questions (do not re-litigate)

- **Blueprint detection runs in-call, early.** The intake Retell flow calls a
  `detect_blueprint` server tool near the top, because the *set of fields to collect*
  (`dynamic_var_schema`) differs per vertical — the agent must know the vertical to ask the
  right questions. `/api/intake/complete` then validates the filled schema before dispatch.
- **Flow generation is design-time.** Template flows are authored/validated once (Ticket 2.5,
  optionally via Claude Opus 4.7 or Retell's MCP) and published. Runtime only injects
  dynamic variables + overrides — no LLM call at dispatch.

---

## Repo conventions

- `blueprints/<vertical_id>/` — one module per vertical: a `CampaignBlueprint` + a
  `BlueprintAdapter` (`sourceLeads`, `buildCallContext`, `classifyOutcome`).
- `lib/retell/` — typed client: flow CRUD (create-version->publish), batch call, voice config,
  webhook handlers, signature verify.
- `lib/clay/` — webhook-in dispatch + webhook-out receiver + phone validation (E.164).
- `lib/realtime/` — `@upstash/realtime` setup + `publishTileUpdate`; client subscribe helper
  (token-safe per invariant #1).
- `lib/db/` — Postgres client + queries + `db/migrations/`.
- `scripts/provision/` — Ticket 2.5 seed (template flows, number, webhooks, voice).
- `personas/` — prompt fragments + Retell voice id + `intensity` (0–1, guard-railed) per persona.
- `app/api/webhooks/{retell/events,retell/tools,clay}` — Edge, signature-validated, <5s.
- Env: `RETELL_API_KEY`, `RETELL_WEBHOOK_SECRET`, `RETELL_FROM_NUMBER`, `CLAY_WEBHOOK_URL`,
  `CLAY_WEBHOOK_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
  `UPSTASH_REDIS_READONLY_TOKEN`, `POSTGRES_URL`, `GEMINI_API_KEY`, `APP_BASE_URL`,
  `DEMO_PLANTED_PHONE`. (No Cartesia/OpenAI/Twilio/ElevenLabs/Supabase keys.)

## Model routing defaults

- In-call agent / intake agent: selected **in Retell config** — default a fast model
  (Gemini 3.5 Flash / GPT-5 mini class). Objection node may override to a stronger model.
  Confirm exact names against Retell's current model dropdown at build time.
- Offline site scrape -> profile: **Gemini 3.1 Pro** (fallback Claude Sonnet 4.6) via `/api/scrape`.
- Design-time flow authoring: **Claude Opus 4.7** (provisioning only).
- Never put a frontier reasoning model in the live call loop (latency).

## Context hygiene

- There must be exactly one source of standing truth. If a legacy `CLAUDE.md` exists, it is
  **deleted or reduced to a single line pointing here** before any other work — a stale
  CLAUDE.md describing the old stack poisons context every session.
- `docs/cell_for_you_prd.md` (v1) is historical only. `docs/cell_for_you_prd_v2.md` wins.

## Definition of done (every ticket)

- Honors all hard invariants above.
- No vertical logic leaked outside `blueprints/`.
- Edge webhook handlers return < 5s and are idempotent.
- No secrets committed; deploys clean to Vercel; `/healthz` green.
- Extends the relevant adapter rather than special-casing a vertical.

---

## Patch v2.2 — validation lifecycle + schema shape (read this)

**Two-stage validation (resolves the Ticket 1 boot-deadlock).** Blueprint validation
happens at two distinct lifecycle stages — do not collapse them:
- **At module load** (`validateBlueprint`): structural checks only — `vertical_id` format,
  non-empty `persona_set`, every `enum` field has `options`, consumer audience implies
  `dnc_scrub_required`. These must fail loud at import / build time.
- **At dispatch** (`assertDispatchReady`): provisioning-readiness checks — `flow_template_id`
  is non-empty, `RETELL_FROM_NUMBER` is set. The Retell batch layer calls this immediately
  before placing any call. **`flow_template_id` is NOT validated at load** — it is empty
  until Ticket 2.5 provisions it, and the app must boot and develop cleanly in between.

**`dynamic_var_schema` shape.** The canonical shape is the rich form Ticket 1 shipped:
`Record<string, { kind: "string"|"number"|"enum"; required: boolean; label: string;
prompt: string; options?: string[]; example?: string }>`. The bare
`Record<string, kind>` in PRD section 2 is a *derived view* exposed via
`dynamicVarSchemaTypes(blueprint)`. Intake (Ticket 4) reads the rich form directly; the
blueprint is the single source of truth for which fields to collect and how to ask.

**Adapter contract is locked — fill bodies, never reshape signatures.**
`sourceLeads(params) -> Promise<Lead[]>`, `buildCallContext(profile, leadId, personaId)
-> Promise<{ dynamicVars: Record<string,string>; nodeOverrides?: NodeOverride[] }>`,
`classifyOutcome(toolCallLog) -> Outcome`, and a `scrubLeads(leads) -> Promise<Lead[]>`
compliance hook (stub ok, but present per invariant #8). Tickets 5/6/8 implement bodies;
they must not change these signatures.

**`classifyOutcome` is invariant-critical and must have unit tests** (book_meeting -> won;
objection-only -> not won; empty log -> not won) before it is considered done.
