# Supplement Lab — Weg in App Store & Google Play

Stand: Grundgerüst fertig (eigene App, Store-Modus, native Erinnerungen, Icon).
Preis-Entscheidung: **Reset-Woche gratis, dann 1,99 €/Monat oder Jahresabo**.

## ✅ Erledigt
- [x] Eigenständige App (Vite + React + Capacitor 8), teilt den Code mit `get-true.de/lab`
- [x] Store-Modus: keine Research-Peptide in der Bibliothek, neutrale Formulierungen,
      „App empfiehlt keine Substanzen oder Dosierungen“
- [x] Native lokale Benachrichtigungen (Check-in + Einnahme, mit Aktions-Buttons)
- [x] Daten nur lokal, Backup-Export/-Import
- [x] App-Icon & Splash (`assets/`) — ggf. später durch finales Branding ersetzen

## 🔜 Als Nächstes (Code)
- [ ] **Paywall & Abo** über RevenueCat (`@revenuecat/purchases-capacitor`):
      Produkte `lab_monthly_199` (1,99 €/Monat) und `lab_yearly` (z. B. 14,99 €/Jahr);
      frei nutzbar während der Reset-Woche, danach Paywall vor dem ersten Test.
      „Käufe wiederherstellen“-Button (Pflicht bei Apple).
- [ ] Datenschutzerklärung + Impressum als Seiten in der App (Pflicht-Links)
- [ ] Onboarding-Hinweis beim ersten Start: „Kein medizinischer Rat“ bestätigen
- [ ] Englische Version (größerer Markt)
- [ ] Optional: Apple Health / Health Connect (Schlafdaten automatisch)

## 🔜 Als Nächstes (du, einmalig)
- [ ] **App-Name final** festlegen (prüfen, ob im Store frei) und Bundle-ID in
      `capacitor.config.ts` final setzen (danach nicht mehr änderbar)
- [ ] App Store Connect: neue App anlegen, Abo-Gruppe + 2 Abos anlegen,
      Steuer-/Bankdaten, **Small Business Program** beantragen (15 % statt 30 %)
- [ ] Google Play Console (25 $ einmalig), Abos anlegen
- [ ] RevenueCat-Konto (kostenlos bis 2.500 $ Umsatz/Monat), Keys an mich geben
- [ ] Mit TestFlight auf dem eigenen iPhone testen

## ⚠️ Review-Risiken & wie wir sie umgehen
| Risiko | Maßnahme |
|---|---|
| Apple 1.4.1 / Google „Unapproved substances“ (Peptide) | Keine Peptide in der Bibliothek, keine Dosierungen/Bezugsquellen; Nutzer trägt eigene Substanzen neutral ein |
| Medizinische Versprechen | Nur „kann …“-Formulierungen, deutlicher Hinweis „kein medizinischer Rat“, keine Diagnosen |
| Gesundheitsdaten (DSGVO Art. 9) | Alles lokal, kein Tracking → Privacy-Label „Keine Daten erfasst“ |
| Abo ohne Mehrwert | Reset-Woche vollständig gratis nutzbar, klare Paywall-Texte, Wiederherstellen-Button |

## Preisrechnung (Deutschland)
1,99 € brutto → 1,67 € netto (19 % USt) → abzüglich 15 % Store-Gebühr ≈ **1,42 € pro Monat und Nutzer**.
