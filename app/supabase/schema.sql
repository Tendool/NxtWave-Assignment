-- Run this once in the Supabase SQL editor.
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  whatsapp text not null unique,
  college text not null,
  branch text not null,
  year text not null,
  ref_code text not null unique,
  referred_by text,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  ref_code text,
  name text not null,
  project_url text not null,
  repo_url text,
  description text,
  scores jsonb not null,
  total int not null,
  feedback text not null,
  created_at timestamptz not null default now()
);

-- All access goes through the server using the service key.
alter table registrations enable row level security;
alter table evaluations enable row level security;
