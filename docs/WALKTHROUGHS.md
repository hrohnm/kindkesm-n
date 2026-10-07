# User-Walkthroughs (Stand: Meilensteine M-1 bis M-6, M10, M11, M12, M15, Akte-Ergänzung, Website)

Alle Abläufe, die mit dem aktuellen Entwicklungsstand möglich sind – als Testdrehbuch für die Demo-Umgebung und als Grundlage für weitere automatische Tests. Jeder Walkthrough hat eine Kennung, eine Ausgangslage, die Schritte und das erwartete Ergebnis.

**Legende:** 🤖 = durch einen automatischen Browser-Test (`apps/web/e2e/`) abgedeckt · 📱 = auch auf dem Handy prüfen · ⚠️ = Fehler- bzw. Grenzfall

Alle Walkthroughs sind zusätzlich als automatischer Durchlauf in `apps/web/walkthrough/` umgesetzt (`npm run walkthrough` in `apps/web`). Ergebnis, gefundene Fehler und Screenshots: [Walkthrough-Protokoll](walkthrough-protokoll/README.md).

## 0. Vorbereitung

- Demo-Daten frisch einspielen: `npm run db:reset:demo`, dann `npm run dev:neustart` (im Codespace) und im Browser einmal hart neu laden.
- Passwort aller Demo-Konten: `kindkes-demo-2026` (nur Test-Umgebung).

| Konto | Rolle / Status | Demo-Familien |
|---|---|---|
| `johanna@kindkesmoeoen.test` | Hebamme, aktiv | Lena Krüger (Ole, Spontangeburt), Sophie Berger (schwanger), Anna Schulz (Mats), Katrin Lange (Ella), Mia Neumann (schwanger) |
| `marielena@kindkesmoeoen.test` | Hebamme, aktiv | Maria Hansen (Zwillinge Paul & Emma, primäre Sectio, Risiko, Latex-Allergie), Jana Wolff (Anfrage), Laura Becker (Frieda, sekundäre Sectio), Svenja Koch (Jonas, vaginal-operativ, Englisch) |
| `lorina@kindkesmoeoen.test` | Hebamme, Babypause bis 01.03.2027 | – |

Weitere Demo-Inhalte: Touren für heute (je vier Termine bei Johanna und Marielena), Kurse „Geburtsvorbereitung am Wochenende“ (Kasse, zu zweit, ein Termin schon abgerechnet, eine offene Online-Anmeldung) und „Babymassage dienstags“ (Selbstzahler).

---

## A. Zugang und persönliche Einstellungen

**A1 Anmelden** 🤖📱
1. App öffnen → Anmeldeseite. In der Test-Umgebung einen Demo-Knopf antippen (füllt E-Mail und Passwort) oder Zugangsdaten eintippen → „Anmelden“.
- Erwartet: Startseite „Moin, Vorname!“ (bis 11 Uhr; danach „Hallo“, ab 17 Uhr „Guten Abend“) mit Datum; Navigation links (Tablet) bzw. unten (Handy).

**A2 Falsches Passwort** ⚠️
1. Falsches Passwort eingeben.
- Erwartet: Fehlermeldung. Nach 10 Fehlversuchen in 15 Minuten: Hinweis „Zu viele Versuche … einige Minuten warten“.

**A3 Abmelden**
1. Tablet: Seitenleiste unten → „Abmelden“. Handy: Einstellungen → ganz unten „Abmelden“.
- Erwartet: Anmeldeseite; Gerätedaten (Offline-Speicher) gelöscht. Gibt es noch nicht übertragene Änderungen, erscheint vorher eine Warnung (siehe L5).

**A4 Passwort ändern**
1. Einstellungen → Passwort → bisheriges und zweimal neues Passwort → Speichern.
- Erwartet: Bestätigung; neue Anmeldung mit neuem Passwort möglich. ⚠️ Abweichende Wiederholung → Feldfehler.

**A5 Mein Profil**
1. Einstellungen → Mein Profil: Name, Kürzel, Telefon, IK, ggf. „Babypause voraussichtlich bis“ → Speichern.
- Erwartet: „Gespeichert.“ – bei geänderter IK stattdessen der Hinweis, die Änderung der SVI und dem Berufsverband zu melden. IK erscheint später auf Formularen und im Versand; ohne IK verweigert die Abrechnung den Versand (H2 ⚠️).

**A6 Orte und Tourvorlagen** 📱
1. Einstellungen → Orte & Touren → Ort anlegen (Bezeichnung, Art, Anschrift „Straße Nr., PLZ Ort“, optional Abholzeit).
2. Position prüfen: Karte des Ortes öffnen → „Aus Adresse ermitteln“ oder „Auf der Karte setzen“.
3. Tourvorlage je Wochentag anlegen (Start, Ende, Abfahrt, Ende spätestens, Wegegeld ab).
- Erwartet: Position wird beim Speichern automatisch aus der Adresse gesetzt (Adressverzeichnis bzw. Online-Suche); Vorlage wird für neue Touren des Wochentags verwendet. ⚠️ Unbekannte Anschrift → verständliche Meldung, Setzen auf der Karte bleibt möglich.

**A7 Abrechnungseinstellungen**
1. Einstellungen → Abrechnung: Weg (HebSet bzw. eigene Abrechnungsstelle mit Name/Anschrift), Rhythmus und Stichtag, Erinnerung (Tage vorher), bevorzugtes Unterschriftsverfahren (Papier/Tablet) → Speichern.
- Erwartet: Fristen-Hinweise im Cockpit passen sich an; ohne Einstellungen zeigt das Cockpit „Abrechnungseinstellungen sind noch nicht hinterlegt“.

**A8 Praxisdaten**
1. Einstellungen → Praxis: Name, Praxisstandort, Telefon, E-Mail → Speichern.
- Erwartet: erscheinen auf Versandmappe, Kinderurkunde und als gemeinsamer Ort „Praxis“.

**A9 Persönliche Ansicht der Dokumentation** 🤖
1. Einstellungen → Dokumentation: Felder für Mutter und Kind ein-/ausblenden, „Vergleich mit dem letzten Besuch“ je Feld, „Kachel beim Öffnen aufgeklappt“ → Speichern. „Auf Standard zurücksetzen“ testen.
- Erwartet: Im Besuch (D1) sind ausgeblendete Felder verborgen, aber über „Weitere Felder einblenden“ erreichbar; Felder mit Wert erscheinen immer. Die Kaiserschnittnarbe ist als „(nach Kaiserschnitt)“ gekennzeichnet.

**A10 Zwei-Faktor-Anmeldung** 🤖
1. Einstellungen → Sicherheit → „Einrichten“: Passwort → QR-Code mit einer Authenticator-App scannen (oder Schlüssel abtippen) → 6-stelligen Code eingeben → „Einschalten“.
2. Wiederherstellungscodes notieren, „Ich habe die Codes gespeichert“. Abmelden und neu anmelden: nach dem Passwort wird der Code verlangt; ein Wiederherstellungscode geht auch (nur einmal).
3. „Neue Wiederherstellungscodes“ bzw. „Ausschalten“ (jeweils mit Passwort).
- Erwartet: ⚠️ Falscher Code → „Der Code ist falsch“; derselbe Code gilt nur einmal. Mit `ZWEI_FAKTOR_PFLICHT=ja` führt die App nach der Anmeldung zuerst durch die Einrichtung, Ausschalten ist dann nicht möglich.

**A11 App-Sperre** 🤖📱
1. Einstellungen → Sicherheit → „Sperren nach“ z. B. 5 Minuten; Tablet liegen lassen.
- Erwartet: Nach der Zeit ohne Bedienung verdeckt „Gesperrt“ die App; Entsperren mit dem Passwort, auch ohne Verbindung (auf diesem Gerät zuletzt verwendetes Passwort). Angefangene Eingaben bleiben erhalten. ⚠️ Falsches Passwort → Hinweis, keine Abmeldung.

**A12 Geräte abmelden und Datenexport**
1. Einstellungen → Sicherheit → „Angemeldete Geräte“: Gerät, Anmeldezeit, zuletzt aktiv; ein anderes Gerät „Abmelden“ bzw. „Alle anderen Geräte abmelden“.
2. „Export herunterladen“.
- Erwartet: Das abgemeldete Gerät landet beim nächsten Zugriff auf der Anmeldeseite (gespeicherte Daten werden gelöscht). Der Export ist eine JSON-Datei mit allen Tabellen ohne Passwörter und Zwei-Faktor-Geheimnisse; er erscheint im Protokoll.

---

## B. Startseite (Cockpit)

**B1 Tagesstart** 📱
1. Nach der Anmeldung die Startseite ansehen.
- Erwartet:
  - Kachel „Heute“ mit geplanten/erledigten Besuchen und Tour-Übersicht (Karte, nächster Besuch, „Zur Tour ›“).
  - „Offene Dokumentationen“ (Entwürfe) mit direktem Link.
  - „Fristen und Hinweise“, z. B. Abrechnungsstichtag, Ausschlussfrist 30.06., unbezahlte Versände, Regelwerk-Freigaben „wartet auf deine Freigabe“, Kinderurkunde vorbereiten (7 Tage vor Ende der 12. Lebenswoche), neue Online-Anmeldungen zu eigenen Kursen, Rückkehr aus der Babypause. Hinweise mit Link führen direkt zur passenden Seite.

**B3 Erinnerungen** 🤖
1. Startseite als Johanna: „U2 für Ole steht an (3.–10. Lebenstag) – Eltern erinnern“ → „Erledigt“.
- Erwartet: Erinnerungen für eigene bzw. vertretene Betreuungen: ET in den nächsten 14 Tagen („Wochenbett vorbereiten“), U2/U3/U4 im jeweiligen Zeitraum, Rückbildungskurs in der 8.–10. Lebenswoche (nicht, wenn schon in einem Rückbildungskurs angemeldet). „Erledigt“ blendet die Erinnerung für diese Hebamme dauerhaft aus; andere Hinweise (Fristen, Warnungen) lassen sich nicht abhaken.

**B2 Warnungen** 🤖
1. Startseite als Johanna: Hinweise „Ärztliche Anordnung fehlt: Sophie Berger“, ggf. Gewicht („… % unter dem Geburtsgewicht“) und Kontingent („… von … genutzt, noch … frei“ bzw. „ausgeschöpft“).
2. „Ärztliche Anordnung fehlt“ antippen → im Besuch „Ärztliche Anordnung liegt vor“ ankreuzen, Notiz (von wem, wann).
- Erwartet: Gewicht ab 7 % Abnahme als Hinweis, ab 10 % deutlich hervorgehoben (Link zur Wachstumsseite); nur für eigene bzw. vertretene Betreuungen. Kontingente der laufenden Phase erst, wenn nur noch 2 Kontakte (bzw. 10 % der Minuten) übrig sind; kleine Kontingente erst, wenn sie aufgebraucht sind. Nach dem Vermerk verschwindet die Anordnungs-Warnung; der Vermerk geht auch nach dem Versand.

---

## C. Klientinnen und Akte

**C1 Neue Klientin anlegen**
1. Klientinnen → „Neue Klientin“ → Name, Anschrift, Telefon, ET, zuständige Hebamme → Anlegen.
- Erwartet: Akte öffnet sich; Betreuung „Schwangerschaft“ mit ET; Position der Wohnung automatisch aus der Adresse („aus der Adresse“ bzw. „ungefähr – bitte prüfen“).

**C2 Suchen und filtern** 📱
1. Klientinnen → Suchfeld (Name oder Ort), „Alle/Meine“, Status-Filter (Laufend, Anfrage, Schwangerschaft, Wochenbett, Abgeschlossen, Alle).
- Erwartet: Liste mit Lebenstag bzw. SSW/ET, zuständigem Kürzel, Flaggen (z. B. „Risiko“), Hinweis „Vertretung durch mich“.

**C3 Stammdaten und Anschrift ändern**
1. Akte → Stammdaten „Bearbeiten“ → z. B. Versichertennummer, Kasse, IK, Anschrift → Speichern.
- Erwartet: Bei geänderter Anschrift wird die Position neu bestimmt und Wegegeld offener Tage neu berechnet. ⚠️ Versichertennummer/Kassen-IK im falschen Format → Feldfehler.

**C4 Betreuung bearbeiten**
1. Akte → Betreuung „Bearbeiten“: Status, ET, Gravida/Para, Geburtsort, **Art der Geburt** (Auswahl), **Vertretung**, Notizen → Speichern.
- Erwartet: Anzeige von SSW bzw. Lebenstag; Art der Geburt und Vertretung sichtbar.

**C5 Geburt erfassen**
1. Akte → Kinder → „Geburt / Kind erfassen“ → Vorname, Geburtsdatum/-zeit, Geschlecht, Gewicht, Länge, Kopfumfang, **Art der Geburt** → Speichern. Bei Zwillingen ein zweites Kind erfassen.
- Erwartet: Betreuung wechselt auf „Wochenbett“; Kind mit Links „Wachstum und Perzentilen ›“ und „Kinderurkunde ›“; bei Kaiserschnitt erscheint im Besuch das Feld „Kaiserschnittnarbe“ (D6).

**C6 Merkmale** 🤖
1. Akte → Merkmale „Bearbeiten“ → Flaggen (Risiko, Sozialdienst/Jugendamt, Dolmetscherin nötig, psychische Belastung, erstgebärend), Sprache, Allergien → Speichern.
- Erwartet: Abzeichen oben in der Akte und in der Liste; Allergien als rote Meldung in Akte und Besuch.

**C7 Kontakte** 🤖
1. Akte → Kontakte „+ Kontakt“ → Art (Partner/Begleitperson, Gynäkologin, Kinderärztin, Klinik, Notfall, Sonstige), Name, Telefon, E-Mail, Anschrift → Speichern; Kontakt bearbeiten und löschen.
- Erwartet: Telefon- und E-Mail-Links funktionieren.

**C8 Einwilligungen** 🤖
1. Akte (unten) → Einwilligungen → z. B. „Fotos“ → „Erfassen“ → Form „auf dem Tablet unterschrieben“ → unterschreiben → „Einwilligung erteilt“.
2. Andere Einwilligung schriftlich/mündlich erfassen; später „Widerrufen“ mit Datum.
- Erwartet: Status „✓ erteilt TT.MM.JJJJ · Form“ bzw. „widerrufen TT.MM.JJJJ“; Unterschrift bleibt sichtbar; jede Änderung im Protokoll. ⚠️ Tablet ohne Unterschrift → Knopf bleibt gesperrt.

**C9 Wohnung auf der Karte**
1. Akte (unten) → „Aus Adresse ermitteln“ bzw. „Position korrigieren“ → auf die Haustür tippen.
- Erwartet: Position gespeichert („von Hand gesetzt“), Wegegeld neu berechnet. ⚠️ „Aus Adresse ermitteln“ findet die Anschrift nicht → Meldung, bisherige Position bleibt. Wurde die Anschrift in den Stammdaten auf eine unauffindbare Adresse geändert, wird die alte Position verworfen (sonst falsches Wegegeld) – dann auf der Karte setzen.

**C10 Vertretung**
1. Als Johanna bei Lena Krüger Vertretung = Marielena eintragen (C4).
2. Als Marielena anmelden → Klientinnen → „Meine“.
- Erwartet: Lena Krüger erscheint bei Marielena mit „Vertretung durch mich“.

**C11 Formular für die Mappe der Familie drucken**
1. Akte → Betreuung → „Formular 3.1 drucken“ (Schwangerschaft) bzw. „3.3“ (nach der Geburt).
- Erwartet: Amtliches Formular als PDF mit vorausgefülltem Kopf (für Papier-Unterschriften).

**C12 Kontingente und Besuchsliste**
1. Akte → Kontingente und Besuche ansehen.
- Erwartet: Kontingentbalken (z. B. „2 von 20 Kontakte“, bei Kursen in Minuten); Besuche mit Leistung, Art, GPOS, Minuten, Betrag, Unterschriftsart; Kurseinheiten führen zum Kurstermin.

---

## D. Besuch dokumentieren

**D1 Wochenbett-Hausbesuch aus der Tour (Papier-Unterschrift)** 🤖📱
1. Tour → Termin → „Dokumentieren“ (Datum und Leistung sind vorbelegt).
2. Beginn/Ende („Jetzt“-Knöpfe), Kacheln Mutter und Kind aufklappen, Werte eintragen (Zuletzt-Werte erscheinen zum Vergleich), Notiz.
3. Kopfzeile: Abrechnung prüfen (Minuten, GPOS, Betrag, Hinweise; „▼ Einzelheiten“).
4. Unterschrift: Formularzeile abschreiben, Häkchen „Die Versicherte hat die Zeile … unterschrieben“ → „Abschließen“.
- Erwartet: zurück zur Tour, Termin „✓“ erledigt, Besuch in der Akte „✓ Papier-Unterschrift“; Wegegeld des Tages aktualisiert.

- Ergänzung: Solange „Ende“ leer ist, zeigt der Besuch „Besuch läuft seit … Min.“; „Stopp“ setzt das Ende auf jetzt.

**D2 Besuch mit Tablet-Unterschrift** 🤖
1. Akte → „Besuch dokumentieren“ → Leistung erfassen → „Stattdessen auf dem Tablet“ → unterschreiben lassen → „Abschließen“.
- Erwartet: Besuch „✓ Tablet-Unterschrift“; erscheint im Versand als Eigendruck auf dem amtlichen Formular.

**D3 Vorsorge bzw. Leistung in der Praxis mit Material**
1. Bei einer Schwangeren (Sophie Berger) Besuch öffnen → Art „In der Praxis“, Leistung „Vorsorgeuntersuchung“, Material (z. B. Material Vorsorge) wählen.
- Erwartet: Materialpauschale in der Abrechnung; kein Wegegeld.

**D4 Entwurf, Weiterdokumentieren, Löschen**
1. Besuch nur als „Entwurf“ speichern (zurück in Akte bzw. Tour) → Startseite „Offene Dokumentationen“ → weiter dokumentieren → abschließen; einen anderen Entwurf „Löschen“.
- Erwartet: Entwürfe sind nicht abrechenbar; Löschen nur bei Entwürfen.

**D5 Prüfhinweise der Abrechnung** ⚠️
1. Fälle ausprobieren: Ende vor Beginn (über Mitternacht ist bis 12 Stunden erlaubt, z. B. 23:30–00:20), Beginn = Ende, sehr lange Dauer, Kontingent ausgeschöpft, Wochenbett-Leistung vor der Geburt, Abschließen ohne Unterschrift.
- Erwartet: rote Fehler bzw. gelbe Hinweise im Kopf; „Abschließen“ wird bei Fehlern bzw. fehlender Unterschrift abgelehnt.

**D6 Kaiserschnittnarbe und Mehrfachauswahl** 🤖
1. Laura Becker (sekundäre Sectio) → Besuch → Kachel Mutter: „Kaiserschnittnarbe“ mit mehreren Werten (z. B. reizlos + Fäden/Klammern entfernt), Brust „gefüllt“ + „wunde Mamillen“.
2. Kachel zuklappen; zum Vergleich Svenja Koch (vaginal-operativ) öffnen.
- Erwartet: Mehrere Chips mit ✓; Kurzfassung zeigt alle Werte; bei Svenja Koch kein Narbenfeld. Fundus bleibt Einzelauswahl.

**D7 Wachstum aus dem Besuch**
1. Kachel Kind → „Wachstum“ → Reiter Gewicht/Länge/Kopfumfang; Fenster schließen (✕ oder Esc).
- Erwartet: Kurve inkl. des gerade eingetragenen (noch nicht gespeicherten) Werts; Besuchsformular bleibt unverändert.

**D8 Abgeschlossenen Besuch korrigieren** ⚠️
1. Abgeschlossenen Besuch öffnen → Dokumentation ändern → „Änderungen speichern“.
- Erwartet: Datum, Zeiten und Leistung sind gesperrt (§ 12); frühere Fassung bleibt als Version erhalten. Ist der Besuch schon einem Versand zugeordnet, wird die Änderung abgelehnt.

**D9 Besuch einer Kollegin** ⚠️
1. Als Marielena einen Besuch von Johanna öffnen (z. B. über die Akte einer vertretenen Familie).
- Erwartet: nur lesbar, Hinweis „von einer Kollegin dokumentiert“.

---

## E. Wachstum und Kinderurkunde

**E1 Wachstumsseite** 🤖
1. Akte → Kind → „Wachstum und Perzentilen ›“ → Reiter Gewicht, Länge, Kopfumfang; Punkte antippen.
- Erwartet: WHO-Perzentilkurven (P3–P97), Kennzahlen (tiefster Wert, Geburtsgewicht wieder erreicht, Perzentile), Tabelle mit Veränderung und Herkunft (Geburt/Besuch/Entwurf).

**E2 Kinderurkunde gestalten** 🤖
1. Akte → Kind → „Kinderurkunde ›“ (z. B. Frieda Becker).
2. Gestaltung (Kindkesmöön, Ostsee, Leuchtturm, Schlicht), Titel, Textvorlage (warm, kurz, plattdeutsch, Mehrlinge, Geschwister), Text anpassen.
3. Tabelle: Alle / Nur Wochenwerte / einzelne Zeilen, „Besonderes“ ergänzen; Meilensteine hinzufügen; Optionen (Kurven für Gewicht, Größe, Kopfumfang, Perzentilen, Sternzeichen, Unterschrift, Kurs-Hinweis).
4. „PDF-Vorschau“ → „Entwurf speichern“ bzw. „Fertig“ → „Gespeichertes PDF öffnen“ und drucken.
- Erwartet: Zweiseitige Urkunde (Kindkesmöön: Seite 2 „Dein Wachstum“); Status in der Akte gespeichert.

**E3 Urkunde ohne Einwilligung** ⚠️
1. Urkunde einer Familie ohne erfasste Einwilligung „Kinderurkunde“ öffnen.
- Erwartet: Hinweis mit Link „In der Akte unter Einwilligungen erfassen“; Erstellen bleibt möglich.

**E4 Erinnerung im Cockpit**
1. Kind, dessen 12. Lebenswoche in ≤ 7 Tagen endet (Testkind mit Geburtsdatum vor ca. 80 Tagen anlegen).
- Erwartet: Hinweis „Kinderurkunde für … vorbereiten“ mit Link; verschwindet, sobald die Urkunde „Fertig“ ist.

---

## F. Tourenplanung

**F1 Tag planen** 🤖📱
1. Tour → Tag wählen (‹ ›, Datumsfeld, „Heute“) → „Besuch einplanen“ → Familie, Zeit (feste Uhrzeit / Zeitfenster / vormittags / nachmittags / flexibel), Dauer, Leistung, „muss heute“, Notiz → „Termin anlegen“. Vorschläge (fällige Familien) übernehmen.
2. „Route optimieren“.
- Erwartet: Reihenfolge mit Ankunftszeiten, Karte mit Route, Strecke/Fahrzeit/Besuchszeit; feste Zeiten werden eingehalten.

**F2 Start, Ziel und Zeiten**
1. Start-/Zielzeile „bearbeiten“ → Start/Ziel-Ort, Abfahrt, Ankunft spätestens, Puffer, Wegegeld ab → speichern.
- Erwartet: Neuberechnung; Hinweis, wenn „Ankunft spätestens“ überschritten wird.

**F3 Unterwegs** 📱
1. Am Termin „Apple Karten“ / „Google Maps“ / „Anrufen“.
- Erwartet: Navigation bzw. Anruf öffnet sich.

**F4 Termine ändern** ⚠️
1. Reihenfolge mit ↑/↓, Termin bearbeiten, auf einen anderen Tag verschieben, absagen (mit Besuch) bzw. löschen (ohne Besuch).
- Erwartet: Tour als „Entwurf“; heute und sobald ein Besuch erledigt ist, steht „Ab jetzt neu berechnen“ bereit. Abgesagte Termine stehen unter „Abgesagt (n)“ und lassen sich wieder einplanen.

**F5 Tour abschließen und Fahrtenbuch** 🤖
1. „Tour bestätigen“ → „Ins Fahrtenbuch“ → „Fahrtenbuch öffnen“.
- Erwartet: Fahrtenbuch-Eintrag des Tages mit Hausbesuchen und km.

**F6 Wegegeld prüfen** ⚠️
1. Tour unten: Wegegeld-Tabelle (50100/50200, km je Familie; erscheint, sobald an dem Tag ein Hausbesuch abgeschlossen ist). Familie über 25 km → Begründung eintragen; „Gesamtstrecke von Hand (km)“ testen.
- Erwartet: Wegegeld-Leistungen aktualisiert; gesperrt, sobald der Tag versendet ist.

---

## G. Fahrtenbuch

**G1 Fahrtenbuch führen** 🤖
1. Fahrtenbuch → Monat wählen → Eintrag bearbeiten (km-Stand Beginn/Ende, km dienstlich/privat/Wohnung–Praxis, Zweck, Strecke) → Speichern.
2. Export „CSV (Excel)“ und „PDF“ (Monat bzw. Jahr).
- Erwartet: Summen je Monat; Exporte enthalten alle Pflichtangaben.

---

## H. Abrechnung

**H1 Offene Fälle prüfen** 🤖
1. Abrechnung → offene Fälle bis Datum → je Patientin „▼ Einzelaufstellung“.
- Erwartet: Fälle mit Summen und Prüfung; die Einzelaufstellung zeigt je Besuch (Datum, Zeit, Leistung, Unterschrift, Zwischensumme) die Gebührenpositionen mit Menge, Einzelbetrag und Betrag, inkl. Material, Zuschlägen und Wegegeld; dieselbe Aufstellung gibt es je Versand (dort mit Kürzungen); ⚠️ fehlende Versichertennummer/Kassen-IK/Anschrift rot (Fall wird beim Versand ausgelassen), Kontingent-Hinweise gelb.

**H2 Versand vorbereiten** 🤖
1. „Versand vorbereiten“ → „Versandmappe (PDF)“ öffnen.
- Erwartet: Deckblatt, je Fall Abrechnungsdatenblatt mit Kontrollliste (Papier-Originale), Eigendruck-Formulare 3.1/3.3/3.4 für Tablet-Unterschriften. ⚠️ Ohne IK → Fehlermeldung; bei Selbstabrechnung zweiter Versand im Monat → Warnung.

**H3 Versendet melden**
1. Versand → „versendet“ → Datum, Einschreiben-Nr.
- Erwartet: Leistungen gesperrt; nach 6 Wochen ohne Zahlung Hinweis im Cockpit.

**H4 Zahlung mit Kürzung**
1. Versand → „bezahlt“ → Zahlungseingang, ggf. Kürzung je Leistung mit Grund.
- Erwartet: Versand bezahlt, ausgezahlter Betrag sichtbar.

**H5 Versand auflösen** ⚠️
1. Vorbereiteten (nicht versendeten) Versand auflösen.
- Erwartet: Leistungen wieder offen; bei versendeten Versänden nicht möglich.

---

## I. Kurse

**I1 Kurs anlegen** 📱
1. Kurse → „Kurs anlegen“ → Titel, Kursart, Abrechnung (Krankenkasse/Selbstzahler), Gruppe oder Einzelunterweisung, Ort, Plätze, Preis/Partnergebühr, Kursleitung (eine oder zwei Hebammen), Beschreibung, Online-Anmeldung → anlegen.
2. „+ Termine“: erster Termin, Uhrzeit, Format (Präsenz, digital, Video), „Rechnet ab“, Anzahl und Abstand (Serie), Thema.
- Erwartet: Kurs mit Terminliste, Platzanzeige, Status.

**I2 Teilnehmerinnen verwalten**
1. „+ Teilnehmerin“ aus der Akte oder ohne Akte; bei vollem Kurs automatisch Warteliste.
2. „Bestätigen“, „Nachrücken“, „Stornieren“, „bezahlt“ (Selbstzahler), „Akte zuordnen …“.
- Erwartet: Bei vollem Kurs Hinweis „auf die Warteliste gesetzt“, Eintrag sofort unter „Warteliste“. ⚠️ Nachrücken bei vollem Kurs wird abgelehnt; Kassenkurse zeigen „keine Akte“ in Rot.

**I3 Online-Anmeldung** 🤖📱
1. Ohne Anmeldung `/anmeldung` öffnen (z. B. privates Fenster) → Kurs wählen → Formular mit Einwilligung → „Verbindlich anmelden“ bzw. „Auf die Warteliste“.
2. Als Kursleiterin: Cockpit-Hinweis „neue Online-Anmeldung“ → Kurs → „Bestätigen“ → ggf. Akte zuordnen.
- Erwartet: Nur freigeschaltete Kurse, keine Namen anderer; ⚠️ ohne Einwilligung Fehlermeldung.

**I4 Anwesenheit und Kassenabrechnung** 🤖
1. Kurs → Termin → „Anwesenheit“ → Teilnehmerinnen abhaken, je Versicherte auf dem Tablet oder auf Papier unterschreiben → „Termin abschließen“.
- Erwartet: Rückmeldung nach dem Abschließen bleibt stehen; je Versicherte eine Kurseinheit (Minuten, Betrag, Kontingent 14 h / 10 h, Selbstlern-Anteil); erscheint in der Akte und im nächsten Versand auf Formular 3.4. ⚠️ Ohne Akte bzw. Rückbildung nach dem 9. Monat → Hinweis, keine Abrechnung.

**I5 Selbstzahlerkurs**
1. „Babymassage dienstags“: Teilnehmerinnen, „bezahlt“ abhaken, Anwesenheit.
- Erwartet: keine Kassenleistung; Rechnungen folgen mit M13.

---

## J. Regelwerk (Vier-Augen-Prinzip)

**J1 Regelwerk ansehen**
1. Regelwerk → Fassung wählen, Kategorie (Auswahl), Suche nach GPOS/Text; Selbstzahler-Preisliste.
- Erwartet: Positionen mit Beträgen, Kontingenten, Formularzuordnung.

**J2 Änderung vorschlagen und freigeben** 🤖
1. Als Marielena: Position bzw. Kontingent bearbeiten → Kurzbeschreibung und Begründung → vorschlagen → „Im Testrechner prüfen“ (Vorher/Nachher).
2. Als Johanna: Cockpit-Hinweis „wartet auf deine Freigabe“ → freigeben oder ablehnen (mit Kommentar).
- Erwartet: Wirksam erst nach Freigabe durch eine andere aktive Hebamme. ⚠️ Eigene Vorschläge und Hebammen in Babypause (Lorina) können nicht freigeben; geänderte Grundlage → Konfliktmeldung.

**J3 Neue Position, neues Kontingent, CSV**
1. „+ neue Position“ bzw. Kontingent anlegen; Positionen als CSV exportieren, bearbeiten, importieren (Vorschau → Vorschlag).
- Erwartet: Alles läuft als Vorschlag mit Freigabe.

**J4 Eigene Selbstzahler-Preise** 🤖
1. Selbstzahler-Leistung → „Mein Preis (€)“.
- Erwartet: eigener Preis je Hebamme; Praxispreise ändern nur mit Freigabe.

**J5 Fassung freigeben / neue Fassung**
1. „Fassung freigeben“ (Startbelegung) bzw. neue Fassung ab Datum anlegen.
- Erwartet: Nach einem Versand ist eine Fassung inhaltlich gesperrt; Korrekturen über neue Fassung.

---

## K. Team

**K1 Team ansehen** 🤖
1. Team → Mitglieder mit Status (aktiv/Babypause bis …), Kontaktdaten, „IK hinterlegt“.
- Erwartet: Lorina mit Babypause-Hinweis; Rückkehr 90 Tage vorher im Cockpit.

---

## L. Offline-Betrieb

**L1 Für unterwegs laden** 🤖
1. Einstellungen → Offline → „Für unterwegs laden“ (passiert auch automatisch beim Start und stündlich).
- Erwartet: Meldung „… Datensätze für heute und morgen gespeichert“, Zeitpunkt sichtbar.

**L2 Besuch im Funkloch** 🤖📱
1. Verbindung trennen (Flugmodus bzw. Browser-Werkzeuge „Offline“) → Tour → Besuch dokumentieren und abschließen.
2. Verbindung wiederherstellen.
- Erwartet: „Ohne Verbindung gespeichert …“, Statusleiste „Offline – 1 Änderung warten“, Termin „offline dokumentiert“, Abrechnung „vorläufig (offline)“; nach der Rückkehr automatische Übertragung, Termin erledigt.

**L3 App ohne Netz öffnen** 🤖
1. Offline die App neu laden bzw. vom Homescreen öffnen.
- Erwartet: App startet, Anmeldung bleibt, gespeicherte Daten sichtbar („Stand HH:MM“).

**L4 Konflikt zwischen zwei Geräten** ⚠️
1. Denselben Besuch auf Gerät A offline ändern, auf Gerät B online dasselbe Feld anders ändern; Gerät A wieder online.
- Erwartet: Verschiedene Felder werden automatisch zusammengeführt; gleiches Feld → Statusleiste „Konflikt“, Einstellungen → Offline zeigt beide Werte → „Diese Fassung übernehmen“ oder „Andere Fassung behalten“.

**L5 Abmelden mit offenen Änderungen** ⚠️
1. Offline eine Änderung speichern, dann abmelden.
- Erwartet: Warnung, dass Änderungen verloren gehen; nach Bestätigung werden Gerätedaten gelöscht.

**L6 Nur online mögliche Aktionen** ⚠️
1. Offline z. B. Akte bearbeiten, Tour planen oder Versand vorbereiten.
- Erwartet: Meldung „Keine Verbindung – das ist nur mit Verbindung möglich.“

---

## M. Rollen und Berechtigungen

**M1 Hebamme in Babypause** ⚠️
1. Als Lorina anmelden.
- Erwartet: Anmeldung möglich, Fälle sichtbar; Regelwerk-Freigaben nicht möglich.

**M2 Büro-Konto** ⚠️
1. Konto mit Rolle „buero“ per CLI anlegen (siehe M3) und anmelden.
- Erwartet: keine Gesundheitsdaten (Klientinnen, Besuche, Kurse liefern „nur für Hebammen“).

**M3 Betrieb (Server, Kommandozeile)**
1. Konto anlegen, Passwort zurücksetzen, Konto sperren (`docs/BETRIEB.md`, Abschnitt 3); Demo-Daten zurücksetzen; Kartendaten einrichten (5a); Backup und Wiederherstellung (5).
- Erwartet: Gesperrte Konten können sich nicht anmelden; Passwort-Reset beendet alle Sitzungen.

---

## N. Anfragen und Belegungsplan (M11)

**N1 Anfrage über die Website** 🤖📱
1. Website → Kontakt → „Betreuung anfragen“: Name, ET, Wohnort (Vorschläge aus dem Betreuungsgebiet), E-Mail oder Telefon, erstes Kind, Wünsche, Nachricht, Einwilligung → „Anfrage senden“.
- Erwartet: „Vielen Dank!“. ⚠️ Ohne Einwilligung, ohne Kontaktweg oder mit ausgefülltem Honigtopf → Fehlermeldung bzw. Ablehnung; mehr als 5 Anfragen je Stunde und IP → Hinweis „zu viele Anfragen“.

**N2 Anfrage prüfen und zusagen** 🤖
1. Cockpit-Hinweis „neue Betreuungsanfrage(n)“ → Anfragen → Anfrage öffnen.
2. Vorschlag ansehen (freie Plätze im ET-Monat, Abwesenheit rund um den ET, Entfernung) → bei der passenden Hebamme „Zusagen“.
- Erwartet: Akte mit Betreuung (Schwangerschaft, ET, zuständige Hebamme, „Erstgebärend“ bei erstem Kind, Wünsche in den Notizen) öffnet sich; Anfrage „Zugesagt“; im Belegungsplan zählt die Familie.

**N3 Telefonische Anfrage, Warteliste, Absage**
1. Anfragen → „Anfrage erfassen“ → speichern; Notiz eintragen → „Warteliste“; später „Absagen“ oder „Weitergeleitet“ (mit Notiz).
2. „Antwort per E-Mail“: Vorlage Zusage / Warteliste / Absage öffnet das E-Mail-Programm.
- Erwartet: Status je Gruppe (Offen, Warteliste, Erledigt). ⚠️ „Weitergeleitet“ ohne Notiz → Fehler; zugesagte Anfragen lassen sich nicht mehr absagen. Abgeschlossene Anfragen werden nach 6 Monaten automatisch gelöscht.

**N4 Belegungsplan und Abwesenheiten** 🤖
1. Anfragen → „Belegungsplan“ (Handy: Einstellungen → Belegungsplan): je ET-Monat und Hebamme „belegt / Kapazität“ mit Ampel, Praxis gesamt, offene Anfragen; ‹ / › blättern.
2. Eigene Abwesenheit (Urlaub, Fortbildung …) eintragen bzw. löschen; Kapazität unter Einstellungen → Mein Profil → „Wochenbetten pro Monat“ ändern.
- Erwartet: Abwesenheit und Babypause kürzen die Kapazität anteilig; Lorina erscheint bis zum Ende der Babypause als „abwesend“.

**N5 Kapazitätsampel und Team-Status auf der Website** 📱
1. Website-Startseite und Kontakt: „Freie Plätze nach Entbindungstermin“; Seite „Die Hebammen“.
- Erwartet: je Monat „frei“, „wenige Plätze“ oder „ausgebucht“ (ohne Zahlen); Lorina „in Babypause, voraussichtlich zurück im …“ – beides live aus der App.

**N6 Rückrufwunsch** 🤖📱
1. Website → Kontakt → „Wir rufen dich zurück“ (oder Startseite „Rückruf wünschen“): Name, Telefon, Anliegen, Wunsch-Hebamme, Zeitfenster, Einwilligung → „Rückruf anfordern“.
2. App: Cockpit-Hinweis „n Rückrufwünsche (1 für dich)“ → Anfragen, Abschnitt „Rückrufwünsche“.
3. Nummer antippen (ruft an), „Nicht erreicht“ mit Notiz, später „Erreicht – erledigt“; bei Anliegen „Hebammenbetreuung“ „Als Betreuungsanfrage erfassen“.
- Erwartet: Karte mit Anliegen, Zeitfenster („passt jetzt“ im Zeitfenster), Wunsch-Hebamme und Nachricht; Versuche werden gezählt. „Als Betreuungsanfrage erfassen“ füllt Name/Telefon/Nachricht vor, nach dem Speichern öffnet sich die Anfrage und der Rückruf ist erledigt („Erledigte“ aufklappen, „Wieder öffnen“ möglich). Erledigte Rückrufe verschwinden nach 30 Tagen. ⚠️ Ohne Telefonnummer oder Einwilligung Fehlermeldung auf der Website. Demo: „Lotta Stillfrage“ (Wunsch Marielena) und „Svenja Neuhaus“ (Betreuung).

---

## O. Website (öffentlich)

**O1 Rundgang** 📱
1. Start, Die Hebammen, Die Praxis, Leistungen, Kurse, Fragen, Kontakt, Impressum, Datenschutz, Bildnachweis; Handy-Menü und feste Leiste „Betreuung anfragen“.
- Erwartet: keine Cookies, keine Inhalte von Drittanbietern; Kartendienste nur per Klick.

**O2 Kurse und Anmeldung** 🤖
1. Website → Kurse: aktuelle Termine mit freien Plätzen, Filter nach Kursart, „Alle Termine“ aufklappen → „Anmelden“.
2. Im Dialog Name, E-Mail, ggf. ET bzw. Geburtsdatum des Kindes, Krankenkasse (nur Kassenkurse), Begleitperson (nur mit Partnergebühr) und Einwilligung → „Verbindlich anmelden“.
3. Dasselbe noch einmal mit derselben E-Mail; Direktlink `/kurse?kurs=<id>` aufrufen.
4. In der App als Kursleiterin: Cockpit-Hinweis „neue Online-Anmeldung“ → Kurs.
- Erwartet: Danke-Meldung im Dialog, freie Plätze sinken sofort; bei vollem Kurs „Warteliste“. Zweite Anmeldung: „schon angemeldet“, kein doppelter Eintrag. Direktlink öffnet das Formular des Kurses. ⚠️ Ohne Name/E-Mail/Einwilligung Fehlermeldung im Dialog. Die Anmeldeseite der App (`/anmeldung`) bleibt für alte Links erhalten.

**O3 Alte Adressen** ⚠️
1. Alte Wix-Adressen aufrufen (z. B. `/hebammen-team`, `/kopie-von-leistungen`).
- Erwartet: dauerhafte Weiterleitung (301) auf die neue Seite.

---

## P. Bekannte Lücken (noch kein Walkthrough möglich)

E-Mail-Versand (Kursbestätigungen, Urkunde per Mail), Selbstzahler-Rechnungen (M13), Fotos (M17), Teamkalender und Kalender-Abo (M5), Vorlagen und Briefe (M18), Statistik (M22), TI-Anbindung (M24), Hebamio-Import.
