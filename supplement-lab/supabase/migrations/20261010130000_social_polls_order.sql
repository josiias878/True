-- social_polls: offene (noch nicht beantwortete) Umfragen zuerst, damit sie im Home-Feed nicht von beantworteten
-- verdrängt werden; Stimmen moderativ ausgeblendeter Profile zählen nicht (außer die eigene).
create or replace function public.social_polls(p_me uuid, p_communities text[], p_limit int)
returns table (id text, community text, publish_on date, question_de text, question_en text, options jsonb,
  counts jsonb, total int, mine text)
language sql stable set search_path = public as $$
  with v as (select coalesce((select pr.tester from social_profiles pr where pr.id = p_me), false) as t),
  ps as (
    select q.*, exists (select 1 from community_poll_votes x where x.poll = q.id and x.profile = p_me) as answered
    from community_polls q
    where q.community = any (p_communities) and not q.hidden and q.publish_on <= current_date
    order by answered, q.publish_on desc, q.id desc
    limit least(greatest(coalesce(p_limit, 3), 1), 20)
  ),
  vs as (
    select pv.poll, pv.option, count(*)::int as n
    from community_poll_votes pv join social_profiles pr on pr.id = pv.profile cross join v
    where pv.poll in (select ps.id from ps)
      and (pr.id = p_me or (not pr.banned and not pr.hidden and (v.t or not pr.tester)))
    group by pv.poll, pv.option
  )
  select ps.id, ps.community, ps.publish_on, ps.question_de, ps.question_en, ps.options,
    coalesce((select jsonb_object_agg(vs.option, vs.n) from vs where vs.poll = ps.id), '{}'::jsonb),
    coalesce((select sum(vs.n) from vs where vs.poll = ps.id), 0)::int,
    (select pv.option from community_poll_votes pv where pv.poll = ps.id and pv.profile = p_me)
  from ps
  order by ps.answered, ps.publish_on desc, ps.id desc
$$;
revoke all on function public.social_polls(uuid, text[], int) from public, anon, authenticated;
grant execute on function public.social_polls(uuid, text[], int) to service_role;
