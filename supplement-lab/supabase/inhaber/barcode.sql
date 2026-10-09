-- Kolbi · Barcode-Zuordnungen pflegen (Inhaber, Supabase → SQL Editor)
-- „✓ geprüfte Zuordnung“ zeigt die App NUR für Einträge in barcode_map (source = 'manual').
-- Meldungen aus der App (barcode_votes) sind bloß Vorschläge und werden nie automatisch übernommen.
-- lib = ID aus lib/supplementLab.ts (z. B. magnesium, vitd, zink, omega3, multivitamin). Keine Peptide/Rx.
-- unit: mg · g · µg · IE · ml · Kapsel · Kapseln · Tablette · Tabletten · Tropfen · Messlöffel (oder null)

-- ── 1. Einmalig: Test-Eintrag vom 9. Okt entfernen ───────────────────────────
delete from public.barcode_map   where code = '4000000000006';
delete from public.barcode_votes where code = '4000000000006';

-- ── 2. Vorschläge ansehen: welche Codes haben klare Mehrheiten? ─────────────
-- select code, lib, count(*) as stimmen from public.barcode_votes group by code, lib order by stimmen desc limit 50;
-- Produktname dazu (falls bei Open Food Facts vorhanden):
-- select code, data->>'product_name' as name, data->>'brands' as marke from public.barcode_off where code = '<CODE>';

-- ── 3. Zuordnung bestätigen (Packung selbst geprüft!) ───────────────────────
-- insert into public.barcode_map (code, lib, name, amount, unit, source)
-- values ('<CODE>', '<LIB>', '<Produktname, max. 60 Zeichen>', <Menge pro Portion oder null>, '<Einheit oder null>', 'manual')
-- on conflict (code, lib) do update set name = excluded.name, amount = excluded.amount, unit = excluded.unit, source = 'manual';

-- ── 4. Zuordnung zurücknehmen ───────────────────────────────────────────────
-- delete from public.barcode_map where code = '<CODE>' and lib = '<LIB>';
