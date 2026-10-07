-- ════════════════════════════════════════════════════════════════════════════
-- Kolbi Social · Stufe 2 („sicher zuerst“, PLAN.md 6. Okt 2026 / SOCIAL-SPEC §5)
-- Pseudonyme Konten ohne E-Mail, Folgen, strukturierte Ergebnis-Posts, zwei feste Reaktionen,
-- offizielle Communities (Labs + Ziele), Melden/Blockieren, Moderation durch den Inhaber.
--
-- Bewusst NICHT enthalten: Freitext von Nutzern, Bilder, Peptide/Rx, Geräte-IDs, IPs, E-Mail.
-- Einziges Freitext-Feld: social_reports.note (Notiz des Inhabers bei der Entscheidung).
-- Zugriff nur über die Edge Function lab-social (Service-Role). RLS an, keine Policies,
-- zusätzlich alle Rechte für anon/authenticated entzogen.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Prüf-Funktionen (für CHECK-Bedingungen) ───────────────────────────────────
-- Avatar: nur Auswahl aus festen Listen (lib/labSocial.ts: AVATAR_COLORS/ACCESSORIES/MOODS)
create or replace function public.social_avatar_ok(a jsonb)
returns boolean language sql immutable set search_path = public as $$
  select coalesce(
    jsonb_typeof(a) = 'object'
    and (select count(*) from jsonb_object_keys(a)) = 3
    and a->>'color' in ('kolbi','blau','violett','rosa','tuerkis','bernstein','koralle','oliv')
    and a->>'accessory' in ('none','shades','nightcap')
    and a->>'mood' in ('happy','party','think','sleepy','alert'),
  false)
$$;

-- Bereiche eines Ergebnisses: nur bekannte Bereichs-IDs (lib/supplementLab.ts: Dim), Werte -4..4.
-- „libido“ wird bewusst NIE veröffentlicht (Art. 9 DSGVO: Sexualleben) – auch nicht, wenn ein Client es schickt.
create or replace function public.social_dims_ok(d jsonb)
returns boolean language sql immutable set search_path = public as $$
  select coalesce(
    jsonb_typeof(d) = 'object'
    and (select count(*) from jsonb_object_keys(d)) <= 10
    and coalesce((
      select bool_and(
        k in ('energie','fokus','stimmung','ruhe','schlaf','koerper','verdauung','appetit','haut','gelenke')
        and case when jsonb_typeof(v) = 'number' then (v::text)::numeric between -4 and 4 else false end)
      from jsonb_each(d) as e(k, v)), true),
  false)
$$;

-- ── Profile (pseudonym) ───────────────────────────────────────────────────────
-- secret_hash = SHA-256 eines zufälligen 32-Byte-Geheimnisses, das nur auf dem Gerät liegt.
-- name_idx = Position in der festen Wortliste (16 × 16 × 100), handle = deutscher Anzeigename daraus.
create table public.social_profiles (
  id uuid primary key default gen_random_uuid(),
  secret_hash text not null unique check (secret_hash ~ '^[a-f0-9]{64}$'),
  name_idx int not null check (name_idx between 0 and 25599),
  handle text not null check (handle ~ '^[A-Za-zÄÖÜäöüß]{2,24}-[0-9]{2}$'),
  avatar jsonb not null default '{"color":"kolbi","accessory":"none","mood":"happy"}'::jsonb check (public.social_avatar_ok(avatar)),
  created_at timestamptz not null default now(),
  last_seen_on date not null default current_date,   -- nur Tag, für spätere Löschung inaktiver Konten
  hidden boolean not null default false,              -- vom Inhaber ausgeblendet
  banned boolean not null default false               -- vom Inhaber gesperrt (darf nur noch löschen)
);
create index social_profiles_created_idx on public.social_profiles (created_at);
comment on table public.social_profiles is 'Kolbi Social: pseudonyme Profile (kein Freitext, keine E-Mail, keine Geräte-ID). Nur Service-Role.';

-- ── Folgen ────────────────────────────────────────────────────────────────────
create table public.social_follows (
  follower uuid not null references public.social_profiles(id) on delete cascade,
  followee uuid not null references public.social_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
create index social_follows_followee_idx on public.social_follows (followee);

-- ── Ergebnis-Posts (strukturiert, kein Freitext) ──────────────────────────────
create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  author uuid not null references public.social_profiles(id) on delete cascade,
  kind text not null default 'result' check (kind = 'result'),
  lib text not null check (lib ~ '^[a-z0-9-]{2,40}$'
    and lib not in ('bpc157','tb500','ghkcu','cjc-ipa','semax','selank','motsc','epitalon','ta1','kpv','glp1')),
  days int not null check (days between 1 and 120),
  decision text not null check (decision in ('keep','maybe','drop')),
  delta numeric(4,2) not null check (delta between -4 and 4),
  dims jsonb not null default '{}'::jsonb check (public.social_dims_ok(dims)),
  created_at timestamptz not null default now(),
  hidden boolean not null default false,
  unique (author, lib)                                  -- je Supplement ein Ergebnis pro Profil (neues aktualisiert
                                                        -- das alte an Ort und Stelle, gleiche ID – siehe social_share)
);
create index social_posts_feed_idx on public.social_posts (created_at desc, id desc);
create index social_posts_author_idx on public.social_posts (author, created_at desc);
create index social_posts_lib_idx on public.social_posts (lib, created_at desc);

-- ── Reaktionen (nur zwei feste) ───────────────────────────────────────────────
create table public.social_reactions (
  post uuid not null references public.social_posts(id) on delete cascade,
  profile uuid not null references public.social_profiles(id) on delete cascade,
  kind text not null check (kind in ('durchhalten','hilfreich')),
  created_at timestamptz not null default now(),
  primary key (post, profile, kind)
);
create index social_reactions_profile_idx on public.social_reactions (profile);

-- ── Offizielle Communities (nur vordefiniert, Seed unten) ─────────────────────
create table public.communities (
  id text primary key check (id ~ '^(lab|goal)-[a-z0-9-]{2,40}$'),
  kind text not null check (kind in ('lab','goal')),
  key text not null check (key ~ '^[a-z0-9-]{2,40}$'),
  name_de text not null,
  name_en text not null,
  libs text[] not null default '{}',                   -- Lab: [key] · Ziel: passende Bibliotheks-IDs (ohne Peptide/Rx)
  sort int not null default 0,
  unique (kind, key)
);

create table public.community_members (
  community text not null references public.communities(id) on delete cascade,
  profile uuid not null references public.social_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (community, profile)
);
create index community_members_profile_idx on public.community_members (profile);

-- ── Meldungen (sieht nur der Betreiber) ───────────────────────────────────────
create table public.social_reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references public.social_profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','profile')),
  target_id uuid not null,
  -- Autor des Ziels zum Zeitpunkt der Meldung (bei 'profile' = target_id). Damit trifft eine Sperre den Autor
  -- auch dann, wenn das Ziel inzwischen weg ist, und „Konto löschen“ entfernt alle Meldungen über mich.
  target_author uuid not null references public.social_profiles(id) on delete cascade,
  reason text not null check (reason in ('spam','beleidigung','gesundheitsversprechen','sonstiges')),
  status text not null default 'open' check (status in ('open','kept','hidden','banned')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  note text check (note is null or length(note) <= 500), -- nur Notiz des Inhabers
  unique (reporter, target_type, target_id)
);
create index social_reports_open_idx on public.social_reports (status, created_at);
create index social_reports_target_idx on public.social_reports (target_type, target_id);
create index social_reports_reporter_idx on public.social_reports (reporter, created_at);
create index social_reports_author_idx on public.social_reports (target_author, decided_at desc);

-- ── Blockierungen (sieht niemand sonst) ───────────────────────────────────────
create table public.social_blocks (
  blocker uuid not null references public.social_profiles(id) on delete cascade,
  blocked uuid not null references public.social_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index social_blocks_blocked_idx on public.social_blocks (blocked);

-- ── Bremse: Aktionen je Profil und Zeitfenster (Zeilen > 2 Tage löscht social_hit, alle Profile) ──
create table public.social_rate (
  profile uuid not null references public.social_profiles(id) on delete cascade,
  bucket text not null check (bucket ~ '^[a-z]{1,12}$'),
  win timestamptz not null,
  n int not null default 0,
  primary key (profile, bucket, win)
);
create index social_rate_win_idx on public.social_rate (win);

-- ── RLS an, keine Policies; Rechte für anon/authenticated komplett entzogen ───
alter table public.social_profiles   enable row level security;
alter table public.social_follows    enable row level security;
alter table public.social_posts      enable row level security;
alter table public.social_reactions  enable row level security;
alter table public.communities       enable row level security;
alter table public.community_members enable row level security;
alter table public.social_reports    enable row level security;
alter table public.social_blocks     enable row level security;
alter table public.social_rate       enable row level security;
revoke all on public.social_profiles, public.social_follows, public.social_posts, public.social_reactions,
  public.communities, public.community_members, public.social_reports, public.social_blocks, public.social_rate
  from anon, authenticated;
grant select, insert, update, delete on public.social_profiles, public.social_follows, public.social_posts,
  public.social_reactions, public.communities, public.community_members, public.social_reports, public.social_blocks,
  public.social_rate to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- Funktionen für die Edge Function (nur service_role)
-- ════════════════════════════════════════════════════════════════════════════

-- Zähler +1 im Zeitfenster; true = noch erlaubt
create or replace function public.social_hit(p_profile uuid, p_bucket text, p_seconds int, p_max int)
returns boolean language plpgsql set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_seconds) * p_seconds);
  c int;
begin
  insert into social_rate (profile, bucket, win, n) values (p_profile, p_bucket, w, 1)
  on conflict (profile, bucket, win) do update set n = social_rate.n + 1
  returning n into c;
  -- neues Zeitfenster → alte Zeilen ALLER Profile aufräumen (über Index auf win, meist 0 Zeilen)
  if c = 1 then delete from social_rate where win < now() - interval '2 days'; end if;
  return c <= p_max;
end $$;

-- Sichtbare Posts (chronologisch, Keyset-Blättern). Nie: ausgeblendete Posts, ausgeblendete/gesperrte
-- Autoren (außer man selbst), Blockierte in beide Richtungen. Kein Ranking nach Verhalten.
-- p_mode: 'following' (eigene + gefolgte) · 'discover' (alle anderen) · 'community' (p_community) · 'profile' (p_author)
create or replace function public.social_feed(
  p_me uuid, p_mode text, p_community text, p_author uuid,
  p_before_ts timestamptz, p_before_id uuid, p_limit int)
returns table (
  id uuid, author uuid, name_idx int, avatar jsonb, lib text, days int, decision text, delta numeric,
  dims jsonb, created_at timestamptz, n_durchhalten int, n_hilfreich int, mine text[])
language sql stable set search_path = public as $$
  select p.id, p.author, a.name_idx, a.avatar, p.lib, p.days, p.decision, p.delta, p.dims, p.created_at,
    (select count(*) from social_reactions r where r.post = p.id and r.kind = 'durchhalten')::int,
    (select count(*) from social_reactions r where r.post = p.id and r.kind = 'hilfreich')::int,
    coalesce((select array_agg(r.kind order by r.kind) from social_reactions r where r.post = p.id and r.profile = p_me), '{}'::text[])
  from social_posts p
  join social_profiles a on a.id = p.author
  where not p.hidden
    and (a.id = p_me or (not a.hidden and not a.banned))
    and not exists (select 1 from social_blocks b
                    where (b.blocker = p_me and b.blocked = p.author) or (b.blocker = p.author and b.blocked = p_me))
    and case p_mode
          when 'following' then p.author = p_me
                             or exists (select 1 from social_follows f where f.follower = p_me and f.followee = p.author)
          when 'discover'  then p.author <> p_me
          when 'community' then p.lib = any (coalesce((select c.libs from communities c where c.id = p_community), '{}'::text[]))
          when 'profile'   then p.author = p_author
          else false
        end
    and (p_before_ts is null or (p.created_at, p.id) < (p_before_ts, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by p.created_at desc, p.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

-- Offizielle Communities mit Mitgliederzahl (ohne gesperrte Profile) und eigener Mitgliedschaft
create or replace function public.social_communities(p_me uuid)
returns table (id text, kind text, key text, name_de text, name_en text, members int, joined boolean)
language sql stable set search_path = public as $$
  select c.id, c.kind, c.key, c.name_de, c.name_en,
    (select count(*) from community_members m join social_profiles p on p.id = m.profile
      where m.community = c.id and not p.banned)::int,
    exists (select 1 from community_members m where m.community = c.id and m.profile = p_me)
  from communities c
  order by c.sort, c.id
$$;

-- Ergebnis teilen: je (Autor, Supplement) genau ein Post. Erneutes Teilen aktualisiert den Post AN ORT UND STELLE
-- (gleiche ID → Meldungen und Entscheidungen bleiben daran hängen), setzt created_at = now() und löscht Reaktionen.
-- Rückgabe: 'ok' · 'hidden' (vom Inhaber ausgeblendet) · 'pending' (offene Meldungen – erst nach Entscheidung)
--           · 'busy' (gleichzeitiges Erst-Teilen, sehr selten)
create or replace function public.social_share(
  p_me uuid, p_lib text, p_days int, p_decision text, p_delta numeric, p_dims jsonb)
returns text language plpgsql set search_path = public as $$
declare v_id uuid; v_hidden boolean;
begin
  select id, hidden into v_id, v_hidden from social_posts where author = p_me and lib = p_lib for update;
  if found then
    if v_hidden then return 'hidden'; end if;
    if exists (select 1 from social_reports where target_type = 'post' and target_id = v_id and status = 'open') then
      return 'pending';
    end if;
    update social_posts set days = p_days, decision = p_decision, delta = p_delta, dims = p_dims, created_at = now()
     where id = v_id;
    delete from social_reactions where post = v_id;
    return 'ok';
  end if;
  insert into social_posts (author, lib, days, decision, delta, dims)
  values (p_me, p_lib, p_days, p_decision, p_delta, p_dims)
  on conflict (author, lib) do nothing;
  return case when found then 'ok' else 'busy' end;
end $$;

-- Entscheidungen des Inhabers, die MICH betreffen (DSA Art. 17: Begründung an Betroffene), neueste zuerst.
-- Eine Zeile je Ziel und Entscheidung (mehrere Meldungen zum selben Ziel → eine Entscheidung). Nie: wer gemeldet hat.
create or replace function public.social_decisions(p_me uuid)
returns table (target text, action text, lib text, note text, at timestamptz)
language sql stable set search_path = public as $$
  select d.target_type, d.status, p.lib, coalesce(d.note, ''), d.decided_at
  from (select distinct on (r.target_type, r.target_id, r.status, r.decided_at)
               r.target_type, r.target_id, r.status, r.note, r.decided_at
          from social_reports r
         where r.target_author = p_me and r.status in ('hidden', 'banned') and r.decided_at is not null
         order by r.target_type, r.target_id, r.status, r.decided_at, r.id) d
  left join social_posts p on d.target_type = 'post' and p.id = d.target_id
  order by d.decided_at desc
  limit 10
$$;

-- Konto löschen: ALLES des Profils (Posts, Reaktionen, Folgen, Mitgliedschaften, Blockierungen,
-- eigene Meldungen) und alle Meldungen über das Profil oder seine Posts (target_author).
create or replace function public.social_delete_profile(p uuid)
returns void language sql set search_path = public as $$
  delete from social_reports where reporter = p or target_author = p;
  delete from social_profiles where id = p;  -- übrige Tabellen per ON DELETE CASCADE
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Moderation für den Inhaber (Dashboard über service_role). Kein automatisches Ausblenden –
-- nur der Inhaber entscheidet über moderate().
-- ════════════════════════════════════════════════════════════════════════════
create or replace view public.moderation_queue with (security_invoker = true) as
select
  r.id                as report_id,
  r.created_at        as gemeldet_am,
  r.reason            as grund,
  r.target_type       as ziel_typ,
  r.target_id         as ziel_id,
  (select count(*) from social_reports x
    where x.target_type = r.target_type and x.target_id = r.target_id and x.status = 'open')::int as offene_meldungen,
  (select count(*) from social_reports x
    where x.target_type = r.target_type and x.target_id = r.target_id)::int                       as meldungen_gesamt,
  a.handle            as profil,
  r.target_author     as profil_id,
  a.banned            as profil_gesperrt,
  a.hidden            as profil_ausgeblendet,
  a.avatar,
  p.lib, p.days as tage, p.decision as urteil, p.delta, p.dims, p.created_at as post_vom, p.hidden as post_ausgeblendet,
  (select count(*) from social_posts q where q.author = r.target_author)::int as posts_des_profils
from social_reports r
left join social_profiles a on a.id = r.target_author
left join social_posts p    on r.target_type = 'post' and p.id = r.target_id
where r.status = 'open'
order by offene_meldungen desc, r.created_at;
comment on view public.moderation_queue is 'Offene Meldungen mit Ziel-Inhalt. Entscheidung über moderate(report_id, kept|hidden|banned, note) – bei hidden/banned ist note (Begründung, sieht der Betroffene) Pflicht.';

-- Entscheidung gilt für ALLE offenen Meldungen zum selben Ziel. Rückgabe: Anzahl erledigter Meldungen.
--   kept   → Inhalt bleibt
--   hidden → Post bzw. Profil (inkl. seiner Posts) wird ausgeblendet
--   banned → Autor (target_author, auch wenn das Ziel weg ist) gesperrt + ausgeblendet; gemeldeter Post ausgeblendet
-- hidden/banned brauchen eine Begründung (p_note): der Betroffene sieht sie in der App (DSA Art. 17).
-- Rückgängig (manuell): update social_posts/social_profiles set hidden=false, banned=false where id = …
create or replace function public.moderate(p_report bigint, p_action text, p_note text default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  r social_reports%rowtype;
  n int;
begin
  if p_action not in ('kept','hidden','banned') then raise exception 'action must be kept|hidden|banned'; end if;
  if p_action <> 'kept' and nullif(trim(coalesce(p_note, '')), '') is null then
    raise exception 'note (Begründung für den Betroffenen) ist bei % Pflicht', p_action;
  end if;
  select * into r from social_reports where id = p_report;
  if not found then raise exception 'report % not found', p_report; end if;
  if p_action = 'hidden' then
    if r.target_type = 'post' then update social_posts set hidden = true where id = r.target_id;
    else update social_profiles set hidden = true where id = r.target_id; end if;
  elsif p_action = 'banned' then
    update social_profiles set banned = true, hidden = true where id = r.target_author;
    if r.target_type = 'post' then update social_posts set hidden = true where id = r.target_id; end if;
  end if;
  update social_reports
     set status = p_action, decided_at = now(), note = left(nullif(trim(p_note), ''), 500)
   where target_type = r.target_type and target_id = r.target_id and status = 'open';
  get diagnostics n = row_count;
  return n;
end $$;

-- Optional, NICHT eingeplant (kein pg_cron): Profile ohne Besuch seit p_months Monaten (mind. 3) vollständig löschen
-- (Speicherbegrenzung, Art. 5 Abs. 1 e DSGVO). Manuell im SQL-Editor: select public.social_cleanup_inactive(12);
-- Rückgabe: Anzahl gelöschter Profile. Vor einer Einplanung Frist in der Datenschutzerklärung nennen.
create or replace function public.social_cleanup_inactive(p_months int default 12)
returns int language plpgsql set search_path = public as $$
declare v uuid; n int := 0;
begin
  for v in select id from social_profiles where last_seen_on < current_date - make_interval(months => greatest(p_months, 3)) loop
    perform social_delete_profile(v); n := n + 1;
  end loop;
  return n;
end $$;
comment on function public.social_cleanup_inactive(int) is
  'Nicht eingeplant. Manuell: select social_cleanup_inactive(12); löscht Profile ohne Besuch seit 12 Monaten (min. 3) samt allem.';

-- Funktionen: nur service_role (CHECK-Funktionen ebenfalls: Supabase gibt neuen Funktionen sonst EXECUTE für anon)
revoke all on function public.social_avatar_ok(jsonb) from public, anon, authenticated;
revoke all on function public.social_dims_ok(jsonb) from public, anon, authenticated;
revoke all on function public.social_share(uuid, text, int, text, numeric, jsonb) from public, anon, authenticated;
revoke all on function public.social_decisions(uuid) from public, anon, authenticated;
grant execute on function public.social_avatar_ok(jsonb) to service_role;
grant execute on function public.social_dims_ok(jsonb) to service_role;
grant execute on function public.social_share(uuid, text, int, text, numeric, jsonb) to service_role;
grant execute on function public.social_decisions(uuid) to service_role;
revoke all on sequence public.social_reports_id_seq from anon, authenticated;
grant usage, select on sequence public.social_reports_id_seq to service_role;
revoke all on function public.social_hit(uuid, text, int, int) from public, anon, authenticated;
revoke all on function public.social_feed(uuid, text, text, uuid, timestamptz, uuid, int) from public, anon, authenticated;
revoke all on function public.social_delete_profile(uuid) from public, anon, authenticated;
revoke all on function public.social_communities(uuid) from public, anon, authenticated;
revoke all on function public.moderate(bigint, text, text) from public, anon, authenticated;
revoke all on function public.social_cleanup_inactive(int) from public, anon, authenticated;
grant execute on function public.social_hit(uuid, text, int, int) to service_role;
grant execute on function public.social_feed(uuid, text, text, uuid, timestamptz, uuid, int) to service_role;
grant execute on function public.social_delete_profile(uuid) to service_role;
grant execute on function public.social_communities(uuid) to service_role;
grant execute on function public.moderate(bigint, text, text) to service_role;
grant execute on function public.social_cleanup_inactive(int) to service_role;
revoke all on public.moderation_queue from anon, authenticated;
grant select on public.moderation_queue to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- Seed: Labs = alle Bibliothekseinträge ohne Peptide/Rx (Stand lib/supplementLab.ts, 7. Okt 2026),
-- Ziele = GOALS mit passenden Bibliotheks-IDs (ohne Peptide/Rx). Wiederholbar.
-- ════════════════════════════════════════════════════════════════════════════
insert into public.communities (id, kind, key, name_de, name_en, libs, sort) values
  ('lab-magnesium', 'lab', 'magnesium', 'Magnesium (Glycinat)', 'Magnesium (glycinate)', array['magnesium'], 1),
  ('lab-glycin', 'lab', 'glycin', 'Glycin', 'Glycine', array['glycin'], 2),
  ('lab-melatonin', 'lab', 'melatonin', 'Melatonin', 'Melatonin', array['melatonin'], 3),
  ('lab-theanin', 'lab', 'theanin', 'L-Theanin', 'L-Theanine', array['theanin'], 4),
  ('lab-koffein', 'lab', 'koffein', 'Koffein / Kaffee', 'Caffeine / coffee', array['koffein'], 5),
  ('lab-rhodiola', 'lab', 'rhodiola', 'Rhodiola Rosea', 'Rhodiola Rosea', array['rhodiola'], 6),
  ('lab-ashwagandha', 'lab', 'ashwagandha', 'Ashwagandha', 'Ashwagandha', array['ashwagandha'], 7),
  ('lab-vitd', 'lab', 'vitd', 'Vitamin D3 + K2', 'Vitamin D3 + K2', array['vitd'], 8),
  ('lab-omega3', 'lab', 'omega3', 'Omega-3 (EPA/DHA)', 'Omega-3 (EPA/DHA)', array['omega3'], 9),
  ('lab-zink', 'lab', 'zink', 'Zink', 'Zinc', array['zink'], 10),
  ('lab-eisen', 'lab', 'eisen', 'Eisen', 'Iron', array['eisen'], 11),
  ('lab-b12', 'lab', 'b12', 'Vitamin B12', 'Vitamin B12', array['b12'], 12),
  ('lab-bkomplex', 'lab', 'bkomplex', 'B-Komplex', 'B complex', array['bkomplex'], 13),
  ('lab-vitc', 'lab', 'vitc', 'Vitamin C', 'Vitamin C', array['vitc'], 14),
  ('lab-probiotika', 'lab', 'probiotika', 'Probiotika', 'Probiotics', array['probiotika'], 15),
  ('lab-kreatin', 'lab', 'kreatin', 'Kreatin', 'Creatine', array['kreatin'], 16),
  ('lab-citrullin', 'lab', 'citrullin', 'L-Citrullin', 'L-Citrulline', array['citrullin'], 17),
  ('lab-betaalanin', 'lab', 'betaalanin', 'Beta-Alanin', 'Beta-alanine', array['betaalanin'], 18),
  ('lab-elektrolyte', 'lab', 'elektrolyte', 'Elektrolyte', 'Electrolytes', array['elektrolyte'], 19),
  ('lab-kollagen', 'lab', 'kollagen', 'Kollagen', 'Collagen', array['kollagen'], 20),
  ('lab-q10', 'lab', 'q10', 'Coenzym Q10', 'Coenzyme Q10', array['q10'], 21),
  ('lab-lionsmane', 'lab', 'lionsmane', 'Lion''s Mane', 'Lion''s Mane', array['lionsmane'], 22),
  ('lab-curcumin', 'lab', 'curcumin', 'Curcumin', 'Curcumin', array['curcumin'], 23),
  ('lab-calcium', 'lab', 'calcium', 'Calcium', 'Calcium', array['calcium'], 24),
  ('lab-gaba', 'lab', 'gaba', 'GABA', 'GABA', array['gaba'], 25),
  ('lab-apigenin', 'lab', 'apigenin', 'Apigenin', 'Apigenin', array['apigenin'], 26),
  ('lab-baldrian', 'lab', 'baldrian', 'Baldrian', 'Valerian', array['baldrian'], 27),
  ('lab-lavendel', 'lab', 'lavendel', 'Lavendelöl-Kapseln', 'Lavender oil capsules', array['lavendel'], 28),
  ('lab-taurin', 'lab', 'taurin', 'Taurin', 'Taurine', array['taurin'], 29),
  ('lab-inositol', 'lab', 'inositol', 'Inositol (Myo)', 'Inositol (Myo)', array['inositol'], 30),
  ('lab-tyrosin', 'lab', 'tyrosin', 'L-Tyrosin', 'L-Tyrosine', array['tyrosin'], 31),
  ('lab-citicolin', 'lab', 'citicolin', 'Citicolin', 'Citicoline', array['citicolin'], 32),
  ('lab-alphagpc', 'lab', 'alphagpc', 'Alpha-GPC', 'Alpha-GPC', array['alphagpc'], 33),
  ('lab-bacopa', 'lab', 'bacopa', 'Bacopa monnieri', 'Bacopa monnieri', array['bacopa'], 34),
  ('lab-ginkgo', 'lab', 'ginkgo', 'Ginkgo biloba', 'Ginkgo biloba', array['ginkgo'], 35),
  ('lab-cordyceps', 'lab', 'cordyceps', 'Cordyceps', 'Cordyceps', array['cordyceps'], 36),
  ('lab-alcar', 'lab', 'alcar', 'Acetyl-L-Carnitin', 'Acetyl-L-carnitine', array['alcar'], 37),
  ('lab-nac', 'lab', 'nac', 'NAC', 'NAC', array['nac'], 38),
  ('lab-nmn', 'lab', 'nmn', 'NMN / NR', 'NMN / NR', array['nmn'], 39),
  ('lab-safran', 'lab', 'safran', 'Safran-Extrakt', 'Saffron extract', array['safran'], 40),
  ('lab-reishi', 'lab', 'reishi', 'Reishi', 'Reishi', array['reishi'], 41),
  ('lab-tongkat', 'lab', 'tongkat', 'Tongkat Ali', 'Tongkat Ali', array['tongkat'], 42),
  ('lab-maca', 'lab', 'maca', 'Maca', 'Maca', array['maca'], 43),
  ('lab-shilajit', 'lab', 'shilajit', 'Shilajit', 'Shilajit', array['shilajit'], 44),
  ('lab-kupfer', 'lab', 'kupfer', 'Kupfer', 'Copper', array['kupfer'], 45),
  ('lab-multivitamin', 'lab', 'multivitamin', 'Multivitamin', 'Multivitamin', array['multivitamin'], 46),
  ('lab-selen', 'lab', 'selen', 'Selen', 'Selenium', array['selen'], 47),
  ('lab-jod', 'lab', 'jod', 'Jod', 'Iodine', array['jod'], 48),
  ('lab-folat', 'lab', 'folat', 'Folat (5-MTHF)', 'Folate (5-MTHF)', array['folat'], 49),
  ('lab-biotin', 'lab', 'biotin', 'Biotin', 'Biotin', array['biotin'], 50),
  ('lab-whey', 'lab', 'whey', 'Whey Protein', 'Whey Protein', array['whey'], 51),
  ('lab-eaa', 'lab', 'eaa', 'EAA / BCAA', 'EAA / BCAA', array['eaa'], 52),
  ('lab-hmb', 'lab', 'hmb', 'HMB', 'HMB', array['hmb'], 53),
  ('lab-glutamin', 'lab', 'glutamin', 'L-Glutamin', 'L-Glutamine', array['glutamin'], 54),
  ('lab-betain', 'lab', 'betain', 'Betain (TMG)', 'Betaine (TMG)', array['betain'], 55),
  ('lab-flohsamen', 'lab', 'flohsamen', 'Flohsamenschalen', 'Psyllium husk', array['flohsamen'], 56),
  ('lab-berberin', 'lab', 'berberin', 'Berberin', 'Berberine', array['berberin'], 57),
  ('lab-quercetin', 'lab', 'quercetin', 'Quercetin', 'Quercetin', array['quercetin'], 58),
  ('lab-ingwer', 'lab', 'ingwer', 'Ingwer', 'Ginger', array['ingwer'], 59),
  ('lab-astaxanthin', 'lab', 'astaxanthin', 'Astaxanthin', 'Astaxanthin', array['astaxanthin'], 60),
  ('lab-hyaluron', 'lab', 'hyaluron', 'Hyaluronsäure', 'Hyaluronic acid', array['hyaluron'], 61),
  ('goal-schlaf', 'goal', 'schlaf', 'Schlaf', 'Sleep', array['magnesium', 'glycin', 'theanin', 'apigenin', 'melatonin', 'ashwagandha', 'gaba', 'baldrian', 'taurin']::text[], 62),
  ('goal-energie', 'goal', 'energie', 'Energie', 'Energy', array['b12', 'bkomplex', 'rhodiola', 'koffein', 'q10', 'eisen', 'elektrolyte', 'cordyceps', 'alcar']::text[], 63),
  ('goal-fokus', 'goal', 'fokus', 'Fokus & Kopf', 'Focus & mind', array['theanin', 'koffein', 'tyrosin', 'citicolin', 'lionsmane', 'bacopa', 'alphagpc', 'kreatin', 'omega3']::text[], 64),
  ('goal-stress', 'goal', 'stress', 'Stress & Ruhe', 'Stress & calm', array['ashwagandha', 'magnesium', 'theanin', 'rhodiola', 'lavendel', 'safran', 'inositol', 'reishi']::text[], 65),
  ('goal-muskel', 'goal', 'muskel', 'Muskeln & Kraft', 'Muscle & strength', array['kreatin', 'whey', 'citrullin', 'betaalanin', 'eaa', 'hmb', 'betain', 'vitd', 'zink', 'elektrolyte']::text[], 66),
  ('goal-regeneration', 'goal', 'regeneration', 'Regeneration', 'Recovery', array['kollagen', 'omega3', 'curcumin', 'magnesium', 'glutamin', 'astaxanthin', 'ingwer']::text[], 67),
  ('goal-darm', 'goal', 'darm', 'Darm & Verdauung', 'Gut & digestion', array['probiotika', 'flohsamen', 'ingwer', 'glutamin', 'curcumin', 'magnesium']::text[], 69),
  ('goal-haut', 'goal', 'haut', 'Haut & Haare', 'Skin & hair', array['kollagen', 'zink', 'omega3', 'vitc', 'biotin', 'hyaluron', 'astaxanthin']::text[], 70),
  ('goal-longevity', 'goal', 'longevity', 'Longevity', 'Longevity', array['omega3', 'vitd', 'q10', 'nmn', 'nac', 'astaxanthin', 'kreatin']::text[], 71),
  ('goal-immun', 'goal', 'immun', 'Immunsystem', 'Immune system', array['vitd', 'zink', 'vitc', 'selen', 'quercetin', 'nac', 'probiotika']::text[], 72)
on conflict (id) do update set name_de = excluded.name_de, name_en = excluded.name_en, libs = excluded.libs, sort = excluded.sort;
