# Cell For You

Cell For You turns a spoken sales idea into an outbound AI sales campaign. Users
speak naturally, the app structures the campaign, finds phone-qualified local
leads, launches AI voice calls, and streams outcomes back into a live dashboard.

The interface is a dark, minimal enterprise SaaS dashboard built with Next.js 16,
Tailwind CSS v4, and shadcn/ui.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Copy `.env.example` to `.env.local` and fill in provider credentials as they
become available. The UI and route handlers have preview-safe fallbacks, but live
campaign persistence and calls require credentials.

## Provider Setup

### Supabase

Create a Supabase project, set `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, then run
the migration in `supabase/migrations`.

The schema enables RLS on public tables and scopes reads to the authenticated
campaign owner. Route handlers use the service role key for trusted server-side
work such as webhook updates.

### Google Places

`POST /api/leads/find` uses Places API Text Search (New) with an explicit field
mask:

```text
places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount
```

Phone and website fields can trigger higher-cost Google Places SKUs, so keep the
field mask tight.

### OpenAI

`POST /api/campaign/create` and `POST /api/prompt/generate` use structured JSON
outputs for campaign extraction and sales prompt generation. If `OPENAI_API_KEY`
is missing, deterministic fallbacks keep the development flow usable.

This key is not used for the live phone conversation. ElevenLabs runs the voice
agent and its configured LLM during calls; OpenAI is only an optional pre-call
campaign compiler.

### ElevenLabs + Twilio

`POST /api/calls/start` uses ElevenLabs Conversational AI's Twilio outbound call
endpoint. Configure:

```text
ELEVENLABS_API_KEY
ELEVENLABS_AGENT_ID
ELEVENLABS_AGENT_PHONE_NUMBER_ID
```

Twilio status callbacks should point to:

```text
https://your-domain.com/api/webhooks/twilio
```

ElevenLabs conversation webhooks should point to:

```text
https://your-domain.com/api/webhooks/elevenlabs
```

Twilio webhook signatures are validated when `TWILIO_AUTH_TOKEN` is configured.

### Wispr Flow

The browser voice adapter records audio, converts it to 16 kHz mono PCM WAV, and
streams base64 packets to Wispr Flow. Set `WISPR_CLIENT_ACCESS_TOKEN` for client
auth. In local development only, `WISPR_API_KEY` can be used directly by the
token route.

## Verification

Run:

```bash
npm run lint
npm run build
```

With live credentials, verify the full flow: create a campaign, find leads, start
one call, receive a provider webhook, and confirm the dashboard updates through
Supabase Realtime.
