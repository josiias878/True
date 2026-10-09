-- Testprofil = Einbahnstraße: tester true → false ist gesperrt (alte Test-Reaktionen/Follows/Mitgliedschaften
-- würden sonst öffentlich mitzählen). Aussteigen = Social-Konto löschen.
create or replace function public.social_tester_oneway() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.tester and not new.tester then
    raise exception 'tester_permanent';
  end if;
  return new;
end $$;

drop trigger if exists social_tester_oneway on public.social_profiles;
create trigger social_tester_oneway before update of tester on public.social_profiles
  for each row execute function public.social_tester_oneway();
