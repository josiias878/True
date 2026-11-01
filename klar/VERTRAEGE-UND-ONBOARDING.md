# Grundlagen und Vertragsübersicht

Vor den Fragen zu Kontostand und Gehalt führt die Einrichtung durch
fünf Bereiche: Wohnen, Energie, Telefon/Internet, Versicherungen und Mobilität.
Bestehende Nutzer starten über die Übersicht oder Verträge → Einrichtung
durchgehen. Überspringen und später fortsetzen sind möglich; ein durchgesehener
Bereich bedeutet nicht, dass alle Vertragsangaben bekannt sind.

Einträge unterscheiden bestehende Verträge, Wünsche/Prüfpunkte und nicht benötigte
oder bereits enthaltene Leistungen. Rechtsschutz und ADAC sind ausdrücklich
Prüfpunkte. Die Hinweise sind statische Entscheidungshilfen, keine individuelle
KI-Tarifberatung und kein Marktvergleich. Weitere Verträge lassen sich ergänzen.

Gespeichert werden Anbieter, Ablage/Portal, Beitrag und Zahlweise, nächste offene
Zahlung, Kündigungs-/Prüfdatum sowie optionale Kundennummer und Notizen. Bei Miete
sind Kaltmiete und Nebenkosten Teilbeträge; gezählt wird nur die Warmmiete.
Jahres- und Quartalskosten werden für die Übersicht auf Monate umgerechnet.
Wünsche und unbekannte Beträge werden nicht als bekannte Kosten dargestellt.

Screenshots werden ausschließlich lokal mit dem vorhandenen Tesseract gelesen.
Der Text dient als Ausfüllhilfe; erkannte Eurobeträge können einzeln ausgewählt
werden. Anbieter, Zahlweise und Termine müssen vom Dokument übernommen und
geprüft werden. Weder Bild noch gesamter OCR-Text werden gespeichert. Die Karten
verwenden Bereichssymbole und Namenskürzel, keine extern geladenen Anbieterlogos.

Die Vertragsübersicht erzeugt keine Buchungen. Erst eine ausdrücklich bestätigte
Übernahme plant die nächste konkrete Zahlung im vorhandenen Budget/Kalender.
Bereits eingetragene Zahlungen können zugeordnet werden; eine verknüpfte
Fälligkeit wird beim erneuten Übernehmen aktualisiert statt dupliziert.
Vertragsänderungen verändern vorhandene Zahlungspläne nicht stillschweigend.
Übernommene Zahlungen wiederholen sich nicht automatisch. Eine ausgewählte
bestehende Wiederholung wird bei der Übernahme abgeschaltet; der Dialog erklärt
dies vor dem Bestätigen. Kündigungstermine werden derzeit auf den Vertragskarten
angezeigt; hierfür gibt es noch keine automatische Push-Erinnerung.

Die neuen Felder befinden sich im bestehenden Finanzplan: lokale Speicherung,
Datensicherung und Cloud-Upload funktionieren über die bisherigen Wege. Ohne
lokale Speicherung oder bestätigten Cloud-Upload gehen neue Angaben beim
Neuladen verloren. Der gespeicherte Login allein speichert keine Finanzdaten.

Browserprüfung: `node klar/tests/contracts.browser.cjs` (Playwright, Chromium).
Geprüft: kompletter Neueinstieg, Mietaufteilung, Zahlung ohne doppelte Reserve,
Auswahl erkannter Beträge, ausgeschlossene Wünsche, Jahreskosten, eigener Vertrag,
Backup-Validierung, Neuladen mit gespeicherten Daten und mobile Darstellung.

Zusätzlich mit echter lokaler Texterkennung geprüft: erzeugter Vertrags-Screenshot → Tesseract → 89,50 EUR ausgewählt → Vertragsangabe gespeichert.
