-- Geteilte Einkaufslisten
-- Führe das im Supabase SQL Editor aus

create table if not exists shared_lists (
  code        text primary key,           -- kurzer 8-Zeichen Code z.B. "xK3mP9qR"
  items       jsonb not null default '[]', -- Liste als JSON
  owner_name  text default 'Jemand',      -- Name des Teilenden
  created_at  timestamptz default now(),
  expires_at  timestamptz default (now() + interval '7 days')
);

-- Automatisch abgelaufene Listen löschen (optional, per Cron)
create index if not exists shared_lists_expires_idx on shared_lists(expires_at);

-- RLS: Jeder darf lesen (öffentlicher Link), nur Service Role darf schreiben
alter table shared_lists enable row level security;
create policy "Public read" on shared_lists for select using (true);
create policy "Service write" on shared_lists for insert with check (true);
