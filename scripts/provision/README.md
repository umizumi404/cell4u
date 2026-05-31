# scripts/provision/

Ticket 2.5 — one-shot Retell account setup. Run this BEFORE Tickets 3–8.

AGENTS.md invariant #10: Retell account resources (template flows, the
outbound `from_number`, webhook URLs, the Cartesia voice connection) are
provisioned **once, out of the request path**. This script is the only
sanctioned place that creates or mutates them.

## What this script does

1. **Authors + publishes one template Conversation Flow per declared vertical**
   (b2b_local_services + real_estate_acquisition, regardless of feature
   flag — flag-flips should be zero-friction). Tool URLs inside the flows
   are baked at provision time from `APP_BASE_URL` (Retell does not
   template-render them at call time).
2. **Publishes one intake flow** with the `detect_blueprint` server tool.
3. **Detects an outbound phone number** on the Retell account. Does NOT
   purchase one; if none exists, prints clear manual instructions.
4. **Detects a default voice**, preferring Cartesia. Does NOT connect a
   third-party voice provider; if Cartesia isn't connected, prints
   instructions.
5. **Creates one Agent per flow** (call + intake), binding voice + flow +
   the events webhook URL. BatchCall dispatches through these Agents.
   Skipped if no voice id was detected.
6. **Prints the env block** you copy into `.env.local` and Vercel.
7. **Updates `scripts/provision/.provisioned.json`** (gitignored) so re-runs
   stay idempotent (both flows and agents).

## What this script does NOT do

- Acquire phone numbers (Retell-managed or BYO Twilio) — requires payment
  authorization in the Retell dashboard.
- Connect Cartesia (or any voice provider) — requires an OAuth dance in
  the Retell dashboard.
- Write `.env` directly — too easy to clobber operator-owned values. The
  script prints the block, you paste it.
- Register webhook URLs at the **account** level — Retell scopes them to
  Agents (events) and individual CustomTools (tools). The script bakes
  the concrete URLs into both at provision time, derived from
  `APP_BASE_URL`. If you redeploy under a new origin, re-run the script.
- Issue a separate webhook signing secret — Retell signs payloads with
  your `RETELL_API_KEY`. There is no `RETELL_WEBHOOK_SECRET`. The
  runtime verifies via `Retell.verify(body, apiKey, signature)`.

## Running

```sh
# Dry-run (no Retell calls; prints the flow JSON it would publish):
npm run provision:dry

# Live:
npm run provision
```

Required env (in `.env` / `.env.local` / shell):

- `RETELL_API_KEY` — talks to Retell.
- `APP_BASE_URL` — public origin (e.g. `https://cell4u.vercel.app`). The
  script bakes webhook URLs into the provisioned resources, so this must
  match the deployment that will receive Retell's callbacks. For local
  dev with a tunnel, use the tunnel origin here.

## Re-running

Safe and expected. On re-run:

- Flows whose ids are in `.provisioned.json` are **updated** (Retell's
  `update` creates a new version, satisfying AGENTS.md invariant #3).
- If the ledger points at a flow id that Retell no longer knows about,
  the script logs a warning and creates a fresh one.
- The ledger is updated atomically at end-of-run.

## Manual follow-ups

After the script prints its env block:

1. Paste the printed lines into `.env.local` and Vercel project env.
2. If `RETELL_FROM_NUMBER` was missing: provision a number in the Retell
   dashboard, then run the script again (it will pick it up) or set the
   env var manually.
3. If `RETELL_DEFAULT_VOICE_ID` is not a Cartesia voice: connect Cartesia
   in the Retell dashboard and re-run; or set the env var to the correct
   Cartesia voice id manually. Re-running will then create the Agents.

## Why a local ledger (and not "look up by name")

Retell's Conversation Flow resource has no `name` field we can use as a
stable lookup key. Without the ledger, every re-run would create a new
flow and orphan the old one. The ledger is a thin file (gitignored) whose
sole purpose is to map a stable, human-readable key like
`cell4u/b2b_local_services/call/v1` to the Retell-generated
`conversation_flow_id`.
