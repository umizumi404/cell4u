
# Cell For You
## Product Requirements Document (PRD)
## + Technical Design Document (TDD)

# 1. Overview

## Product Name
Cell For You

## Vision
Cell For You turns a spoken sales idea into an outbound AI sales campaign.

A user speaks naturally to the dashboard about:
- what they sell
- who they sell to
- pricing
- location
- desired outcome

The system then:
1. generates a sales campaign,
2. finds leads using Google Maps,
3. deploys AI voice agents,
4. calls businesses automatically,
5. and surfaces qualified leads and booked meetings in a live dashboard.

The primary UX principle is:
> no typing.

# 2. Core User Flow

## Step 1 — Voice Campaign Setup
The user opens the dashboard.

A voice onboarding flow begins using Wispr Flow + speech input.

The user answers:
- What are you selling?
- Who should we sell it to?
- What problem does it solve?
- What counts as a successful call?
- Where should we search for leads?

The system builds a structured campaign object.

## Step 2 — Campaign Confirmation
The app summarizes the campaign.

Example:
“You’re selling web design services to landscaping businesses in Ottawa that don’t have websites. A successful outcome is a booked meeting or confirmed purchase intent.”

The user confirms.

## Step 3 — Lead Generation
The system queries Google Places API.

The system retrieves:
- business name
- phone number
- address
- website
- ratings
- hours

The system filters leads:
- must have phone number
- prioritize missing website

## Step 4 — Prompt Generation
The system generates:
- master sales prompt
- objection handling
- CTA structure

## Step 5 — Outbound Calls
Calls are placed through:
- Twilio
- ElevenLabs

## Step 6 — Live Dashboard
Statuses include:
- queued
- calling
- interested
- booked
- callback
- not interested
- do not call

Users can:
- listen to recordings
- read transcripts
- review summaries

# 3. Tech Stack

## Frontend
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui

## Hosting
- Vercel

## Backend
- Next.js Route Handlers
- Next.js Server Actions

## Database
- Supabase Postgres
- Supabase Realtime

## Voice Input
- Wispr Flow

## Lead Generation
- Google Places API

## Calling Layer
- Twilio
- ElevenLabs Conversational AI

# 4. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=
ANTHROPIC_API_KEY=

GOOGLE_MAPS_API_KEY=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
```

# 5. Core Architecture

Frontend (Next.js)
↓
Voice onboarding
↓
Campaign object generation
↓
Google Places lead scraping
↓
Prompt generation
↓
Outbound calls
↓
Realtime dashboard updates

# 6. Database Schema

## campaigns
- id
- business_name
- offer
- target_customer
- generated_prompt
- status

## leads
- id
- campaign_id
- business_name
- phone
- website
- status

## calls
- id
- lead_id
- transcript
- recording_url
- outcome

# 7. Core Components

- VoiceSetup.tsx
- CampaignSummary.tsx
- LeadTable.tsx
- LiveCallBoard.tsx
- CallTranscript.tsx

# 8. API Routes

- POST /api/campaign/create
- POST /api/leads/find
- POST /api/prompt/generate
- POST /api/calls/start
- POST /api/webhooks/twilio
- POST /api/webhooks/elevenlabs

# 9. Product Insight

Cell For You is:
> an autonomous outbound sales engine.

Users speak.
The system builds.
The agents sell.
