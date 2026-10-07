-- Kolbi Social · Schritt für den Inhaber (einmalig, ca. 1 Minute)
-- Warum: Diese zwei Funktionen enthalten „delete“ (Reaktionen beim Neu-Teilen zurücksetzen,
-- Konto-Löschung). Supabase lässt so etwas nur nach deiner Bestätigung zu.
-- So geht's: supabase.com → Projekt → SQL Editor → New query → alles hier einfügen → Run.
-- Ergebnis „Success. No rows returned“ = fertig.

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

create or replace function public.social_delete_profile(p uuid)
returns void language sql set search_path = public as $$
  delete from social_reports where reporter = p or target_author = p;
  delete from social_profiles where id = p;  -- übrige Tabellen per ON DELETE CASCADE
$$;

revoke all on function public.social_share(uuid, text, int, text, numeric, jsonb) from public, anon, authenticated;
revoke all on function public.social_delete_profile(uuid) from public, anon, authenticated;
grant execute on function public.social_share(uuid, text, int, text, numeric, jsonb) to service_role;
grant execute on function public.social_delete_profile(uuid) to service_role;
drop function if exists public.social_tmp_probe(uuid);
