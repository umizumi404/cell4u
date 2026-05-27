# Cell For You — Hackathon PRD

**One-liner**: A voice AI sales force for small businesses. Talk to our agent for two minutes about what you sell. We deploy a fleet of AI callers to your leads while you watch them work in real time.

**Track**: Best Project Using Voice AI ($1,000 cash, General Magic)
**Ship deadline**: 3:30 PM
**Demo length**: 3 minutes on stage
**Team**: AI engineer(s), Backend, Frontend, PM
**Stack**: Lovable + Cursor scaffolding, ElevenLabs Conversational AI, Twilio, Google Maps Places API, Next.js + WebSockets

---

## Why this wins

The hero moment is a live dashboard of 100 phone agents calling real businesses in parallel, with one of them closing a real deal on stage. Judges have seen a hundred ChatGPT wrappers today. They have not seen a wall of autonomous voice agents working their way through a lead list with live transcripts streaming in. The visceral image of "I just hired 100 salespeople in 2 minutes" sells itself.

We are not building a research prototype. We are building one screen that looks like a Bloomberg terminal for AI sales reps.

---

## The 60-second demo (build to this, not the other way around)

Daesol on stage. Single laptop, screen mirrored to projector. One planted phone in the audience (a teammate, ringer on, hand raised so judges can see it).

**0:00** Hero screen, black background, single white button: **START**. Daesol clicks.

**0:05** Intake voice agent fades in. Audio plays through the room speakers. Agent: *"Hi, I'm here to help you sell. What's your website?"*

**0:10** Daesol speaks: *"webpro.agency"*. URL appears on screen as the agent confirms it. Backend silently scrapes the site.

**0:15** Agent asks two crunchy questions back to back: *"What's your sweet spot project size?"* and *"Who's your dream client?"* Daesol answers conversationally. Onscreen the AI is visibly extracting structured fields (services, packages, ICP) into a card on the right.

**0:50** Agent: *"I've got enough. Ready to find you 100 leads in Toronto?"* Daesol: *"Go."*

**1:00** Screen transitions to the war room. 100 tiles fade in. Status bar at the bottom reads "Sourcing leads from Google Maps... 100 found... Deploying agents..." Tiles start lighting up: DIALING, RINGING, NO ANSWER, VOICEMAIL, CONNECTED.

**1:20** One tile pulses green: CONNECTED — DISCOVERY. Daesol clicks it. Drawer slides open with a live transcript ticker and an audio waveform. The planted phone in the audience is now ringing live. The audience hears the AI's voice both from the laptop and faintly from the phone in the room. The teammate picks up and has a 30-second real conversation with the agent.

**2:00** Tile transitions: DISCOVERY → PITCH → OBJECTION → CLOSING. A second tile in the grid flips green to "DEAL BOOKED." (Pre-warmed second number, optional, only if time permits.)

**2:30** Daesol: *"That's Cell For You. Talk for two minutes, hire 100 salespeople. We're live today."*

Every cut decision below serves this 60 seconds.

---

## Scope: MUST ship

1. **Hero landing page** with a single START button. Dark, cinematic, one piece of text, one click target.
2. **Intake voice agent** in the browser via ElevenLabs Conversational AI. Asks for URL, then 3-4 clarifying questions, then confirms readiness to deploy.
3. **Website scraper** that hits the URL, pulls visible text + meta, runs it through an LLM to extract: business type, services, price points, geography. Runs in parallel with the intake conversation.
4. **Structured profile card** that visibly populates on screen during intake. This is what proves the AI actually listened.
5. **Google Maps lead sourcing**. Places API query based on extracted ICP + geography. Pull 100 results with names, phones, categories.
6. **Live dashboard**: 100 tiles in a grid. Each tile = one agent + one lead. Tile shows: lead name (business), current stage, variant tag (A/B/C/D), call duration, status color.
7. **Twilio outbound calls**, real ones, as many concurrent as the account supports. Start with whatever the account allows (often 1-2 on a trial account, more on a paid one).
8. **Call state machine** wired to Twilio webhooks: Queued → Dialing → Ringing → Connected → Ice-breaking → Discovery → Pitch → Objection → Closing → Closed-won / Closed-lost / Voicemail / No-answer.
9. **Tile drawer**: click any tile, see live transcript + audio stream + which script variant is running.
10. **Script variant generator**: take base script, fan out into 4 variants (different opener, different value prop framing). Each agent gets one. Show variant ID on tile.
11. **One planted demo number** that will pick up live on stage. Hardcoded into the lead list so we know which tile to click.

## Scope: CUT (do not build, do not discuss)

- Auth / login / accounts
- Saving anything between sessions
- A settings page
- Editing the script after generation
- Filtering or searching the dashboard
- Multi-business support
- Any text input field anywhere in the UI (hackathon rule + design discipline)
- Pricing page, about page, footer links
- Mobile responsive (project to single laptop, judges will not pull it up on a phone)
- Real feedback-loop learning across calls (we will say it does this on the slide, we will not build it)
- Smart objection handling beyond what the base ElevenLabs agent does out of the box
- Actually following up on closed deals

## Scope: FAKE WELL

- The "AI learns from each call and improves the script" feedback loop. We log feedback to a panel that shows the loop visually. We do not actually retrain anything. The demo doesn't need it; the slide does.
- The 100-tile count. Source 100 real leads, queue them all, place real calls until Twilio's concurrent limit is hit. Remaining tiles show "QUEUED" honestly. Don't fake states on tiles that haven't run.

---

## Architecture

```
[Browser]
  ├─ Hero page (Next.js)
  ├─ ElevenLabs Conversational AI widget (intake)
  └─ War-room dashboard (Next.js + WebSocket)
        │
[Backend (Node/Express or Next API routes)]
  ├─ /scrape         → fetch URL, extract text, LLM → structured profile
  ├─ /leads          → Google Maps Places API → 100 leads
  ├─ /deploy         → spin up N call jobs, assign script variants
  ├─ /twilio-webhook → receive call state updates, push to WebSocket
  └─ /transcript-ws  → live transcripts from ElevenLabs out to dashboard
        │
[External]
  ├─ ElevenLabs Conversational AI (intake voice + outbound voice)
  ├─ Twilio Voice (outbound dialing, webhooks)
  └─ Google Maps Places API (lead sourcing)
```

---

## Component owners and time blocks

Time is measured from now (T+0). All four workstreams run in parallel from T+0:00. Integration starts at T+1:30. Hard freeze at T+2:30 for demo rehearsal.

| Workstream | Owner | T+0:00 → 1:30 | T+1:30 → 2:30 | T+2:30 → 3:00 |
|---|---|---|---|---|
| **Frontend** | Frontend lead | Hero page + war-room shell with mocked tiles; design polish, dark cinematic look, transitions | Wire WebSocket, click-to-drawer, live transcript ticker, audio waveform | Polish only; no new features |
| **Intake voice + scrape** | AI engineer | ElevenLabs agent configured with system prompt to extract URL + ICP + services; scraper endpoint returns structured JSON | Wire intake confirmation to trigger /deploy; populate profile card live | Rehearse intake flow end-to-end |
| **Outbound calls + leads** | Backend | Google Maps Places integration returning 100 leads; Twilio outbound trigger working for a single call end-to-end | Spin up parallel calls, hook Twilio webhooks to state machine, push state to WebSocket | Confirm planted number reliably connects |
| **Demo + PM** | Daesol | System prompts for both agents; script variants; demo script written; planted phone arranged | Rehearse on-stage flow; identify break points; build fallback if Twilio fails | Two full dry runs of the 3-min demo |

---

## The two voice agents (system prompt notes)

**Intake agent**
Opens with: *"Hi, I'm here to help you sell. What's your website?"*
Has 4 required fields to extract before it can complete: `website_url`, `core_services`, `price_range`, `ideal_customer_description`.
Asks one question per turn. Confirms each field back. When all four are filled, says: *"I've got enough. Ready to find your leads?"* and waits for explicit yes/go before triggering deploy.
Tone: warm, efficient, slightly sharp. Not chirpy. Think senior account exec.

**Outbound agent (4 variants)**
Variant A: Curious opener. *"Hi, this is Sam calling from [business]. Quick one, do you currently work with anyone for [service]?"*
Variant B: Direct opener. *"Hi, I'll keep this short. I help [business type] with [outcome]. Got 30 seconds?"*
Variant C: Referral framing. *"Hi, I saw [lead business] online and thought you'd be a great fit for what we do at [business]."*
Variant D: Question opener. *"Hi, this is Sam. Quick question: how are you handling [problem the user's business solves] right now?"*
All four follow the same stage flow: ice-break → discovery → pitch → objection → close. Each stage transition is detected by the agent and sent to the backend as a state update.

---

## Risks and mitigations

1. **Twilio trial account caps concurrent calls.** Mitigation: confirm account tier before T+0:30. If we're stuck at 1-2 concurrent, the dashboard still shows 100 tiles with most in QUEUED, and the demo still works because the magic is the wall + the live call, not the throughput.

2. **Planted demo phone fails to connect.** Mitigation: two planted phones, two teammates. If both fail, fall back to a pre-recorded call replay triggered by clicking a tile. Build this fallback at T+2:00 just in case.

3. **Google Maps returns junk numbers.** Mitigation: filter for business listings with verified phone format. Pre-test with the actual ICP query before demo. If it's bad, hand-curate 20 leads from the same query.

4. **Intake agent hallucinates or won't terminate.** Mitigation: hard-code a max of 6 turns. After turn 6, force the "ready to deploy" prompt regardless of how complete the profile is.

5. **The all-voice rule (no text inputs).** Verified in scope above. The only click is START. Every other input is spoken or implicit (clicking a tile to view).

---

## DevPost submission checklist

Submit at **T+2:45**, not at the end. Required fields:
- Project name: **Cell For You**
- Tagline: "Hire 100 AI salespeople in 2 minutes."
- Track: Best Project Using Voice AI
- Tech: Cursor, Lovable, ElevenLabs, Twilio, Google Maps, Next.js
- Demo video: 60-second screen recording made during T+2:00 dry run
- Live URL: deployed on Vercel (Lovable handles this)

---

## What we say when we win

"We built a voice AI that talks to a business owner, learns what they sell, and deploys a fleet of voice agents to close their leads. Real calls, real businesses, real time. Today, in 3 hours."
