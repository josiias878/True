# Erst Grundlagen, dann Restgeld

Der Einstieg beginnt jetzt mit Wohnen, Energie, Telefon/Internet, Versicherungen
und Mobilität. Der Kontostand wird erst danach abgefragt. Bestätigte Verträge,
der Einrichtungsschritt, Kontostandsentwurf und Zuordnungen werden in einem
separaten lokalen Entwurf gespeichert. Dieser Entwurf enthält noch kein
Finanzprofil und kann nach Neuladen fortgesetzt werden. Er ist keine Cloud-Sicherung.
Screenshots dienen weiterhin als lokale Ausfüllhilfe; Bilder werden nicht als
Dokumentenarchiv gespeichert. Noch nicht bestätigte Vertragsformularfelder sind
erst nach „Angaben speichern“ im Entwurf.

Am Ende wird der heutige gebuchte Kontostand zum Ausgangspunkt. Kein Warten auf
den Gehaltstag und kein rückwirkendes Nachtragen eines ganzen Monats nötig.
Für jeden aktiven Vertrag mit bekanntem Betrag wird ausdrücklich ausgewählt:

- Bereits im Startkontostand enthalten: keine weitere Abbuchung oder Reserve.
- Noch offen/nicht gebucht: offene Zahlung übernehmen, bei unbekanntem Termin
  mit offenem Datum. Der Bestand und der aktuelle Saldo ändern sich dadurch nicht.
- Später prüfen: keine automatische Reserve; bleibt in der Startübersicht offen.

Beispiel: Start am 1. November, Gehalt voraussichtlich am 8. November. Ist die
Miete schon im gebuchten Saldo abgezogen, gehört sie zu „enthalten“. Eine erst
beauftragte, noch nicht gebuchte Mietüberweisung gehört zu „offen“. Verträge
bleiben unabhängig vom ersten Planungsabschnitt erhalten. Unbekannte Beträge,
Lebenshaltungskosten und einmalige Rechnungen können später ergänzt werden;
das Budget bleibt bis zur Prüfung vorläufig.

Die fertige Planung wird lokal gespeichert, bevor der Entwurf gelöscht wird.
Bei blockiertem Speicher bleibt die Abschlussprüfung mit Fehlermeldung offen.
Ältere echte Finanzpläne werden durch den neuen Einstieg nicht zurückgesetzt.
Eine bereits vorhandene Planung kann im Vertragsbereich ergänzt werden.

# Gehaltstag und Bestätigung

Ab dem erwarteten Gehaltstag fragt die App beim Öffnen nach dem tatsächlichen
Eingang (höchstens einmal täglich automatisch; manuell über Übersicht oder
Einstellungen weiterhin verfügbar). Die voreingestellte Regel für Folgetermine
ist der 8. des Monats, in den Einstellungen änderbar. Der erste erwartete Termin
wird beim Einstieg eingegeben.

Ein bestätigter Betrag wird einmal als Einnahme gespeichert. Der Kontostand
erhöht sich entsprechend; anschließend wird der nächste erwartete Termin auf
den kommenden festgelegten Monatstag gesetzt. Bereits erfasste Einnahmen können
zugeordnet werden, ohne eine zweite Buchung anzulegen. Bei einer gleich hohen
Einnahme am selben Datum wird die doppelte Erfassung blockiert und auf die
Zuordnung verwiesen. Noch nicht eingegangenes Gehalt kann auf ein späteres
Erinnerungsdatum verschoben werden; das erzeugt kein Guthaben.

Das Alltagsbudget und der Beginn des bestehenden Finanzzeitraums werden durch
die Gehaltsbestätigung nicht automatisch zurückgesetzt. Ein neuer Budgetzeitraum
kann wie bisher separat in den Einstellungen begonnen werden.

Der bestehende Push-Dienst berücksichtigt die Gehaltsnachfrage ab dem
erwarteten Termin bei seinem morgendlichen Lauf gegen 9 Uhr Europe/Berlin.
Voraussetzung sind die abgeschlossene Push-Einrichtung und ein angemeldetes
Gerät. Er nutzt ausschließlich die Serverplanung. Bestätigungen und verschobene
Termine müssen durch aktiven Cloud-Abgleich oder manuelles Hochladen auf dem
Server ankommen. Die App erkennt keine Bankeingänge selbst.

Geprüft mit `node klar/tests/onboarding.browser.cjs`: erster Bildschirm ohne
Kontostandsfrage, fortsetzbarer Vertragsentwurf und Abschlussprüfung, erhaltene
Verträge, beide Mietfälle (bezahlt/offen), keine vorzeitige Gehaltsgutschrift,
Bestätigung/Vertagung und nächster Termin am 8., Datensicherung und Handybreite.
Servertests für Gehaltsnachfrage und Vertagung: `node klar/tests/push.test.cjs`.
