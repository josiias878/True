# Einkauf und automatischer Abgleich

Unter Einkauf & Essen → Kassenzettel ein Foto oder einen Screenshot auswählen und „Artikel erkennen“ drücken. Die Texterkennung bleibt auf dem Gerät. Vorschläge mit dem Beleg vergleichen: Warengruppen, fehlende Artikel, Rabatte und Pfand prüfen. Die Summe der aufgenommenen Artikel unabhängig eingeben. Erst nach Bestätigung wird die Einkaufsliste gespeichert; keine zusätzliche Kontobuchung wird erzeugt. PDF-Belege bitte als Screenshot verwenden.

Automatischer Abgleich: anmelden, eigene Planung einmal hochladen, dann in den Einstellungen den automatischen Abgleich einschalten. Während die App geöffnet und angemeldet ist, speichert sie Änderungen und prüft etwa alle zehn Sekunden auf Änderungen anderer Geräte oder von Claude. Offene Eingabefenster pausieren den Abgleich. Nach Neuladen erneut anmelden und aktivieren. Konflikte oder Verbindungsfehler stoppen den Abgleich; vor einer manuellen Serverübernahme lokale Änderungen sichern.

Kassenzettel sind Teil des Cloud-Plans und dadurch über `klar_read_plan` für verbundenes Claude Code lesbar. Monatsberichte zeigen nur erfasste Käufe. Preis- und Mengenvergleiche sowie Großpackungsempfehlungen brauchen nachvollziehbare Mengen, Grundpreise und Verbrauch. Keine automatischen Händlerpreisabfragen.

Validiert mit Browser-Tests und simulierten Cloud-Antworten: Belegprüfung, Summen, Kontostand unverändert, automatisches Speichern, Übernahme neuer Serverversionen und Erhalt lokaler Daten bei Konflikten. Der Ablauf mit echtem Konto auf zwei Geräten und individuellen Belegen muss noch praktisch geprüft werden.
