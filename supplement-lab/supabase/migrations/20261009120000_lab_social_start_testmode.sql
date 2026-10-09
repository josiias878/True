-- ════════════════════════════════════════════════════════════════════════════
-- Kolbi Social · Start-Gruppen, offizielle Kolbi-Posts, Testmodus (9. Okt 2026)
-- Nicht-destruktiv: nur neue Spalten (mit Default), neue Tabelle, NEUE Funktionen (*_v2, social_follow_stats,
-- Trigger-Funktion) und eine um eine Spalte (am Ende) erweiterte Moderations-Ansicht.
-- Bestehende Funktionen (social_feed, social_communities, …) bleiben unverändert (ältere Edge-Function-Stände).
--
-- Testmodus: Profile mit tester = true (und Posts, die in diesem Modus geteilt wurden) sieht nur, wer selbst Tester
-- ist – in Feeds, Profilen, Follower-/Mitglieder-/Reaktions-Zählern. So lässt sich Teilen/Folgen/Reagieren/Melden
-- testen, ohne den echten Feed zu verschmutzen. Wird der Testmodus ausgeschaltet, bleiben die im Testmodus geteilten
-- Posts weiter nur für Tester sichtbar (social_posts.tester, gesetzt per Trigger beim Teilen/Neu-Teilen).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Start-Gruppen (hervorgehoben, Reihenfolge 1…n; null = normal) ──────────────
alter table public.communities add column if not exists featured smallint
  check (featured is null or featured between 1 and 20);
update public.communities set featured = case id
    when 'goal-schlaf' then 1 when 'goal-energie' then 2 when 'goal-fokus' then 3
    when 'goal-stress' then 4 when 'goal-muskel' then 5 end
  where id in ('goal-schlaf', 'goal-energie', 'goal-fokus', 'goal-stress', 'goal-muskel');

-- ── Testmodus ─────────────────────────────────────────────────────────────────
alter table public.social_profiles add column if not exists tester boolean not null default false;
alter table public.social_posts add column if not exists tester boolean not null default false;
comment on column public.social_profiles.tester is 'Testmodus: Profil + Inhalte nur für andere Tester sichtbar.';
comment on column public.social_posts.tester is 'Im Testmodus geteilt → nur für Tester sichtbar (bleibt so nach Ausschalten).';

-- Beim Teilen (insert) und Neu-Teilen (social_share setzt created_at = now()) den Testmodus des Autors übernehmen.
-- Moderation (update hidden) löst den Trigger nicht aus.
create or replace function public.social_posts_tester_flag()
returns trigger language plpgsql set search_path = public as $$
begin
  new.tester := coalesce((select pr.tester from social_profiles pr where pr.id = new.author), false);
  return new;
end $$;
create or replace trigger social_posts_tester
  before insert or update of created_at on public.social_posts
  for each row execute function public.social_posts_tester_flag();

-- ── Offizielle Kolbi-Posts (Inhalt: supplement-lab/content/community/kolbi-posts.json → tools/seed-kolbi-posts.mjs) ──
create table if not exists public.official_posts (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  community text not null references public.communities(id) on delete cascade,
  publish_on date not null,
  title_de text not null check (length(title_de) between 1 and 140),
  body_de text not null check (length(body_de) between 1 and 1500),
  title_en text not null check (length(title_en) between 1 and 140),
  body_en text not null check (length(body_en) between 1 and 1500),
  icon text check (icon is null or icon ~ '^[a-z0-9-]{2,40}$'),   -- Bibliotheks-ID fürs 3D-Icon (./icons/<id>.webp)
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists official_posts_feed_idx on public.official_posts (community, publish_on desc);
comment on table public.official_posts is 'Offizielle Kolbi-Posts je Community. Sichtbar ab publish_on (UTC-Tag), nicht hidden. Nur Service-Role.';
alter table public.official_posts enable row level security;
revoke all on public.official_posts from anon, authenticated;
grant select, insert, update, delete on public.official_posts to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- Neue Funktionen für die Edge Function (nur service_role)
-- ════════════════════════════════════════════════════════════════════════════

-- Wie social_feed, zusätzlich: Testmodus-Filter (Inhalte von Testern nur für Tester), Reaktions-Zähler ohne
-- Tester-Reaktionen (für Nicht-Tester) und Spalte tester (→ „TEST“-Abzeichen).
create or replace function public.social_feed_v2(
  p_me uuid, p_mode text, p_community text, p_author uuid,
  p_before_ts timestamptz, p_before_id uuid, p_limit int)
returns table (
  id uuid, author uuid, name_idx int, avatar jsonb, lib text, days int, decision text, delta numeric,
  dims jsonb, created_at timestamptz, n_durchhalten int, n_hilfreich int, mine text[], tester boolean)
language sql stable set search_path = public as $$
  with v as (select coalesce((select pr.tester from social_profiles pr where pr.id = p_me), false) as t)
  select p.id, p.author, a.name_idx, a.avatar, p.lib, p.days, p.decision, p.delta, p.dims, p.created_at,
    (select count(*) from social_reactions r join social_profiles rp on rp.id = r.profile
      where r.post = p.id and r.kind = 'durchhalten' and (v.t or not rp.tester or rp.id = p_me))::int,
    (select count(*) from social_reactions r join social_profiles rp on rp.id = r.profile
      where r.post = p.id and r.kind = 'hilfreich' and (v.t or not rp.tester or rp.id = p_me))::int,
    coalesce((select array_agg(r.kind order by r.kind) from social_reactions r where r.post = p.id and r.profile = p_me), '{}'::text[]),
    (a.tester or p.tester)
  from social_posts p
  join social_profiles a on a.id = p.author
  cross join v
  where not p.hidden
    and (a.id = p_me or (not a.hidden and not a.banned))
    and (a.id = p_me or v.t or (not a.tester and not p.tester))
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

-- Communities mit Mitgliederzahl (ohne gesperrte; ohne Tester für Nicht-Tester), eigener Mitgliedschaft,
-- Start-Gruppen-Rang und neuestem sichtbaren offiziellen Post (für „Neuer Kolbi-Post in …“).
create or replace function public.social_communities_v2(p_me uuid)
returns table (id text, kind text, key text, name_de text, name_en text, members int, joined boolean,
  featured smallint, official_id text, official_on date)
language sql stable set search_path = public as $$
  with v as (select coalesce((select pr.tester from social_profiles pr where pr.id = p_me), false) as t)
  select c.id, c.kind, c.key, c.name_de, c.name_en,
    (select count(*) from community_members m join social_profiles p on p.id = m.profile
      where m.community = c.id and not p.banned and (v.t or not p.tester or p.id = p_me))::int,
    exists (select 1 from community_members m where m.community = c.id and m.profile = p_me),
    c.featured, o.id, o.publish_on
  from communities c
  cross join v
  left join lateral (select op.id, op.publish_on from official_posts op
                      where op.community = c.id and not op.hidden and op.publish_on <= current_date
                      order by op.publish_on desc, op.id desc limit 1) o on true
  order by c.sort, c.id
$$;

-- Follower/Gefolgt eines Profils aus Sicht von p_me (Tester zählen nur für Tester) + folge ich?
create or replace function public.social_follow_stats(p_me uuid, p_profile uuid)
returns table (followers int, following int, is_following boolean)
language sql stable set search_path = public as $$
  with v as (select coalesce((select pr.tester from social_profiles pr where pr.id = p_me), false) as t)
  select
    (select count(*) from social_follows f join social_profiles x on x.id = f.follower
      where f.followee = p_profile and (v.t or not x.tester or x.id = p_me))::int,
    (select count(*) from social_follows f join social_profiles x on x.id = f.followee
      where f.follower = p_profile and (v.t or not x.tester or x.id = p_me))::int,
    exists (select 1 from social_follows f where f.follower = p_me and f.followee = p_profile)
  from v
$$;

revoke all on function public.social_posts_tester_flag() from public, anon, authenticated;
revoke all on function public.social_feed_v2(uuid, text, text, uuid, timestamptz, uuid, int) from public, anon, authenticated;
revoke all on function public.social_communities_v2(uuid) from public, anon, authenticated;
revoke all on function public.social_follow_stats(uuid, uuid) from public, anon, authenticated;
grant execute on function public.social_feed_v2(uuid, text, text, uuid, timestamptz, uuid, int) to service_role;
grant execute on function public.social_communities_v2(uuid) to service_role;
grant execute on function public.social_follow_stats(uuid, uuid) to service_role;

-- Moderations-Ansicht: zusätzlich „test_profil“ (Meldungen aus dem Testmodus erkennen). Spalte nur angehängt.
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
  (select count(*) from social_posts q where q.author = r.target_author)::int as posts_des_profils,
  coalesce(a.tester, false) or coalesce(p.tester, false) as test_profil
from social_reports r
left join social_profiles a on a.id = r.target_author
left join social_posts p    on r.target_type = 'post' and p.id = r.target_id
where r.status = 'open'
order by offene_meldungen desc, r.created_at;
revoke all on public.moderation_queue from anon, authenticated;
grant select on public.moderation_queue to service_role;
