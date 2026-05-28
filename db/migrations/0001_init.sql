-- 0001_init.sql — initial schema for Cell For You v0.
--
-- Design notes:
--   * No auth in v0 (AGENTS.md invariant #11). An anonymous session/campaign
--     id is minted client-side at START and used everywhere — no auth.users
--     FK, no RLS.
--   * Every operational table carries `vertical_id` so we can filter ops
--     queries per blueprint without joining back to campaigns.
--   * `outcomes` is a separate table from `calls` because the win_condition
--     payload (booked meeting details, callback request, ...) is structured
--     evidence that lives or dies with the tool-call write — keeping it in
--     its own row makes the "outcomes are real" invariant easier to audit
--     (invariant #6).
--   * `call_events` is the durable event log; the realtime stream is the
--     hot view of this same data.

create extension if not exists "pgcrypto";

create table if not exists campaigns (
  id              uuid primary key default gen_random_uuid(),
  vertical_id     text not null,
  status          text not null default 'draft'
                  check (status in ('draft','intake','ready','dispatching','calling','paused','completed')),
  -- Filled `dynamic_var_schema` values produced by intake (Ticket 4).
  -- Always strings on the wire to match Retell dynamic_variables.
  profile_filled  jsonb not null default '{}'::jsonb,
  profile_notes   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists campaigns_vertical_idx on campaigns(vertical_id);

create table if not exists leads (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references campaigns(id) on delete cascade,
  vertical_id         text not null,
  phone               text not null,
  display_name        text not null,
  attributes          jsonb not null default '{}'::jsonb,
  enrichment_status   text not null default 'pending'
                      check (enrichment_status in ('pending','ready','failed')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists leads_campaign_idx on leads(campaign_id);
create index if not exists leads_phone_idx on leads(phone);

create table if not exists calls (
  id                          uuid primary key default gen_random_uuid(),
  campaign_id                 uuid not null references campaigns(id) on delete cascade,
  lead_id                     uuid not null references leads(id) on delete cascade,
  vertical_id                 text not null,
  retell_call_id              text unique,
  status                      text not null default 'queued'
                              check (status in (
                                'queued','dialing','ringing','in_call',
                                'completed','failed','no_answer','voicemail'
                              )),
  archetype                   text,
  transcript                  text,
  recording_url               text,
  summary                     text,
  started_at                  timestamptz,
  completed_at                timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists calls_campaign_idx on calls(campaign_id);
create index if not exists calls_lead_idx on calls(lead_id);

create table if not exists call_events (
  id            bigserial primary key,
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  call_id       uuid references calls(id) on delete cascade,
  -- The Retell event/tool name (e.g. 'call_started', 'transcript_update',
  -- 'book_meeting'). Free text by design — we don't want to gate new
  -- Retell events behind a migration.
  event_type    text not null,
  payload       jsonb not null,
  -- The Retell webhook delivery id, used for idempotency
  -- (AGENTS.md DoD: webhook handlers are idempotent).
  delivery_id   text,
  created_at    timestamptz not null default now()
);

create index if not exists call_events_campaign_idx on call_events(campaign_id);
create index if not exists call_events_call_idx on call_events(call_id);
create unique index if not exists call_events_delivery_uniq
  on call_events(delivery_id) where delivery_id is not null;

create table if not exists outcomes (
  id            uuid primary key default gen_random_uuid(),
  call_id       uuid not null unique references calls(id) on delete cascade,
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  vertical_id   text not null,
  -- Mirrors blueprints/_types.ts OutcomeKind. String, not enum, so a new
  -- blueprint outcome doesn't require a migration.
  kind          text not null,
  -- For wins: the verbatim arguments of the success_event tool call
  -- (e.g. book_meeting). For non-wins: any classifier evidence.
  evidence      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists outcomes_campaign_idx on outcomes(campaign_id);
create index if not exists outcomes_vertical_idx on outcomes(vertical_id);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists campaigns_set_updated_at on campaigns;
create trigger campaigns_set_updated_at before update on campaigns
  for each row execute function set_updated_at();

drop trigger if exists leads_set_updated_at on leads;
create trigger leads_set_updated_at before update on leads
  for each row execute function set_updated_at();

drop trigger if exists calls_set_updated_at on calls;
create trigger calls_set_updated_at before update on calls
  for each row execute function set_updated_at();
