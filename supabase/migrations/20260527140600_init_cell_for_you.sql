create extension if not exists "pgcrypto";

create type public.campaign_status as enum (
  'draft',
  'ready',
  'finding_leads',
  'calling',
  'paused',
  'completed'
);

create type public.call_status as enum (
  'queued',
  'calling',
  'interested',
  'booked',
  'callback',
  'not_interested',
  'do_not_call',
  'failed'
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  business_name text not null,
  offer text not null,
  target_customer text not null,
  problem_solved text,
  success_criteria text,
  location text,
  generated_prompt jsonb,
  status public.campaign_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  business_name text not null,
  phone text not null,
  address text,
  website text,
  rating numeric,
  user_rating_count integer,
  status public.call_status not null default 'queued',
  source_place_id text,
  raw_place jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  provider_call_id text,
  provider_conversation_id text,
  status public.call_status not null default 'queued',
  transcript text,
  recording_url text,
  summary text,
  outcome public.call_status,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.call_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  call_id uuid references public.calls(id) on delete cascade,
  provider text not null,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index campaigns_user_id_idx on public.campaigns(user_id);
create index leads_campaign_id_idx on public.leads(campaign_id);
create index leads_source_place_id_idx on public.leads(source_place_id);
create unique index leads_campaign_source_place_unique
on public.leads(campaign_id, source_place_id)
where source_place_id is not null;
create index calls_campaign_id_idx on public.calls(campaign_id);
create index calls_lead_id_idx on public.calls(lead_id);
create index calls_provider_call_id_idx on public.calls(provider_call_id);
create index call_events_call_id_idx on public.call_events(call_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger campaigns_set_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

create trigger calls_set_updated_at
before update on public.calls
for each row execute function public.set_updated_at();

alter table public.campaigns enable row level security;
alter table public.leads enable row level security;
alter table public.calls enable row level security;
alter table public.call_events enable row level security;

create policy "Users can read own campaigns"
on public.campaigns for select
using ((select auth.uid()) = user_id);

create policy "Users can insert own campaigns"
on public.campaigns for insert
with check ((select auth.uid()) = user_id);

create policy "Users can update own campaigns"
on public.campaigns for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can read campaign leads"
on public.leads for select
using (
  exists (
    select 1 from public.campaigns
    where campaigns.id = leads.campaign_id
      and campaigns.user_id = (select auth.uid())
  )
);

create policy "Users can read campaign calls"
on public.calls for select
using (
  exists (
    select 1 from public.campaigns
    where campaigns.id = calls.campaign_id
      and campaigns.user_id = (select auth.uid())
  )
);

create policy "Users can read campaign call events"
on public.call_events for select
using (
  exists (
    select 1 from public.campaigns
    where campaigns.id = call_events.campaign_id
      and campaigns.user_id = (select auth.uid())
  )
);

alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.calls;
