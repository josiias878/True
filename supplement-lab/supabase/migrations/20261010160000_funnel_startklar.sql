-- Startklar: lab_funnel um Onboarding-Schritte, 3. Check-in, Start-Check-in und Wiederkommen (Tag 2 / Tag 7) erweitern.
-- Nur neue Spalten HINTEN anhängen (create or replace view verlangt gleiche Spalten-Reihenfolge) → bestehende Abfragen bleiben gültig.
-- Rechte: create or replace behält die bisherigen Grants (nur postgres + service_role); security_invoker wird explizit gesetzt.
-- Hinweis: ab dieser App-Version zählt "besucht" (onboarding_view) einmal pro Gerät statt pro Seitenaufruf.
create or replace view public.lab_funnel with (security_invoker = true) as
select coalesce(nullif(src, ''), '(direkt)') as kanal,
       lang as sprache,
       sum(n) filter (where event = 'onboarding_view') as besucht,
       sum(n) filter (where event = any (array['onboarded', 'onboarded_pwa'])) as eingerichtet,
       sum(n) filter (where event = 'demo') as demo,
       sum(n) filter (where event = 'first_checkin') as erster_checkin,
       sum(n) filter (where event = 'checkins_7') as sieben_checkins,
       sum(n) filter (where event = 'checkins_30') as dreissig_checkins,
       sum(n) filter (where event = 'verdict') as urteile,
       sum(n) filter (where event = any (array['invite', 'share_card'])) as weitergesagt,
       sum(n) filter (where event = 'paywall_view') as pro_seite,
       sum(n) filter (where event = 'purchase') as kaeufe,
       min(day) as seit,
       -- neu (Startklar)
       sum(n) filter (where event = 'onb_0') as onb_0,
       sum(n) filter (where event = 'onb_1') as onb_1,
       sum(n) filter (where event = 'onb_2') as onb_2,
       sum(n) filter (where event = 'onb_3') as onb_3,
       sum(n) filter (where event = 'onb_4') as onb_4,
       sum(n) filter (where event = 'start_checkin') as start_checkin,
       sum(n) filter (where event = 'checkins_3') as drei_checkins,
       sum(n) filter (where event = 'app_open_d2') as wieder_tag2,
       sum(n) filter (where event = 'app_open_d7') as wieder_tag7
from public.lab_stats
group by coalesce(nullif(src, ''), '(direkt)'), lang
order by sum(n) filter (where event = 'onboarding_view') desc nulls last;

-- Sicherheitsnetz: keine Öffnung für Client-Rollen (war vorher auch nicht freigegeben)
revoke all on public.lab_funnel from anon, authenticated;
