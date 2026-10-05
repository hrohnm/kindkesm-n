# Walkthrough-Protokoll

Durchlauf aller Abläufe aus [WALKTHROUGHS.md](../WALKTHROUGHS.md), automatisiert im Browser (Playwright, Chromium).

| | |
|---|---|
| **Datum** | 05.10.2026 |
| **Stand** | `main` nach PR #21 plus die Korrekturen aus diesem Durchlauf |
| **Umgebung** | lokaler Produktions-Build (`NODE_ENV=production`, `DEMO_MODUS=ja`), PostgreSQL 16, Demo-Daten frisch eingespielt (`npm run db:reset:demo`) |
| **Geräte** | „iPad quer“ (1180 × 820, Touch) und „Handy“ (390 × 844, Touch) |
| **Ergebnis** | **73 von 73 Walkthrough-Tests bestanden** (37 weitere übersprungen: Abläufe, die Daten ändern, laufen nur einmal auf dem iPad). Außerdem grün: 18 bestehende Browser-Tests, 79 Shared- und 86 API-Tests. |

Wiederholen: siehe [Abschnitt „So wiederholen“](#so-wiederholen). Screenshots liegen in [`bilder/`](bilder/) (Dateiname `<gerät>-<Kennung>-….jpg`).

> Alle Daten auf den Screenshots sind erfundene Demo-Daten.

---

## 1. Gefundene Fehler (behoben)

| # | Walkthrough | Fehler | Behebung |
|---|---|---|---|
| 1 | A3 📱 | **Auf dem Handy gab es keinen „Abmelden“-Knopf.** Die Seitenleiste mit dem Knopf ist auf schmalen Bildschirmen ausgeblendet, die Einstellungen boten keinen Ersatz. | Einstellungen zeigen auf dem Handy unten Name, E-Mail und „Abmelden“ (inkl. Warnung bei nicht übertragenen Änderungen). |
| 2 | D5 ⚠️ | **Ende vor Beginn wurde still als Besuch über Mitternacht gerechnet** (11:00–10:00 → 1.380 Minuten, nur ein gelber Hinweis). Gleicher Beginn und gleiches Ende ergaben sogar 24 Stunden. | Über Mitternacht bleibt erlaubt (z. B. 23:30–00:20), aber höchstens 12 Stunden; sonst roter Fehler „Das Ende liegt vor dem Beginn …“. Beginn = Ende ergibt 0 Minuten („mindestens 5 Minuten“). Mit Unit-Tests abgesichert. |
| 3 | I2 | **Teilnehmerin auf der Warteliste erschien erst nach dem Neuladen.** Die Meldung „Kurs ist voll“ wurde als Fehler geworfen, dadurch wurde die Liste nicht aktualisiert. | Liste lädt sofort neu, die Meldung erscheint als Hinweis (gelb) statt als Fehler. |
| 4 | I4 | **Nach „Termin abschließen“ verschwand die Rückmeldung** (z. B. „nicht mit einer Akte verknüpft – keine Abrechnung“), weil sich das Formular neu aufbaut. | Meldung liegt jetzt eine Ebene höher und bleibt sichtbar. |

## 2. Drehbuch präzisiert

Kein Programmfehler, aber das Drehbuch beschrieb es ungenau. [WALKTHROUGHS.md](../WALKTHROUGHS.md) ist angepasst.

- **A1:** Die Begrüßung lautet „Moin, Vorname!“.
- **A5:** Wird die IK geändert, erscheint statt „Gespeichert“ der Hinweis, die Änderung der SVI und dem Berufsverband zu melden.
- **C9 ⚠️:** Wird die Anschrift in den Stammdaten auf eine unauffindbare Adresse geändert, verwirft die App die alte Position bewusst, damit kein falsches Wegegeld entsteht. „Bisherige Position bleibt“ gilt nur für „Aus Adresse ermitteln“ ohne Adressänderung.
- **D4:** „Entwurf“ führt zurück in die Akte bzw. Tour; der Entwurf steht dort und im Cockpit unter „Offene Dokumentationen“.
- **F4:** „Ab jetzt neu berechnen“ erscheint nur für heute und erst, wenn ein Besuch erledigt ist.
- **F6:** Die Wegegeld-Tabelle erscheint erst, wenn an dem Tag ein Hausbesuch abgeschlossen ist (vorher: „Wird automatisch berechnet …“).

## 3. Hinweise zur Testumgebung

- **Kartenkacheln** bleiben grau, weil der Kachelserver aus der Testumgebung nicht erreichbar ist. Positionen, Marker und das Setzen per Tippen funktionieren. Routen werden ohne OSRM per Luftlinie × 1,3 geschätzt.
- **Adresssuche:** Das lokale Adressverzeichnis ist im Test leer, daher kamen die Positionen aus der Online-Suche (Nominatim). Im Betrieb empfiehlt BETRIEB.md das lokale Verzeichnis und `GEOCODER_URL=aus`.
- **Handy-Screenshots** sind Ganzseitenaufnahmen; die fest stehende Kopfzeile des Besuchs und die untere Navigationsleiste erscheinen dadurch mitten im Bild. Auf dem Gerät stehen sie oben bzw. unten.
- **A2 (Sperre nach 10 Fehlversuchen)** wurde gegen eine zweite Instanz mit Standardgrenze geprüft, weil die Testinstanz die Grenze für die vielen Testanmeldungen hochsetzt (`ANMELDUNG_MAX`).

---

## 4. Ergebnis je Walkthrough

✅ bestanden · 🔧 Fehler gefunden und behoben · 📝 Drehbuch präzisiert · 🤖 zusätzlich durch die bestehenden Browser-Tests (`apps/web/e2e`) · ◐ teilweise (Rest nur von Hand prüfbar)

### A. Zugang und persönliche Einstellungen

| | Ergebnis | Geprüft | Bilder |
|---|---|---|---|
| A1 | ✅📝 | Demo-Knopf, Begrüßung, Navigation (iPad und Handy) | [iPad](bilder/ipad-quer-A1-startseite.jpg) · [Handy](bilder/handy-A1-startseite.jpg) · [Anmeldeseite](bilder/handy-A1-anmeldeseite.jpg) |
| A2 | ✅ | Fehlermeldung; 10 Fehlversuche → 11. Versuch gesperrt (HTTP 429) | [Bild](bilder/ipad-quer-A2-falsches-passwort.jpg) |
| A3 | 🔧 | Abmelden auf iPad und Handy, danach Zugriff auf Seiten gesperrt | – |
| A4 | ✅ | Abweichende Wiederholung → Feldfehler; neues Passwort funktioniert; zurückgesetzt | [Bild](bilder/ipad-quer-A4-passwort-ungleich.jpg) |
| A5 | ✅📝 | Telefon gespeichert und nach Neuladen vorhanden; IK-Änderung mit SVI-Hinweis | [Profil](bilder/ipad-quer-A5-profil.jpg) · [IK](bilder/ipad-quer-A5-ik-geaendert.jpg) |
| A6 | ✅ | Ort mit Position aus der Adresse; unbekannte Anschrift → Meldung, Setzen auf der Karte; Tourvorlage Freitag | [Ort](bilder/ipad-quer-A6-ort-aus-adresse.jpg) · [unbekannt](bilder/ipad-quer-A6-unbekannte-anschrift.jpg) · [Vorlage](bilder/ipad-quer-A6-tourvorlage.jpg) |
| A7 | ✅ | Stichtag 5., Erinnerung 3 Tage, „Nächster Versand“ passt | [Bild](bilder/ipad-quer-A7-abrechnung.jpg) |
| A8 | ✅ | Praxisdaten speichern | [Bild](bilder/ipad-quer-A8-praxis.jpg) |
| A9 | ✅🤖 | Feld „Kaiserschnittnarbe (nach Kaiserschnitt)“ in der Ansicht | [iPad](bilder/ipad-quer-A9-ansicht.jpg) · [Handy](bilder/handy-A9-ansicht.jpg) |

### B. Startseite

| | Ergebnis | Geprüft | Bilder |
|---|---|---|---|
| B1 | ✅ | Heute, Tour heute mit „Zur Tour ›“, Offene Dokumentationen, Fristen; Hinweis-Link führt zur Zielseite | [iPad](bilder/ipad-quer-B1-cockpit.jpg) · [Handy](bilder/handy-B1-cockpit.jpg) |

### C. Klientinnen und Akte

| | Ergebnis | Geprüft | Bilder |
|---|---|---|---|
| C1 | ✅ | Neue Klientin „Testa Wanderer“: Betreuung Schwangerschaft mit SSW, Position aus der Adresse | [Formular](bilder/ipad-quer-C1-formular.jpg) · [Akte](bilder/ipad-quer-C1-neue-akte.jpg) |
| C2 | ✅ | Suche, Alle/Meine, Status-Filter, Flagge „Risiko“, Lebenstag | [iPad](bilder/ipad-quer-C2-suche.jpg) · [Handy](bilder/handy-C2-suche.jpg) |
| C3 | ✅ | Falsche Versichertennr./Kassen-IK → Feldfehler; neue Anschrift → neue Position | [Bild](bilder/ipad-quer-C3-feldfehler.jpg) |
| C4 | ✅ | Gravida/Para, Geburtsort, Art der Geburt „Primäre Sectio“, Notiz | [Bild](bilder/ipad-quer-C4-betreuung-formular.jpg) |
| C5 | ✅ | Kind „Fiete“: Art der Geburt vorbelegt, Status → Wochenbett, Links zu Wachstum und Urkunde, Narbenfeld im Besuch | [Formular](bilder/ipad-quer-C5-kind-formular.jpg) · [Akte](bilder/ipad-quer-C5-akte-mit-kind.jpg) |
| C6 | ✅🤖 | Flaggen, Allergie als rote Meldung, Abzeichen in der Liste | – |
| C7 | ✅🤖 | Kontakt anlegen, tel:/mailto:-Links, bearbeiten, löschen | [Bild](bilder/ipad-quer-C7-kontakte.jpg) |
| C8 | ✅🤖 | Tablet ohne Unterschrift → Knopf gesperrt; Tablet-Unterschrift; mündlich erteilt und widerrufen; Unterschrift bleibt sichtbar | [Bild](bilder/ipad-quer-C8-einwilligungen.jpg) |
| C9 | ✅📝 | Position von Hand → „von Hand gesetzt“; aus Adresse; unauffindbare Anschrift → Meldung | [von Hand](bilder/ipad-quer-C9-von-hand.jpg) · [nicht gefunden](bilder/ipad-quer-C9-nicht-gefunden.jpg) |
| C10 | ✅ | Johanna trägt Marielena als Vertretung ein → bei Marielena unter „Meine“ mit „Vertretung durch mich“ | [Bild](bilder/ipad-quer-C10-vertretung.jpg) |
| C11 | ✅ | Formular 3.1 (Schwangere) und 3.3 (nach Geburt) als PDF | – |
| C12 | ✅ | Kontingentbalken, Besuche mit GPOS und Unterschriftsart | [iPad](bilder/ipad-quer-C12-kontingente-besuche.jpg) · [Handy](bilder/handy-C12-kontingente-besuche.jpg) |

### D. Besuch dokumentieren

| | Ergebnis | Geprüft | Bilder |
|---|---|---|---|
| D1 | ✅ | Aus der Tour: Zeiten, Notiz, Einzelheiten der Abrechnung, Formularzeile, Papier-Unterschrift → Termin „Besuch ansehen“ ✓ (iPad und Handy) | [Tour](bilder/ipad-quer-D1-tour.jpg) · [Besuch iPad](bilder/ipad-quer-D1-besuch.jpg) · [Besuch Handy](bilder/handy-D1-besuch.jpg) |
| D2 | ✅🤖 | Tablet-Unterschrift (bestehender Test „Hausbesuch“) | – |
| D3 | ✅ | Vorsorge in der Praxis mit Material: Materialposition, kein Wegegeld | [Bild](bilder/ipad-quer-D3-vorsorge-material.jpg) |
| D4 | ✅📝 | Entwurf → Cockpit „Offene Dokumentationen“ → weiter → löschen | [Bild](bilder/ipad-quer-D4-offene-dokumentationen.jpg) |
| D5 | 🔧 | Ende vor Beginn → Fehler; Beginn = Ende → Fehler; lange Dauer → Hinweis Höchstdauer; Abschließen ohne Unterschrift abgelehnt | [Ende vor Beginn](bilder/ipad-quer-D5-ende-vor-beginn.jpg) · [lang](bilder/ipad-quer-D5-lange-dauer.jpg) · [ohne Unterschrift](bilder/ipad-quer-D5-ohne-unterschrift.jpg) |
| D6 | ✅🤖 | Kaiserschnittnarbe nur nach Sectio, Mehrfachauswahl (bestehender Test „Art der Geburt“) | – |
| D7 | ✅ | Fenster „Wachstum“ mit ungespeichertem Wert, Reiter, Schließen mit Esc, Formular unverändert | [iPad](bilder/ipad-quer-D7-wachstum-fenster.jpg) · [Handy](bilder/handy-D7-wachstum-fenster.jpg) |
| D8 | ✅ | Datum/Zeiten gesperrt, Hinweis § 12, Notiz geändert, frühere Version gespeichert | [Bild](bilder/ipad-quer-D8-korrektur.jpg) |
| D9 | ✅ | Besuch der Kollegin nur lesbar, keine Speichern-Knöpfe | [iPad](bilder/ipad-quer-D9-kollegin.jpg) · [Handy](bilder/handy-D9-kollegin.jpg) |

### E. Wachstum und Kinderurkunde

| | Ergebnis | Geprüft | Bilder |
|---|---|---|---|
| E1 | ✅🤖 | Reiter Gewicht/Länge/Kopfumfang mit Kurven und Kennzahlen | [Gewicht](bilder/ipad-quer-E1-gewicht.jpg) · [Kopfumfang](bilder/ipad-quer-E1-kopfumfang.jpg) · [Handy](bilder/handy-E1-gewicht.jpg) |
| E2 | ✅🤖 | Alle vier Gestaltungen als PDF; plattdeutsche Vorlage, Wochenwerte, eigener Meilenstein, Entwurf, Vorschau, Fertig | [Seite](bilder/ipad-quer-E2-urkunde.jpg) · PDFs: [Kindkesmöön 1](bilder/pdf-urkunde-kindkesmoeoen-1.jpg) [2](bilder/pdf-urkunde-kindkesmoeoen-2.jpg) · [Ostsee 1](bilder/pdf-urkunde-ostsee-1.jpg) [2](bilder/pdf-urkunde-ostsee-2.jpg) · [Leuchtturm 1](bilder/pdf-urkunde-leuchtturm-1.jpg) [2](bilder/pdf-urkunde-leuchtturm-2.jpg) · [Schlicht 1](bilder/pdf-urkunde-schlicht-1.jpg) [2](bilder/pdf-urkunde-schlicht-2.jpg) |
| E3 | ✅ | Hinweis „Einwilligung … noch nicht erfasst“ mit Link, Speichern bleibt möglich | [iPad](bilder/ipad-quer-E3-ohne-einwilligung.jpg) · [Handy](bilder/handy-E3-ohne-einwilligung.jpg) |
| E4 | ✅ | Kind 78 Tage alt → Cockpit-Hinweis mit Link; nach „Fertig“ verschwunden | [Bild](bilder/ipad-quer-E4-cockpit-erinnerung.jpg) |

### F. Tourenplanung

| | Ergebnis | Geprüft | Bilder |
|---|---|---|---|
| F1 | ✅🤖 | Termin mit Zeitfenster, Vorschlag übernommen, Route optimiert | [iPad](bilder/ipad-quer-F1-tour-geplant.jpg) · [Handy](bilder/handy-F1-tour-geplant.jpg) |
| F2 | ✅ | Abfahrt, Ankunft spätestens, Puffer → Neuberechnung mit Hinweis | [Bild](bilder/ipad-quer-F2-start-ziel.jpg) |
| F3 | ◐ | Links für Apple Karten, Google Maps und Anruf korrekt; das Öffnen der Apps nur auf dem Gerät prüfbar | [iPad](bilder/ipad-quer-F3-unterwegs.jpg) · [Handy](bilder/handy-F3-unterwegs.jpg) |
| F4 | ✅📝 | Reihenfolge ↑, bearbeiten, absagen (→ „Abgesagt“), Termin ohne Besuch löschen | [Bild](bilder/ipad-quer-F4-geaendert.jpg) |
| F5 | ✅🤖 | Tour bestätigen, ins Fahrtenbuch, Fahrtenbuch öffnen | – |
| F6 | ✅📝 | Wegegeld-Tabelle, Gesamtstrecke von Hand | [Bild](bilder/ipad-quer-F6-wegegeld.jpg) |

### G. Fahrtenbuch

| | Ergebnis | Geprüft | Bilder |
|---|---|---|---|
| G1 | ✅🤖 | Fahrt eintragen, PDF- und CSV-Export | [iPad](bilder/ipad-quer-G1-fahrtenbuch.jpg) · [Handy](bilder/handy-G1-fahrtenbuch.jpg) |

### H. Abrechnung

| | Ergebnis | Geprüft | Bilder |
|---|---|---|---|
| H1 | ✅🤖 | Offene Fälle mit Summen und Prüfung, Einzelaufstellung je Patientin und je Versand | [Bild](bilder/ipad-quer-H1-offene-faelle.jpg) |
| H2 | ✅🤖 | Versand vorbereiten, Versandmappe als PDF; ohne IK abgelehnt | [ohne IK](bilder/ipad-quer-H2-ohne-ik.jpg) · Mappe: [1](bilder/pdf-versandmappe-1.jpg) [2](bilder/pdf-versandmappe-2.jpg) [3](bilder/pdf-versandmappe-3.jpg) |
| H3 | ✅🤖 | Versendet mit Einschreiben-Nr., danach nicht mehr auflösbar | – |
| H4 | ✅ | Zahlung erfasst → „bezahlt“ | [Bild](bilder/ipad-quer-H4-bezahlt.jpg) |
| H5 | ✅ | Vorbereiteten Versand aufgelöst → Leistungen wieder offen | – |

### I. Kurse

| | Ergebnis | Geprüft | Bilder |
|---|---|---|---|
| I1 | ✅ | Kassenkurs „Rückbildung am Abend“ mit 2 Plätzen, Serie mit 8 Terminen | [Bild](bilder/ipad-quer-I1-kurs-formular.jpg) |
| I2 | 🔧 | Aus der Akte und ohne Akte („keine Akte“ rot), voll → Warteliste, Nachrücken bei vollem Kurs abgelehnt, nach Storno nachgerückt, Akte zugeordnet | [Bild](bilder/ipad-quer-I2-teilnehmerinnen.jpg) |
| I3 | ✅🤖 | Öffentliche Seite ohne Namen anderer, ohne Einwilligung abgelehnt, Danke-Seite, Cockpit-Hinweis bei der Kursleitung (iPad und Handy) | [Seite](bilder/handy-I3-anmeldeseite.jpg) · [Danke](bilder/handy-I3-danke.jpg) |
| I4 | 🔧🤖 | Anwesenheit mit Tablet- und Papier-Unterschrift, Termin abgeschlossen, Kurseinheit in der Akte; ohne Akte → „keine Abrechnung“ | [Anwesenheit](bilder/ipad-quer-I4-anwesenheit.jpg) · [abgeschlossen](bilder/ipad-quer-I4-abgeschlossen.jpg) |
| I5 | ✅ | Selbstzahler: „bezahlt“ abhaken, keine Akte nötig | [Bild](bilder/ipad-quer-I5-selbstzahler.jpg) |

### J. Regelwerk

| | Ergebnis | Geprüft | Bilder |
|---|---|---|---|
| J1 | ✅ | Suche nach GPOS, Kategorie | [iPad](bilder/ipad-quer-J1-regelwerk.jpg) · [Handy](bilder/handy-J1-regelwerk.jpg) |
| J2 | ✅🤖 | Vorschlag, Testrechner, Freigabe durch zweite Hebamme (bestehender Test) | – |
| J3 | ✅ | CSV exportiert, Betrag geändert, importiert → Vorschlag zur Freigabe | [Bild](bilder/ipad-quer-J3-csv-vorschlag.jpg) |
| J4 | ✅🤖 | Eigener Selbstzahler-Preis (bestehender Test) | – |
| J5 | ✅ | Neue Fassung ab 01.01.2027 als Vorschlag | – |

### K. Team

| | Ergebnis | Geprüft | Bilder |
|---|---|---|---|
| K1 | ✅🤖 | Lorina mit „Babypause bis 01.03.2027“ | [iPad](bilder/ipad-quer-K1-team.jpg) · [Handy](bilder/handy-K1-team.jpg) |

### L. Offline-Betrieb

| | Ergebnis | Geprüft | Bilder |
|---|---|---|---|
| L1 | ✅🤖 | „Für unterwegs laden“ mit Anzahl der Datensätze | [iPad](bilder/ipad-quer-L1-offline-seite.jpg) · [Handy](bilder/handy-L1-offline-seite.jpg) |
| L2 | ✅🤖 | Besuch im Funkloch, automatische Übertragung (bestehender Test „offline“) | – |
| L3 | ✅🤖 | App ohne Netz neu geladen (bestehender Test „offline“) | – |
| L4 | ✅ | Zwei Geräte, gleiches Feld unterschiedlich geändert → Konflikt mit beiden Werten, „Diese Fassung übernehmen“ → auf dem Server | [Bild](bilder/ipad-quer-L4-konflikt.jpg) |
| L5 | ✅ | Abmelden mit offener Änderung → Warnung „noch nicht übertragen“; Abbrechen hält die Anmeldung | – |
| L6 | ✅ | Offline Merkmale speichern → „Keine Verbindung – das ist nur mit Verbindung möglich.“ | [Bild](bilder/ipad-quer-L6-nur-online.jpg) |

### M. Rollen und Berechtigungen

| | Ergebnis | Geprüft | Bilder |
|---|---|---|---|
| M1 | ✅ | Lorina (Babypause) sieht offene Änderungen, aber keinen „Freigeben“-Knopf | [Bild](bilder/ipad-quer-M1-lorina-keine-freigabe.jpg) |
| M2 | ✅ | Büro-Konto per Kommandozeile; Klientinnen und Kurse → 403 | [Bild](bilder/ipad-quer-M2-buero.jpg) |
| M3 | ◐ | Konto anlegen, Passwort zurücksetzen (beendet Sitzungen), Konto sperren (Anmeldung abgelehnt). Backup/Wiederherstellung und Kartendaten nicht automatisiert – auf dem VPS nach BETRIEB.md prüfen. | – |

---

## So wiederholen

Gegen eine lokale Instanz mit frischen Demo-Daten (nur Test-Umgebung):

```bash
npm run build && npm run db:reset:demo
WEB_DIST=$PWD/apps/web/dist NODE_ENV=production DEMO_MODUS=ja ANMELDUNG_MAX=1000 node apps/api/dist/server.js &
# optional für A2 (Sperre): zweite Instanz mit Standardgrenze
PORT=3001 WEB_DIST=$PWD/apps/web/dist NODE_ENV=production DEMO_MODUS=ja node apps/api/dist/server.js &
cd apps/web && SPERRE_URL=http://localhost:3001 npm run walkthrough
```

Die Tests liegen in `apps/web/walkthrough/` (je Bereich eine Datei), die Screenshots landen in `docs/walkthrough-protokoll/bilder/`. Vor jedem Lauf die Demo-Daten zurücksetzen – die Abläufe ändern Daten (z. B. Versand, Vertretung, Kurse).
