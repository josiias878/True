-- ════════════════════════════════════════════════════════════════════════════
-- Kolbi Social · Phase „Wiederkommen“: tägliche Community-Zusammenfassung per Push (freiwillig, max. 1×/Tag)
-- Verknüpft ein Social-Profil mit einer Push-Adresse NUR, wenn der Nutzer „Neues aus deinen Gruppen“ einschaltet
-- (push-register mit Social-Geheimnis). Inhalt der Nachricht: nur Anzahlen, keine Namen, keine Gesundheitsdaten.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.social_push (
  profile uuid primary key references public.social_profiles(id) on delete cascade,
  sub_id uuid not null references public.lab_push_subs(id) on delete cascade,
  lang text not null default 'de' check (lang in ('de', 'en')),
  last_check timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists social_push_sub_idx on public.social_push (sub_id);
comment on table public.social_push is 'Opt-in: tägliche Community-Zusammenfassung per Push (Profil ↔ Push-Adresse). Nur Service-Role.';
alter table public.social_push enable row level security;
revoke all on public.social_push from anon, authenticated;
grant select, insert, update, delete on public.social_push to service_role;

-- Täglich (Cron): für jedes verknüpfte Profil zählen, was seit dem letzten Mal neu ist, und höchstens EINE
-- Nachricht in lab_push_queue legen (push-send verschickt sie in der nächsten Minute).
--   neue Reaktionen anderer auf eigene Posts · neue Kolbi-Umfragen (unbeantwortet) und Kolbi-Posts in eigenen Gruppen
-- Tester-Reaktionen zählen nur für Tester; gesperrte/ausgeblendete Profile zählen nicht.
create or replace function public.social_push_digest()
returns int language plpgsql security definer set search_path = public as $$
declare
  r record; n_react int; n_poll int; n_off int; body text; title text; sent int := 0; now_ts timestamptz := now();
begin
  for r in select sp.profile, sp.sub_id, sp.lang, sp.last_check, coalesce(p.tester, false) as tester
           from social_push sp join social_profiles p on p.id = sp.profile
           where not p.banned and sp.last_check < now_ts - interval '20 hours'
  loop
    select count(*) into n_react from social_reactions x
      join social_posts po on po.id = x.post
      join social_profiles rp on rp.id = x.profile
      where po.author = r.profile and x.profile <> r.profile and x.created_at > r.last_check
        and not rp.banned and not rp.hidden and (r.tester or not rp.tester);
    select count(*) into n_poll from community_polls q
      join community_members m on m.community = q.community and m.profile = r.profile
      where not q.hidden and q.publish_on <= current_date and q.publish_on > (r.last_check at time zone 'Europe/Berlin')::date
        and not exists (select 1 from community_poll_votes v where v.poll = q.id and v.profile = r.profile);
    select count(*) into n_off from official_posts o
      join community_members m on m.community = o.community and m.profile = r.profile
      where not o.hidden and o.publish_on <= current_date and o.publish_on > (r.last_check at time zone 'Europe/Berlin')::date;
    if n_react + n_poll + n_off > 0 then
      if r.lang = 'en' then
        title := 'New in your groups';
        body := concat_ws(' · ',
          case when n_poll = 1 then '1 new Kolbi poll' when n_poll > 1 then n_poll || ' new Kolbi polls' end,
          case when n_off = 1 then '1 Kolbi post' when n_off > 1 then n_off || ' Kolbi posts' end,
          case when n_react = 1 then '1 reaction to your post' when n_react > 1 then n_react || ' reactions to your posts' end);
      else
        title := 'Neu in deinen Gruppen';
        body := concat_ws(' · ',
          case when n_poll = 1 then '1 neue Kolbi-Umfrage' when n_poll > 1 then n_poll || ' neue Kolbi-Umfragen' end,
          case when n_off = 1 then '1 Kolbi-Post' when n_off > 1 then n_off || ' Kolbi-Posts' end,
          case when n_react = 1 then '1 Reaktion auf deinen Beitrag' when n_react > 1 then n_react || ' Reaktionen auf deine Beiträge' end);
      end if;
      insert into lab_push_queue (sub_id, send_at, payload)
        values (r.sub_id, now_ts, jsonb_build_object('id', 'social-digest-' || to_char(now_ts, 'YYYY-MM-DD'),
          'title', title, 'body', body, 'url', '/?tab=entdecken', 'tag', 'kolbi-community'));
      sent := sent + 1;
    end if;
    update social_push set last_check = now_ts where profile = r.profile;
  end loop;
  return sent;
end $$;
revoke all on function public.social_push_digest() from public, anon, authenticated;

-- Täglich 17:07 UTC (= 19:07 Sommerzeit / 18:07 Winterzeit in Deutschland)
select cron.schedule('lab-social-digest', '7 17 * * *', 'select public.social_push_digest()');
