# Auf diesem Gerät angemeldet bleiben

Die Option ist bei der Anmeldung vorausgewählt. Klar speichert Zugriffstoken,
Refresh-Token, Ablaufzeit, Konto-ID, E-Mail und öffentlichen Projektschlüssel im
lokalen Browserspeicher. Das Passwort wird nicht gespeichert. Auf fremden Geräten
kann die Option vor dem Anmelden abgewählt werden. Eine bestehende alte Sitzung
muss einmal neu angemeldet werden, da ihr Refresh-Token bisher verworfen wurde.

Beim Start, Zurückkehren zur App und vor Cloud- oder Push-Anfragen wird eine
ablaufende Sitzung über Supabase erneuert. Gleichzeitige Erneuerungen im selben
Fenster werden gebündelt; Web Locks koordinieren unterstützte Browserfenster.
Bei Netzfehlern bleibt die gespeicherte Anmeldung bestehen. Wird der Refresh-Token
vom Server abgelehnt, ist eine erneute Anmeldung erforderlich.

Abmelden entfernt die lokale Anmeldung, verhindert die Wiederherstellung durch
eine verspätete Refresh-Antwort und stoppt den laufenden Cloud-Abgleich. Andere
Fenster desselben Browserprofils übernehmen den lokalen Anmeldestatus. Ein
separates Gerät ist davon nicht betroffen. Browserdaten löschen, Privatmodus
oder serverseitig widerrufene Sitzungen können eine neue Anmeldung erforderlich
machen. Push-Abonnements werden wie im Erinnerungsdialog beschrieben separat
ausgeschaltet.

Das Behalten der Anmeldung aktiviert nicht automatisch den Datenabgleich und
überschreibt keine lokale Planung.

Browserprüfung mit simuliertem Supabase: `node klar/tests/session.browser.cjs`
(Playwright und Chromium erforderlich). Geprüft: Anmeldung nach Neuladen,
Tokenrotation, parallele Refresh-Anfragen, stabile Identität für den Abgleich,
vorübergehender Serverausfall, Abmelden während Refresh, abgewählte Speicherung
und Abmelden mit anschließendem Neuladen. Echter iPhone-Test steht noch aus.
