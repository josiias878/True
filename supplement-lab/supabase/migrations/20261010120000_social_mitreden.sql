-- ════════════════════════════════════════════════════════════════════════════
-- Kolbi Social · Phase „Mitreden“ (sicher, ohne Freitext)
--   1. Erfahrungs-Bausteine: bis zu 3 feste Bausteine je Ergebnis-Post (eigene Tabelle, social_share bleibt unverändert)
--   2. Kolbi-Umfragen je Community: Frage + 2–5 feste Antworten, eine Stimme je Profil (änderbar)
-- Nur service_role (Edge Function lab-social). Keine personenbezogenen Inhalte außer Profil-ID der Stimme.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1 · Erfahrungs-Bausteine ────────────────────────────────────────────────
-- Feste Liste (gleich in lib/labSocialApi.ts POST_TAGS und supabase/functions/lab-social): keine Wirkaussagen,
-- nur Alltag/Praxis/neutrale Beobachtung.
create table if not exists public.social_post_tags (
  post uuid primary key references public.social_posts(id) on delete cascade,
  tags text[] not null check (
    cardinality(tags) between 1 and 3
    and tags <@ array['morgens','abends','zum-essen','weiter-testen','kaum-unterschied','braucht-zeit',
                      'geschmack-ok','geschmack-schlecht','preis-ok','preis-hoch','kapseln-gross','leichte-beschwerden']::text[]
  ),
  updated_at timestamptz not null default now()
);
comment on table public.social_post_tags is 'Bis zu 3 feste Erfahrungs-Bausteine je Ergebnis-Post (kein Freitext). Nur Service-Role.';

-- ── 2 · Kolbi-Umfragen ──────────────────────────────────────────────────────
create table if not exists public.community_polls (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,80}$'),
  community text not null references public.communities(id) on delete cascade,
  publish_on date not null,
  question_de text not null check (length(question_de) between 3 and 140),
  question_en text not null check (length(question_en) between 3 and 140),
  -- [{"id":"morgens","de":"Morgens","en":"Morning"}, …] 2–5 Antworten
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 5),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists community_polls_feed_idx on public.community_polls (community, publish_on desc);
comment on table public.community_polls is 'Kolbi-Umfragen je Community (nur vom Betreiber angelegt). Sichtbar ab publish_on, nicht hidden.';

create table if not exists public.community_poll_votes (
  poll text not null references public.community_polls(id) on delete cascade,
  profile uuid not null references public.social_profiles(id) on delete cascade,
  option text not null check (option ~ '^[a-z0-9-]{1,40}$'),
  created_at timestamptz not null default now(),
  primary key (poll, profile)
);
create index if not exists community_poll_votes_poll_idx on public.community_poll_votes (poll);

alter table public.social_post_tags     enable row level security;
alter table public.community_polls      enable row level security;
alter table public.community_poll_votes enable row level security;
revoke all on public.social_post_tags, public.community_polls, public.community_poll_votes from anon, authenticated;
grant select, insert, update, delete on public.social_post_tags, public.community_polls, public.community_poll_votes to service_role;

-- Umfragen mit Ergebnis aus Sicht von p_me (Stimmen von Testern/Gesperrten zählen nur für Tester bzw. gar nicht)
create or replace function public.social_polls(p_me uuid, p_communities text[], p_limit int)
returns table (id text, community text, publish_on date, question_de text, question_en text, options jsonb,
  counts jsonb, total int, mine text)
language sql stable set search_path = public as $$
  with v as (select coalesce((select pr.tester from social_profiles pr where pr.id = p_me), false) as t),
  ps as (
    select q.* from community_polls q
    where q.community = any (p_communities) and not q.hidden and q.publish_on <= current_date
    order by q.publish_on desc, q.id desc
    limit least(greatest(coalesce(p_limit, 3), 1), 20)
  ),
  vs as (
    select pv.poll, pv.option, count(*)::int as n
    from community_poll_votes pv join social_profiles pr on pr.id = pv.profile cross join v
    where pv.poll in (select ps.id from ps) and not pr.banned and (v.t or not pr.tester or pr.id = p_me)
    group by pv.poll, pv.option
  )
  select ps.id, ps.community, ps.publish_on, ps.question_de, ps.question_en, ps.options,
    coalesce((select jsonb_object_agg(vs.option, vs.n) from vs where vs.poll = ps.id), '{}'::jsonb),
    coalesce((select sum(vs.n) from vs where vs.poll = ps.id), 0)::int,
    (select pv.option from community_poll_votes pv where pv.poll = ps.id and pv.profile = p_me)
  from ps
  order by ps.publish_on desc, ps.id desc
$$;
revoke all on function public.social_polls(uuid, text[], int) from public, anon, authenticated;
grant execute on function public.social_polls(uuid, text[], int) to service_role;

-- ── Start-Umfragen: je Ziel-Gruppe 2 (eine sofort, eine ab nächster Woche), je Supplement-Lab 1 ──
insert into public.community_polls (id, community, publish_on, question_de, question_en, options) values
  ('p-schlaf-1', 'goal-schlaf', '2026-10-09', 'Wann gehst du unter der Woche meistens ins Bett?', 'When do you usually go to bed on weekdays?',
   '[{"id":"vor-22","de":"Vor 22 Uhr","en":"Before 10 pm"},{"id":"22-23","de":"22–23 Uhr","en":"10–11 pm"},{"id":"23-24","de":"23–24 Uhr","en":"11 pm–midnight"},{"id":"spaeter","de":"Später","en":"Later"}]'),
  ('p-schlaf-2', 'goal-schlaf', '2026-10-16', 'Was stört deinen Schlaf am häufigsten?', 'What disturbs your sleep most often?',
   '[{"id":"handy","de":"Handy/Bildschirm","en":"Phone/screen"},{"id":"stress","de":"Gedanken/Stress","en":"Thoughts/stress"},{"id":"laerm","de":"Lärm/Licht","en":"Noise/light"},{"id":"spaet-essen","de":"Spätes Essen","en":"Late meals"},{"id":"nichts","de":"Eigentlich nichts","en":"Nothing really"}]'),
  ('p-energie-1', 'goal-energie', '2026-10-09', 'Wann hast du dein größtes Energie-Tief?', 'When is your biggest energy dip?',
   '[{"id":"morgens","de":"Morgens","en":"Morning"},{"id":"mittag","de":"Nach dem Mittag","en":"After lunch"},{"id":"nachmittag","de":"Später Nachmittag","en":"Late afternoon"},{"id":"abends","de":"Abends","en":"Evening"}]'),
  ('p-energie-2', 'goal-energie', '2026-10-16', 'Wie viele Kaffees trinkst du am Tag?', 'How many coffees do you drink a day?',
   '[{"id":"0","de":"Keinen","en":"None"},{"id":"1","de":"1","en":"1"},{"id":"2-3","de":"2–3","en":"2–3"},{"id":"4","de":"4 oder mehr","en":"4 or more"}]'),
  ('p-fokus-1', 'goal-fokus', '2026-10-09', 'Wann kannst du dich am besten konzentrieren?', 'When can you focus best?',
   '[{"id":"frueh","de":"Früh morgens","en":"Early morning"},{"id":"vormittag","de":"Vormittags","en":"Late morning"},{"id":"nachmittag","de":"Nachmittags","en":"Afternoon"},{"id":"abends","de":"Abends","en":"Evening"}]'),
  ('p-fokus-2', 'goal-fokus', '2026-10-16', 'Was lenkt dich am meisten ab?', 'What distracts you the most?',
   '[{"id":"handy","de":"Handy","en":"Phone"},{"id":"muede","de":"Müdigkeit","en":"Tiredness"},{"id":"laerm","de":"Lärm/Menschen","en":"Noise/people"},{"id":"kopf","de":"Zu viel im Kopf","en":"Too much on my mind"}]'),
  ('p-stress-1', 'goal-stress', '2026-10-09', 'Was hilft dir am schnellsten runterzukommen?', 'What helps you wind down fastest?',
   '[{"id":"bewegung","de":"Bewegung","en":"Exercise"},{"id":"draussen","de":"Rausgehen","en":"Going outside"},{"id":"atmen","de":"Atmen/Meditation","en":"Breathing/meditation"},{"id":"menschen","de":"Mit jemandem reden","en":"Talking to someone"}]'),
  ('p-stress-2', 'goal-stress', '2026-10-16', 'Wann ist dein Tag am stressigsten?', 'When is your day most stressful?',
   '[{"id":"morgens","de":"Morgens","en":"Morning"},{"id":"mittag","de":"Mittags","en":"Midday"},{"id":"nachmittag","de":"Nachmittags","en":"Afternoon"},{"id":"abends","de":"Abends","en":"Evening"}]'),
  ('p-muskel-1', 'goal-muskel', '2026-10-09', 'Wie oft trainierst du pro Woche?', 'How often do you train per week?',
   '[{"id":"1-2","de":"1–2×","en":"1–2×"},{"id":"3-4","de":"3–4×","en":"3–4×"},{"id":"5","de":"5× oder öfter","en":"5× or more"},{"id":"pause","de":"Gerade Pause","en":"On a break"}]'),
  ('p-muskel-2', 'goal-muskel', '2026-10-16', 'Wann trainierst du meistens?', 'When do you usually train?',
   '[{"id":"morgens","de":"Morgens","en":"Morning"},{"id":"mittag","de":"Mittags","en":"Midday"},{"id":"abends","de":"Abends","en":"Evening"},{"id":"wechselnd","de":"Wechselnd","en":"It varies"}]'),
  ('p-regeneration-1', 'goal-regeneration', '2026-10-09', 'Wie viele Ruhetage machst du pro Woche?', 'How many rest days do you take per week?',
   '[{"id":"0","de":"Keinen","en":"None"},{"id":"1","de":"1","en":"1"},{"id":"2","de":"2","en":"2"},{"id":"3","de":"3 oder mehr","en":"3 or more"}]'),
  ('p-darm-1', 'goal-darm', '2026-10-09', 'Wie viele Portionen Gemüse/Obst schaffst du am Tag?', 'How many portions of fruit/veg do you manage a day?',
   '[{"id":"0-1","de":"0–1","en":"0–1"},{"id":"2-3","de":"2–3","en":"2–3"},{"id":"4","de":"4 oder mehr","en":"4 or more"}]'),
  ('p-haut-1', 'goal-haut', '2026-10-09', 'Wie viel Wasser trinkst du am Tag?', 'How much water do you drink a day?',
   '[{"id":"unter-1","de":"Unter 1 Liter","en":"Under 1 litre"},{"id":"1-2","de":"1–2 Liter","en":"1–2 litres"},{"id":"ueber-2","de":"Über 2 Liter","en":"Over 2 litres"}]'),
  ('p-longevity-1', 'goal-longevity', '2026-10-09', 'Welche Gewohnheit ziehst du gerade am längsten durch?', 'Which habit have you kept up the longest?',
   '[{"id":"bewegung","de":"Bewegung","en":"Exercise"},{"id":"schlaf","de":"Feste Schlafzeiten","en":"Regular sleep times"},{"id":"ernaehrung","de":"Ernährung","en":"Diet"},{"id":"supplements","de":"Supplements","en":"Supplements"}]'),
  ('p-immun-1', 'goal-immun', '2026-10-09', 'Wie oft bist du draußen an der frischen Luft?', 'How often do you get outside?',
   '[{"id":"taeglich","de":"Täglich","en":"Daily"},{"id":"paar","de":"Ein paar Mal pro Woche","en":"A few times a week"},{"id":"selten","de":"Selten","en":"Rarely"}]')
on conflict (id) do nothing;

-- Je Supplement-Lab eine Einnahme-Umfrage (neutral, keine Dosis)
insert into public.community_polls (id, community, publish_on, question_de, question_en, options)
select 'p-' || c.id || '-zeit', c.id, date '2026-10-09', 'Wann nimmst du es meistens?', 'When do you usually take it?',
  '[{"id":"morgens","de":"Morgens","en":"Morning"},{"id":"mittags","de":"Mittags","en":"Midday"},{"id":"abends","de":"Abends","en":"Evening"},{"id":"training","de":"Rund ums Training","en":"Around training"},{"id":"unterschiedlich","de":"Unterschiedlich","en":"It varies"}]'::jsonb
from public.communities c where c.kind = 'lab'
on conflict (id) do nothing;
