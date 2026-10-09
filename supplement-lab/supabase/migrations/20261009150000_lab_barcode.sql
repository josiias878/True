-- ════════════════════════════════════════════════════════════════════════════
-- Kolbi · Barcode → Bibliothek (9. Okt 2026)
-- Nur neue Tabellen + eine neue Funktion; nichts Bestehendes wird verändert.
-- Zugriff ausschließlich über die Edge-Function lab-barcode (Service-Role). RLS an, keine Policies.
--
-- barcode_map    bestätigte Zuordnung Code → Bibliotheks-ID (lib/supplementLab.ts). source 'team' = von Hand
--                gepflegt (inkl. Menge/Einheit pro Portion), 'crowd' = automatisch ab 2 übereinstimmenden Geräten.
-- barcode_votes  anonyme Meldungen (Code, SHA-256 aus Code + zufälliger App-Geräte-ID, lib) – kein Freitext.
-- barcode_off    Zwischenspeicher der Open-Food-Facts-Antwort (kompakt; Daten unter ODbL) – schont die OFF-API.
-- barcode_rate   Bremse je Gerät und global für OFF-Aufrufe (Zeilen > 2 Tage werden automatisch gelöscht).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.barcode_map (
  code text not null check (code ~ '^([0-9]{8}|[0-9]{13})$'),
  lib text not null check (lib ~ '^[a-z0-9-]{2,40}$'),
  name text check (name is null or char_length(name) <= 120),
  amount numeric check (amount is null or (amount > 0 and amount < 100000)),
  unit text check (unit is null or unit in ('mg', 'g', 'µg', 'IE', 'ml', 'Kapsel', 'Kapseln', 'Tablette', 'Tabletten', 'Tropfen', 'Messlöffel')),
  source text not null default 'team' check (source in ('team', 'crowd')),
  created_at timestamptz not null default now(),
  primary key (code, lib)
);
comment on table public.barcode_map is 'Barcode → Bibliotheks-ID. team = gepflegt, crowd = ab 2 Geräten bestätigt. Kein Personenbezug.';

create table if not exists public.barcode_votes (
  code text not null check (code ~ '^([0-9]{8}|[0-9]{13})$'),
  voter text not null check (voter ~ '^[a-f0-9]{64}$'),
  lib text not null check (lib ~ '^[a-z0-9-]{2,40}$'),
  created_at timestamptz not null default now(),
  primary key (code, voter, lib)
);
comment on column public.barcode_votes.voter is 'SHA-256(Code + zufällige App-Geräte-ID): je Code verschieden, nicht über Codes verknüpfbar. Keine IP.';

create table if not exists public.barcode_off (
  code text primary key check (code ~ '^([0-9]{8}|[0-9]{13})$'),
  found boolean not null,
  data jsonb,
  fetched_at timestamptz not null default now()
);
comment on table public.barcode_off is 'Cache Open Food Facts (ODbL): Name, Marke, Zutaten, Kategorien, Nährstoffe pro Portion.';

create table if not exists public.barcode_rate (
  key text not null check (char_length(key) <= 80),
  win timestamptz not null,
  n int not null default 0,
  primary key (key, win)
);
create index if not exists barcode_rate_win_idx on public.barcode_rate (win);

alter table public.barcode_map   enable row level security;
alter table public.barcode_votes enable row level security;
alter table public.barcode_off   enable row level security;
alter table public.barcode_rate  enable row level security;
revoke all on public.barcode_map, public.barcode_votes, public.barcode_off, public.barcode_rate from anon, authenticated;
grant select, insert, update, delete on public.barcode_map, public.barcode_votes, public.barcode_off, public.barcode_rate to service_role;

-- Zähler +1 im Zeitfenster; true = noch erlaubt (wie social_hit)
create or replace function public.barcode_hit(p_key text, p_seconds int, p_max int)
returns boolean language plpgsql set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_seconds) * p_seconds);
  c int;
begin
  insert into barcode_rate (key, win, n) values (p_key, w, 1)
  on conflict (key, win) do update set n = barcode_rate.n + 1
  returning n into c;
  if c = 1 then delete from barcode_rate where win < now() - interval '2 days'; end if;
  return c <= p_max;
end $$;
revoke all on function public.barcode_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.barcode_hit(text, int, int) to service_role;
