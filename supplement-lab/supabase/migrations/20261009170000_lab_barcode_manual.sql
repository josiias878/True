-- ════════════════════════════════════════════════════════════════════════════
-- Kolbi · Barcode: bestätigte Zuordnungen nur noch vom Betreiber (9. Okt 2026, QA-Befund)
-- Crowd-Meldungen (barcode_votes) werden NIE automatisch zu barcode_map. „✓ geprüft“ = source 'manual'.
-- Nicht-destruktiv: nur Default + Check-Constraint (NOT VALID → ein alter Test-Eintrag 'crowd' bleibt stehen,
-- wird von lab-barcode ignoriert und mit supabase/inhaber/barcode.sql entfernt).
-- ════════════════════════════════════════════════════════════════════════════
alter table public.barcode_map alter column source set default 'manual';
alter table public.barcode_map drop constraint if exists barcode_map_source_check;
alter table public.barcode_map add constraint barcode_map_source_check check (source in ('manual')) not valid;
comment on table public.barcode_map is 'Barcode → Bibliotheks-ID, nur vom Betreiber gepflegt (source = manual). Crowd-Meldungen bleiben in barcode_votes und werden nie automatisch übernommen. Kein Personenbezug.';
