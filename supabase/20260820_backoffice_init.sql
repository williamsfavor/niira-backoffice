-- NIRA Back Office initial setup.
-- Run this once in the SAME Supabase project used by Niira-Bot.
-- Supabase Auth is intentionally not used during testing. The dashboard password
-- is configured in .env.local and is not stored in this table.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null check (role in ('super_admin', 'ops_admin', 'content_editor', 'support_agent', 'nira_liaison')),
  is_active boolean not null default true,
  two_factor_enabled boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The fixed ID is shared with the dashboard's temporary audit actor.
insert into public.admin_users (id, name, email, role, is_active)
values (
  '99999999-9999-4999-8999-999999999999',
  'Tusiime Sam',
  'tusiimesam@gmail.com',
  'super_admin',
  true
)
on conflict (email) do update
set name = excluded.name,
    role = excluded.role,
    is_active = true,
    updated_at = now();

create table if not exists public.app_settings (
  id text primary key,
  standard_days_by_type jsonb not null default '{"Renewal":{"min":10,"max":14}}'::jsonb,
  escalation_fail_count_threshold integer not null default 2 check (escalation_fail_count_threshold > 0),
  ticket_sla_hours integer not null default 24 check (ticket_sla_hours > 0),
  session_ttl_minutes integer not null default 30 check (session_ttl_minutes > 0),
  messaging_window_hours integer not null default 24 check (messaging_window_hours > 0),
  updated_by uuid references public.admin_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, updated_by)
values ('nira-config', '99999999-9999-4999-8999-999999999999')
on conflict (id) do nothing;
