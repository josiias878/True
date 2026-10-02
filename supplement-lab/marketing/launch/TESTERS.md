# Google-Pflicht: 12 Tester × 14 Tage – ohne Freunde und Familie

Stand: 2. Okt 2026 · Ziel: **Produktionszugriff bei Google rechtzeitig für den Store-Start am Di 1. Dez 2026.**
Nichts hiervon wird gepostet, bevor der CEO es freigibt. Konten legt nur der Inhaber an.

## 1 · Was Google verlangt (und was nicht geht)

- Neue **private** Entwicklerkonten (angelegt nach dem 13. Nov 2023) dürfen erst in die Produktion, wenn ein
  **geschlossener Test mit mindestens 12 Testern** lief, die **14 Tage am Stück** angemeldet (opted-in) waren.
  Fällt die Zahl zwischendurch unter 12, beginnt die Zählung neu.
- Danach: **Produktionszugriff beantragen** (Play Console → Dashboard). Google stellt rund 10 Fragen: wie die Tester
  gefunden wurden, wie leicht das war, wie viel sie genutzt und rückgemeldet haben, wie wir Feedback gesammelt haben,
  was wir geändert haben, wer die Zielgruppe ist und warum die App fertig ist. Prüfung **bis zu ca. 7 Tage**.
- Google sieht **Nutzung** (aktive Geräte, Sitzungen, Abstürze) – nicht nur die Anmeldung. Tester, die sich nur
  eintragen und die App nie öffnen, zählen praktisch nicht. Allgemeines Lob („alles super“) reicht als Antwort nicht.

**Tabu** (Konto-Sperre möglich, und es passt nicht zu Kolbi):
gekaufte Tester · „garantierte 12 Tester“-Pakete · Bots/Emulatoren · mehrere eigene Konten · Tester bitten, die App
nur zu öffnen, um Zahlen zu schönen · Gegenleistung gegen Bewertungen. **Budget: 0 €** – wir nutzen keine
kostenpflichtigen Tester-Dienste.

## 2 · Woher die Tester kommen – vier ehrliche Wege

Wir brauchen **20+ angemeldete Tester** (Puffer, weil einige abspringen), davon möglichst viele echte Zielgruppe.

| # | Weg | Vorteile | Nachteile / Risiken | Bewertung |
|---|---|---|---|---|
| A | **Eigene Beta-Nutzer aus dem Netz** (Leute, die die Web-App über Reddit/Rechner/Ratgeber gefunden haben und ein Android-Handy nutzen): Hinweis auf der Landingpage + kleine Karte in der Web-App „Android-Tester gesucht“ | echte Zielgruppe, echtes Feedback, beste Antworten für Googles Fragebogen | Zahl unbekannt (Statistik kennt keine Plattform); braucht UI-Arbeit + Freigabe; Tester geben dafür ihre Google-E-Mail (über die Google-Gruppe) | **zuerst** – wenig Aufwand, höchste Qualität |
| B | **Tester-Tausch auf Reddit**: r/AndroidClosedTesting, r/TestersCommunity (beide gibt es für genau diese Pflicht) | schnell, kostenlos, die Leute kennen den Ablauf, bleiben meist 14 Tage | Tester sind Entwickler, keine Supplement-Nutzer → dünnes Feedback; **wir müssen zurücktesten** (Zeit, s. Abschnitt 4); Reddit-Konto nötig, manche Subs verlangen Mindest-Karma; **Klären:** aktuelle Regeln der Subs vor dem Posten lesen | **Hauptquelle für die Menge** |
| C | **Tester-Tausch-Apps** (Apps im Play Store, in denen man Punkte durch Testen fremder Apps sammelt, z. B. „TheClosedTest“, „12 Testers – Tester Community“) | strukturiert, zählt die 14 Tage mit | fremde App bekommt Zugriff auf Google-Konto/Gerät-Infos; Qualität schwankt; manche bieten **bezahlte** Pakete → nur den kostenlosen Tausch nutzen; Bedingungen ändern sich | **nur als Reserve**, nach CEO-Freigabe; **Klären:** Datenschutz/Bedingungen der jeweiligen App vorher lesen |
| D | **Zielgruppen-Communities** (aus `channels/PLAYBOOK.md`: r/QuantifiedSelf, r/SelfExperiments, r/Biohackers …; DE: r/FitnessDE) – Aufruf „Android-Beta-Tester gesucht“ | echte Nutzer, gutes Feedback | Eigenwerbung oft verboten oder nur in Sammel-Threads; Konto muss aufgewärmt sein; Health-Claims-Regeln | **ergänzend**, nur wo die Regeln Beta-Aufrufe erlauben (**Klären** je Sub) |

**Nicht** genutzt: Freunde/Familie/Umfeld des Inhabers (Firmenziel: Fremde), bezahlte Tester, Fake-Konten.

### Technik dahinter (Inhaber, einmalig)

1. **Google-Gruppe** anlegen (groups.google.com), z. B. `kolbi-tester` (**Klären:** Name), Beitritt „jeder kann
   beitreten“. In der Play Console → *Test → Geschlossener Test → Tester* die Gruppen-Adresse eintragen.
   So muss niemand uns seine E-Mail schicken – Beitritt + Opt-in-Link reichen.
2. Feld **„Feedback-URL oder E-Mail“** im geschlossenen Test: Support-E-Mail (**Klären:** Adresse, siehe `store/forms.md`).
3. Den **Opt-in-Link** (erscheint, wenn der erste Test-Release von Google freigegeben ist) + Gruppen-Link in die Posts.
4. Für den Tester-Tausch ein **eigenes Google-Konto** nutzen, nicht das private: Andere Entwickler sehen die E-Mail
   ihrer Tester. (Hausregel: die E-Mail des Inhabers geht an keine Dienste.) **Klären:** Inhaber legt ein Konto an.
5. **Klären:** Hat der Inhaber ein **Android-Handy** zum Zurücktesten (und für die Geräteprüfung der Play Console)?
   Ohne Gerät fällt Weg B/C fast weg → dann A + D stärker, Start früher.

## 3 · Zeitplan rückwärts vom Di 1. Dez

| Datum | Wer | Was |
|---|---|---|
| **Di 1. Dez** | Inhaber | In Play Console veröffentlichen |
| **Di 24. Nov** | Inhaber + CEO | Produktionsrelease einreichen (Freigabe manuell) |
| **Mo 16. Nov** | Inhaber | **Spätester** Antrag auf Produktionszugriff (Prüfung bis ~7 Tage) |
| **Mo 2. Nov** | – | **Harte Grenze:** ab heute müssen ≥ 12 Tester durchgehend angemeldet sein (2. Nov + 14 Tage = 16. Nov) |
| **Mo 9. Nov** | Inhaber | **Plan:** Antrag stellen (14 Tage ab 26. Okt voll) – Antworten aus Abschnitt 6 mit echten Zahlen |
| Mo 2.–Fr 6. Nov | Logik + CEO | **Build 2** mit Verbesserungen aus dem Tester-Feedback hochladen (Google will sehen, dass wir reagieren) |
| **Mi 28. Okt** | Growth + Inhaber | **Ziel: 20+ angemeldet** (Puffer) |
| **Mo 26. Okt** | Inhaber | Opt-in-Link live → freigegebene Posts raus, Web-Hinweis an, Zurücktesten startet |
| Fr 23. Okt | Logik/CEO | Erster Android-Build in den geschlossenen Test (STORE.md); Google prüft auch Test-Releases (Stunden bis Tage) |
| Mo 19.–Do 22. Okt | Growth | Posts final, Reddit-Regeln der Subs geprüft, Liste der Tausch-Partner vorbereiten |
| bis Fr 16. Okt | Inhaber | Google-Gruppe + Test-Google-Konto anlegen, Android-Gerät klären; Reddit-Konto weiter aufwärmen |
| bis Fr 9. Okt | Inhaber | Play-Console-Konto + Identitätsprüfung (STORE.md) |

**Täglich 26. Okt – Antrag:** Play Console → geschlossener Test → Anzahl angemeldeter Tester prüfen. Sinkt sie
Richtung 14, sofort nachrekrutieren (fällt sie unter 12, startet die 14-Tage-Uhr neu).
**Nach dem Antrag:** Test **nicht** beenden und Tester nicht entfernen, bis die Produktion freigegeben ist.

## 4 · Was wir im Gegenzug tun (Tester-Tausch)

**Unsere Regel:** Wer Kolbi testet, den testen wir zurück – **14 Tage, echt benutzt, mit kurzem, ehrlichem Feedback**.

- **Wer:** der Inhaber (Claude kann kein Android-Gerät bedienen). Growth führt die Liste und schreibt Feedback-Entwürfe.
- **Aufwand:** pro Partner-App ca. 2–3 Min. pro Tag (öffnen, eine Kernfunktion nutzen) + einmal 5 Min. Feedback.
  Bei 15–20 Partnern **ca. 30–45 Min. pro Tag über gut 2 Wochen** (26. Okt – ca. 13. Nov).
  **Klären:** Hat der Inhaber diese Zeit? Wenn nicht: weniger Tausch-Partner, dafür Wege A und D stärker.
- **Sicherheit:** nur Apps über den Play-Store-Testlink installieren (nie APK-Dateien), Test-Google-Konto, möglichst
  Zweitgerät oder Arbeitsprofil, keine unnötigen Berechtigungen erteilen, nach Ende des Tauschs deinstallieren.
- **Liste** (hier pflegen, nur echte Einträge):

| Partner-App | Reddit-Nutzer / Quelle | Wir angemeldet seit | Partner bei uns seit | Feedback geschickt | Ende |
|---|---|---|---|---|---|
| – | – | – | – | – | – |

**Feedback-Vorlage für fremde Apps** (EN, Inhaber füllt aus):

```
Tested [App] for [N] days on [device, Android version].
What worked well: [1–2 concrete things]
What confused me: [1 concrete moment, with screen name]
Bug/crash: [steps] – or: none found
One idea: [small, concrete]
```

## 5 · Kopierfertige Texte (nur nach CEO-Freigabe posten)

Regeln für alle Texte: keine Wirkversprechen zu Supplements, keine Nutzerzahlen, nur was die App wirklich tut
(`legal/health-claims-check.md`, `brand/BRAND.md`). Platzhalter: `{GRUPPE}` = Link zur Google-Gruppe,
`{OPTIN}` = Opt-in-Link der Play Console, `{WEB}` = Link zur Web-App (`https://kolbi-smoky.vercel.app/en` bzw. `/`).

### 5.1 Reddit Tester-Tausch (r/AndroidClosedTesting, r/TestersCommunity) – EN

**Titel:** `[Exchange] Kolbi – supplement self-experiment journal (EN/DE) · I test back for 14 days`

```
Hi! I need 12 testers for Google's 14-day closed test and I'll test your app back the same way.

App: Kolbi – a small journal for people who take supplements and want to find out what actually makes
a difference for them: a few baseline days, then one supplement at a time, a 1-minute evening check-in,
and a comparison with your own normal. No account, entries stay on your phone. English and German.
Android 8.0+.

How to join:
1. Join the Google group: {GRUPPE}
2. Opt in and install: {OPTIN}
3. Use it like a normal user. No supplements? Tap "Look around with sample data first".
4. Please stay opted in for 14 days.

Feedback: Kolbi tab -> "Feedback" in the app (anonymous), or reply here.

Your turn: comment with your group + opt-in link. I'll join within 24 hours, use your app for 14 days
and send you concrete feedback (what worked, what confused me, bugs).
```

**Antwort, wenn jemand beitritt (EN):**

```
Thanks for joining! I'm in your test now too (joined today, staying 14 days). If anything in Kolbi is
confusing, tell me – that's exactly what I need before launch.
```

### 5.2 Allgemeiner Beta-Aufruf (r/betatesting u. ä.) – EN

**Titel:** `Looking for Android beta testers: a 1-minute-a-day journal to test your own supplements`

```
I'm building Kolbi, a little lab coach for supplement self-experiments. The idea: instead of guessing
whether something does anything for you, you test one supplement at a time and compare it with your
own normal – with a 1-minute evening check-in (sleep, energy, calm, focus).

It doesn't recommend supplements or doses and it's not a medical app – it's a journal that helps you
look at your own data. No account; your entries stay on your phone.

I'm looking for Android testers for the next 2–3 weeks (Google requires a 14-day closed test):
1. Join: {GRUPPE}
2. Install: {OPTIN}
3. Use it if it fits your routine; if it doesn't, tell me why – that's useful too.

Feedback in the app (Kolbi tab -> Feedback, anonymous) or here in the comments. Thank you!
```

### 5.3 Zielgruppen-Community, Deutsch (nur wo Beta-Aufrufe erlaubt sind)

**Titel:** `Android-Tester gesucht: Supplement-Selbstversuch in 1 Minute am Tag`

```
Hi! Ich baue Kolbi – ein kleines Tagebuch für alle, die Supplements nehmen und selbst herausfinden
wollen, was bei ihnen einen Unterschied macht: ein paar Tage dein Normal, dann ein Supplement nach dem
anderen, jeden Abend 1 Minute Check-in (Schlaf, Energie, Ruhe, Fokus) und am Ende der Vergleich.

Kolbi empfiehlt keine Supplements oder Dosierungen und ist kein Medizinprodukt – nur ein Werkzeug,
um auf die eigenen Daten zu schauen. Kein Konto, deine Einträge bleiben auf dem Handy.

Für den Start im Play Store brauche ich Android-Tester für 14 Tage:
1. Google-Gruppe beitreten: {GRUPPE}
2. Teilnehmen und installieren: {OPTIN}
3. Ganz normal nutzen. Keine Supplements gerade? „Erst mal mit Beispiel-Daten umschauen“.

Feedback direkt in der App (Kolbi-Tab → Feedback, anonym) oder hier. Danke!
```

### 5.4 Hinweis für Web-Beta-Nutzer (Landingpage + Web-App, nur auf Android-Browsern) – DE/EN

DE (Karte, ≤ 2 Sätze + Knopf):
```
Android-Tester gesucht 🧪 Hilf Kolbi in den Play Store: 14 Tage die Store-Version testen – deine Daten
ziehst du per Backup mit.
[Mitmachen]
```
EN:
```
Android testers wanted 🧪 Help Kolbi into the Play Store: test the store version for 14 days – bring
your data along with a backup.
[Join]
```
Ziel des Knopfs: kurze Seite mit Schritt 1–3 (Gruppe, Opt-in, „Backup teilen“ in der Web-App → „Backup laden“
in der Store-App). Backup-Export/-Import gibt es in beiden Versionen (Einstellungen → „📦 Daten übertragen“).
→ **Übergabe an UI** (Karte in der Web-App) und an **Growth/CEO** (Block auf der Landingpage nach Freigabe).

### 5.5 Nachrichten an angemeldete Tester (Google-Gruppe, DE + EN in einer Mail)

**Tag 1 – Willkommen:**
```
Danke, dass du Kolbi testest! / Thanks for testing Kolbi!
• Probier zuerst die Beispiel-Daten oder richte in 1 Minute dein eigenes Experiment ein.
  Try the sample data first, or set up your own experiment in 1 minute.
• Feedback: Kolbi-Tab → Feedback (anonym) · Kolbi tab -> Feedback (anonymous)
• Bitte bleib 14 Tage im Test angemeldet. / Please stay opted in for 14 days.
```

**Tag 7 – eine Frage (kein Druck):**
```
Halbzeit! Eine Frage: Was hat dich bisher am meisten gestört oder verwirrt?
Halfway there! One question: what has confused or annoyed you most so far?
Antwort per Feedback in der App oder per Mail. / Reply via in-app feedback or email.
```

**Nach dem Update (Build 2):**
```
Neue Version da – u. a. geändert nach eurem Feedback: [konkrete Punkte, nur echte].
New version is out – changed based on your feedback: [concrete items, real ones only].
```

## 6 · Feedback einsammeln und für Google belegen

| Quelle | Wo lesen | Wer |
|---|---|---|
| **In-App-Feedback** (Kolbi-Tab → „Feedback · Sag mir, was fehlt“; anonym, ≤ 1000 Zeichen) | Supabase-Tabelle `lab_feedback`, Spalte `v` = App-Version | Analyst (nur lesen) |
| **Privates Tester-Feedback im Play Store** (Tester schreiben es auf der Store-Seite der Test-Version) | Play Console → Bewertungen → Tester-Feedback (**Klären:** genaue Menü-Bezeichnung) | Inhaber → Text an CEO |
| **Feedback-Kanal des geschlossenen Tests** (E-Mail/URL) | Support-Postfach | Inhaber |
| **Kommentare** in den Reddit-Threads / Tausch-Apps | dort | Inhaber, Growth formuliert Antworten |
| **Nutzung** (aktive Tester, Abstürze, ANRs) | Play Console → Statistiken / Android Vitals | Inhaber/CEO |
| **Anonyme Statistik** (Einrichtungen, erste Check-ins …) | `lab_stats` | Analyst |

**Übergabe an Logik:** (1) Für den Android-Test eine eigene App-Version im Feedback senden (heute fest `0.9-beta`
in `lib/labGrow.ts`), z. B. `1.0.0-android` – sonst ist Tester-Feedback nicht von Web-Feedback zu trennen.
(2) Optional: im Test-Build den Statistik-Kanal auf `playtest` setzen (bleibt anonym), damit wir echte Nutzung der
Tester belegen können. Ohne das zählen ihre Ereignisse in den allgemeinen Summen mit.

**Feedback-Log** (nur echte Einträge; daraus entstehen die Antworten für Google):

| Datum | Quelle | Rückmeldung (kurz) | Entscheidung | In Build |
|---|---|---|---|---|
| – | – | – | – | – |

### Antrag auf Produktionszugriff – Gerüst (erst mit echten Zahlen füllen)

```
How did you recruit testers? Early users of our web beta who use Android ([n]), tester-exchange
communities on Reddit (r/AndroidClosedTesting, r/TestersCommunity) ([n]), [community] ([n]).
No friends/family, no paid testers.
How easy was it? [ehrlich: z. B. "Took about [x] days; exchange communities were fast, target users slower."]
Engagement and feedback: [n] testers opted in, [n] active in the last 14 days, [n] feedback messages
via in-app feedback, Play tester feedback and comments. Main themes: [1], [2], [3].
How did you collect feedback? Anonymous in-app feedback form, Play Console tester feedback, email, Reddit.
What did you change? Build 2 on [date]: [konkrete Änderungen aus dem Log].
Intended audience: Adults who already take dietary supplements and want to observe their own
experience in a structured way (DE + EN).
How does the app provide value? Structured self-experiments (baseline, one supplement at a time,
1-minute evening check-in, comparison with the user's own baseline), reminders and cost overview –
no account, data stays on the device. Not a medical app.
Expected installs in the first year: [Zahl aus GROWTH.md-Plan, als Schätzung kennzeichnen]
Why is it ready? [z. B. "No crashes reported in Android vitals for [n] days; all critical feedback fixed in build 2."]
```

## 7 · Risiken (ehrlich)

- **Zu wenig echte Nutzung:** Tausch-Tester öffnen fremde Apps oft nur kurz. Gegenmittel: Weg A + D, konkrete
  Tag-1/Tag-7-Nachrichten, Beispiel-Daten-Knopf (sofort etwas zu sehen). Keine Tricks, um Zahlen zu schönen.
- **Uhr startet neu**, wenn < 12 Tester: 20+ als Ziel, täglich zählen.
- **Antrag abgelehnt** (zu wenig Feedback/Änderungen): Build 2 mit echten Änderungen einplanen; dann neuer Antrag
  → kostet ~1–2 Wochen. Deshalb Start 26. Okt, nicht später.
- **Zeit des Inhabers** fürs Zurücktesten (30–45 Min./Tag) – vorher klären.
- **Reddit:** Konto ohne Karma wird in manchen Subs gefiltert; Regeln ändern sich → vor jedem Post prüfen.
- **Datenschutz:** Über die Google-Gruppe sehen wir E-Mail-Adressen der Tester. Nur für den Test nutzen, nicht
  exportieren, Gruppe nach dem Start schließen. **Klären (CEO, Rechtstexte):** kurzer Absatz „Beta-Test über Google
  Play“ in der Datenschutzerklärung.
- **Tausch-Apps (Weg C):** fremder Anbieter mit eigenen Bedingungen; nur kostenloser Tausch, nur nach Freigabe.
