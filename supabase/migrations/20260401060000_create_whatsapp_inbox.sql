-- WhatsApp Inbox: conversation and message storage for admin inbox

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,
  contact_name text,
  last_message_text text,
  last_message_at timestamptz,
  last_inbound_message_at timestamptz,
  last_outbound_message_at timestamptz,
  unread_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_conversations_last_message_at
  on public.whatsapp_conversations (last_message_at desc nulls last);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  wa_id text not null,
  message_id text unique,
  direction text not null check (direction in ('inbound', 'outbound', 'status')),
  message_type text,
  text_body text,
  media_id text,
  mime_type text,
  caption text,
  status text,
  error_message text,
  is_read boolean not null default false,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_messages_conversation_created
  on public.whatsapp_messages (conversation_id, created_at asc);

create index if not exists idx_whatsapp_messages_wa_id_created
  on public.whatsapp_messages (wa_id, created_at asc);

create index if not exists idx_whatsapp_messages_message_id
  on public.whatsapp_messages (message_id);
