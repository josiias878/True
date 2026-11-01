# Kalender und private Rückzahlungen

Der Monatskalender zeigt aktuell eingetragene Zahlungstermine, bestätigte Zahlungen, den nächsten Gehaltstag und offene private Rückzahlungen. Symbole werden aus dem Zahlungsnamen abgeleitet. Ein Klick öffnet die Tagesliste. Wiederkehrende Zahlungen werden derzeit mit dem nächsten gespeicherten Termin gezeigt, nicht unbegrenzt in die Zukunft projiziert.

Unter „Geliehen & geschuldet“ Person, Richtung, Betrag und optionalen Rückzahltermin erfassen. Die ursprüngliche Übergabe wird standardmäßig nicht erneut gebucht, weil sie bereits im Startkontostand oder in vorhandenen Buchungen enthalten sein kann. Nur für eine noch nicht erfasste heutige Übergabe die zusätzliche Kontobuchung auswählen.

Erwartete Rückzahlungen erhöhen den Kontostand nicht. Eigene fällige Schulden bis zum nächsten Gehalt werden im verfügbaren Budget reserviert. Keine zusätzliche geplante Zahlung für dieselbe Schuld anlegen. Ohne Termin wird das Budget als vorläufig markiert.

Bei Fälligkeit erscheint auf der Startseite eine Prüferinnerung. Zahlung einschließlich Teilzahlung bestätigen oder Termin verschieben. Bereits erfasste Rückzahlungen können zugeordnet werden. Das vermeidet doppelte Kontobuchungen. Die Erinnerung ist innerhalb der App; Hintergrund-Push ist noch nicht implementiert.

Gespeicherte private Schulden sind Teil des Finanzplans und werden mit Cloud-Upload beziehungsweise aktiviertem automatischem Abgleich übertragen. Verbundenes Claude Code kann sie über klar_read_plan lesen. Neue persönliche Schulden und Rückzahlungszuordnungen werden bisher über die App angelegt.

Browser-Tests: Teilrückzahlung, erwarteter Eingang ohne Erhöhung des Kontostands, Reservierung eigener Schuld, Schaltjahr-Kalender und mobile Breite.
