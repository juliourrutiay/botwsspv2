create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  timezone text not null default 'America/Santiago',
  business_type text,
  created_at timestamptz default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text,
  role text check (role in ('owner','admin','staff')) default 'owner',
  created_at timestamptz default now()
);

create or replace function public.current_user_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create table public.whatsapp_configs (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  phone_number_id text not null,
  waba_id text not null,
  access_token_encrypted text not null,
  verify_token text not null,
  app_secret_encrypted text not null,
  webhook_enabled boolean default false,
  last_test_at timestamptz,
  updated_at timestamptz default now()
);

create table public.agent_configs (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  agent_name text not null default 'Asistente virtual',
  agent_model text not null default 'openai/gpt-4o-mini',
  system_prompt text not null,
  tone text not null default 'profesional, claro y amable',
  business_info jsonb not null default '{}'::jsonb,
  services jsonb not null default '[]'::jsonb,
  products jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  policies jsonb not null default '{}'::jsonb,
  business_hours jsonb not null default '{}'::jsonb,
  handoff_message text default 'Te paso con una persona del equipo para que pueda ayudarte mejor.',
  fallback_message text default 'No tengo suficiente información para responder con seguridad. Te contactaré con una persona del equipo.',
  bot_enabled_by_default boolean default true,
  updated_at timestamptz default now()
);

create table public.survey_configs (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  enabled boolean default true,
  pre_close_question text default '¿Tienes alguna otra duda o consulta?',
  resolution_question text default '¿Logramos resolver tu consulta?',
  positive_thanks_message text default '¡Gracias por responder! Nos alegra haber podido ayudarte.',
  negative_feedback_question text default 'Cuéntanos qué nos faltó para ser más resolutivos.',
  negative_thanks_message text default 'Gracias por contarnos. Usaremos tu comentario para mejorar nuestra atención.',
  expired_message text default 'Gracias por contactarnos.',
  timeout_minutes int not null default 30,
  updated_at timestamptz default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  wa_phone text not null,
  full_name text,
  email text,
  metadata jsonb default '{}'::jsonb,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (organization_id, wa_phone)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  bot_active boolean default true,
  status text check (status in ('open','pending_human','survey_pending','survey_feedback_pending','closed')) default 'open',
  last_message_at timestamptz default now(),
  assigned_to uuid references public.profiles(id),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  wa_message_id text,
  direction text check (direction in ('inbound','outbound')) not null,
  sender text check (sender in ('contact','bot','human','system')) not null,
  content text,
  message_type text default 'text',
  raw jsonb,
  created_at timestamptz default now(),
  unique (organization_id, wa_message_id)
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  provider text not null,
  external_event_id text,
  event_type text,
  payload jsonb not null,
  status text check (status in ('pending','processed','failed','ignored')) default 'pending',
  error text,
  created_at timestamptz default now(),
  processed_at timestamptz,
  unique(provider, external_event_id)
);

create table public.human_handoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  requested_by text check (requested_by in ('customer','bot','human','system')) default 'bot',
  reason text,
  status text check (status in ('requested','accepted','resolved')) default 'requested',
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table public.conversation_surveys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  triggered_by text check (triggered_by in ('bot','human','system')) not null,
  survey_type text check (survey_type in ('resolutividad','nps')) default 'resolutividad',
  question text not null default '¿Logramos resolver tu consulta?',
  response_raw text,
  resolved boolean,
  score int,
  feedback text,
  status text check (status in ('pending','answered','feedback_pending','completed','expired')) default 'pending',
  sent_at timestamptz default now(),
  answered_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz default now()
);

create index messages_conversation_created_at_idx on public.messages(conversation_id, created_at desc);
create index messages_organization_created_at_idx on public.messages(organization_id, created_at desc);
create index conversations_organization_last_message_idx on public.conversations(organization_id, last_message_at desc);
create index contacts_organization_phone_idx on public.contacts(organization_id, wa_phone);
create index webhook_events_status_idx on public.webhook_events(provider, status, created_at desc);
create index human_handoffs_organization_status_idx on public.human_handoffs(organization_id, status, created_at desc);
create index conversation_surveys_organization_created_idx on public.conversation_surveys(organization_id, created_at desc);
create index conversation_surveys_conversation_idx on public.conversation_surveys(conversation_id);
create index conversation_surveys_resolved_idx on public.conversation_surveys(organization_id, resolved);
create index conversation_surveys_expiration_idx on public.conversation_surveys(status, expires_at);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.whatsapp_configs enable row level security;
alter table public.agent_configs enable row level security;
alter table public.survey_configs enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.webhook_events enable row level security;
alter table public.human_handoffs enable row level security;
alter table public.conversation_surveys enable row level security;

create policy "org select own" on public.organizations
  for select using (id = public.current_user_organization_id());
create policy "org update own" on public.organizations
  for update using (id = public.current_user_organization_id()) with check (id = public.current_user_organization_id());

create policy "profiles select own org" on public.profiles
  for select using (organization_id = public.current_user_organization_id());
create policy "profiles update self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "whatsapp select own" on public.whatsapp_configs
  for select using (organization_id = public.current_user_organization_id());
create policy "whatsapp upsert own" on public.whatsapp_configs
  for all using (organization_id = public.current_user_organization_id()) with check (organization_id = public.current_user_organization_id());

create policy "agent select own" on public.agent_configs
  for select using (organization_id = public.current_user_organization_id());
create policy "agent update own" on public.agent_configs
  for update using (organization_id = public.current_user_organization_id()) with check (organization_id = public.current_user_organization_id());

create policy "survey config select own" on public.survey_configs
  for select using (organization_id = public.current_user_organization_id());
create policy "survey config update own" on public.survey_configs
  for update using (organization_id = public.current_user_organization_id()) with check (organization_id = public.current_user_organization_id());

create policy "contacts own org" on public.contacts
  for all using (organization_id = public.current_user_organization_id()) with check (organization_id = public.current_user_organization_id());
create policy "conversations own org" on public.conversations
  for all using (organization_id = public.current_user_organization_id()) with check (organization_id = public.current_user_organization_id());
create policy "messages own org" on public.messages
  for all using (organization_id = public.current_user_organization_id()) with check (organization_id = public.current_user_organization_id());
create policy "webhook events own org" on public.webhook_events
  for select using (organization_id = public.current_user_organization_id());
create policy "handoffs own org" on public.human_handoffs
  for all using (organization_id = public.current_user_organization_id()) with check (organization_id = public.current_user_organization_id());
create policy "conversation surveys own org" on public.conversation_surveys
  for all using (organization_id = public.current_user_organization_id()) with check (organization_id = public.current_user_organization_id());

create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, 'negocio')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  org_name text;
  user_full_name text;
  base_slug text;
begin
  org_name := coalesce(new.raw_user_meta_data->>'organization_name', split_part(new.email, '@', 1), 'Mi negocio');
  user_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  base_slug := public.slugify(org_name) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into public.organizations (name, slug)
  values (org_name, base_slug)
  returning id into org_id;

  insert into public.profiles (id, organization_id, full_name, role)
  values (new.id, org_id, user_full_name, 'owner');

  insert into public.agent_configs (organization_id, system_prompt)
  values (
    org_id,
    'Eres el asistente virtual de este negocio. Tu objetivo es ayudar a los clientes por WhatsApp de forma clara, amable y útil. Responde solo con información entregada por el negocio. No inventes precios, horarios, productos, servicios ni políticas. Si no tienes información suficiente, pide aclaración o deriva a una persona. Mantén respuestas breves y naturales para WhatsApp. Si el cliente pide hablar con una persona, deriva inmediatamente. Si detectas molestia, reclamo o urgencia, deriva a humano. No pidas datos bancarios ni información sensible.'
  );

  insert into public.survey_configs (organization_id)
  values (org_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
