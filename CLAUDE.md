# cell4you — design migration notes (read me first)

This file documents intentional gaps between the live app and a fully
production-grade Cell4You. Update it whenever you close one of the gaps
or add a new one.

Last touched: design-system one-shot migration (Phase 1–5 complete).

---

## What's real vs. simulated

| Surface | State | Driver |
| --- | --- | --- |
| Landing page | Real — fully migrated from `frontend_design` | `components/c4u/landing.tsx` |
| Onboarding intake | Real — **typed**, not voice | `components/c4u/onboarding.tsx` |
| Deploy screen | Real — fires `/api/campaign/create`, `/api/leads/find`, `/api/calls/start` | `components/cell-for-you/cell4you-app.tsx → launchFromDeploy` |
| War-room grid | Mostly **simulated** — see below | `components/c4u/war-room.tsx` + `war-room-sim.ts` |
| Call drawer transcript | Simulated — `LIVE_SCRIPT` constant | `components/c4u/call-drawer.tsx` |
| Review screen | Simulated — `REVIEW_TRANSCRIPT`, score, recording | `components/c4u/review.tsx` |

---

## Intentional gaps

### 1. Voice intake (deferred)

The original prototype used the brand voice agent (Wispr Flow) to ask
the four intake questions out loud. We removed the live-mic path and
swapped in text inputs. The `VoiceSphere` is still shown so the brand
still reads as a voice product; it just isn't transcribing speech.

To re-enable: swap each `<input>`/`<textarea>` in
`components/c4u/onboarding.tsx` for the previous `<VoiceSetup>` flow and
restore the Wispr token endpoint (`app/api/voice/wispr-token/route.ts`).

### 2. War-room tile transitions (simulated)

`tickAgent` in `components/c4u/war-room-sim.ts` walks every tile through
the same hard-coded timeline:

```
queued → dialing → ringing → connected → pitch → closing → <outcome>
```

This runs on a `setInterval(500ms)` clock. It is **not** driven by
Twilio call status. When the call-status webhook pipeline lands:

1. Subscribe to call updates (e.g. via Supabase realtime or SSE).
2. Replace the `useEffect(setInterval(...))` block in `war-room.tsx`
   with a subscription that updates each agent's `state` and `elapsed`
   from real events keyed by `agent.callId`.
3. Delete `war-room-sim.ts` (or keep it for storybook/landing).

### 3. War-room is padded with simulated tiles

We hit `/api/leads/find` with `maxResults = LIVE_AGENT_LIMIT = 3` to
stay inside provider quota during development. Those three real
businesses become the first three tiles. The remaining 33 tiles in the
war-room grid (`WAR_ROOM_TILES = 36`) are filler from
`buildInitialAgents`.

To go fully live: raise `LIVE_AGENT_LIMIT` to `FLEET_SIZE` (100) and
drop the `buildInitialAgents` filler pass in `cell4you-app.tsx`.

### 4. Call drawer transcript (simulated)

`components/c4u/call-drawer.tsx` reveals lines from a hard-coded
`LIVE_SCRIPT` array on a 1.5s interval. Replace with a real subscription
to live transcript chunks once webhooks deliver them.

### 5. Review screen (simulated)

`components/c4u/review.tsx` renders a fake transcript, recording
waveform, scrubber, and a 87/100 score. The "simulated" tag is shown in
the player meta line so users aren't misled.

To go real: thread the actual `Call` record (transcript, recordingUrl,
summary, outcome) into the `Review` component and render those instead.

### 6. Backend graceful degradation

If `/api/campaign/create`, `/api/leads/find`, or `/api/calls/start` fail
(missing Supabase service role key, missing Google/Twilio creds, etc.),
`launchFromDeploy` shows a toast and proceeds with a purely simulated
war room so the demo never dead-ends. Search for `setWarning(` in
`components/cell-for-you/cell4you-app.tsx` to find every fallback.

### 7. Supabase service role key

Server routes still depend on `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
for inserts. Until that env var is provided (or the routes are
refactored to write through an authenticated session), campaign and
lead persistence will fail and the app falls back to the simulated war
room described above. `.env.example` lists the variable.

---

## File map (new since the migration)

```
app/
  c4u/
    tokens.css          # color + type CSS variables (next/font-bound)
    kit.css             # all c4u-* component styles

components/
  c4u/
    types.ts            # Screen, AgentState, Profile, Agent, Campaign
    primitives.tsx      # Button, Pill, VoiceSphere, Waveform, StatRow,
                        # TranscriptList, AudioScrubber, formatTimer
    top-bar.tsx         # TopBar nav
    profile-card.tsx    # ProfileCard
    agent-tile.tsx      # AgentTile
    war-room-sim.ts     # buildInitialAgents + tickAgent (SIMULATED)
    landing.tsx         # Full landing page (hero + how + war + review + CTA)
    onboarding.tsx      # Typed-input intake flow
    deploy.tsx          # Profile summary + fleet card + Deploy CTA
    war-room.tsx        # Live grid + StatRow + drawer
    call-drawer.tsx     # Overlay drawer with live transcript (SIMULATED)
    review.tsx          # Full review screen (SIMULATED)

components/
  cell-for-you/
    cell4you-app.tsx    # Top-level orchestration; wires backend APIs
    voice-setup.tsx     # ORPHANED — was the live-voice intake. Safe to delete.
```

`frontend_design/` was deleted at the end of the one-shot migration. If
you need the original prototype, it's recoverable from git history.
