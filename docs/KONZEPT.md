# Konzept: Praxis-App „Kindkesmöön“

**Eigene Software für die Hebammenpraxis Kindkesmöön, Bad Doberan**
Stand: 01.10.2026 · Version 1.1 (Entwurf)

---

## Inhalt

1. [Ausgangslage](#1-ausgangslage)
2. [Recherche: Was Hebamio kann](#2-recherche-was-hebamio-kann)
3. [Recherche: Abrechnung über HebSet](#3-recherche-abrechnung-über-hebset)
4. [Rechtlicher und fachlicher Rahmen](#4-rechtlicher-und-fachlicher-rahmen)
5. [Ziele und Leitprinzipien der neuen App](#5-ziele-und-leitprinzipien-der-neuen-app)
6. [Modulübersicht](#6-modulübersicht)
7. [Module im Detail](#7-module-im-detail)
8. [HebSet-Übertragung: Konzept](#8-hebset-übertragung-konzept)
9. [Routenplanung: Konzept](#9-routenplanung-konzept)
10. [Kinderurkunde: Konzept](#10-kinderurkunde-konzept)
11. [UX: Tablet zuerst, Handy gleichwertig](#11-ux-tablet-zuerst-handy-gleichwertig)
12. [Technische Architektur](#12-technische-architektur)
13. [Datenschutz und Sicherheit](#13-datenschutz-und-sicherheit)
14. [Datenmodell (Kern)](#14-datenmodell-kern)
15. [Umsetzungsplan und Roadmap](#15-umsetzungsplan-und-roadmap)
16. [Kosten und Wirtschaftlichkeit](#16-kosten-und-wirtschaftlichkeit)
17. [Offene Fragen](#17-offene-fragen)
18. [Quellen](#18-quellen)

---

## 1. Ausgangslage

| | |
|---|---|
| **Praxis** | Hebammenpraxis Kindkesmöön, Neue Reihe 46b, 18209 Bad Doberan (Plattdeutsch: „Kindkes“ = Baby, „Möön“ = Tante; alte norddeutsche Bezeichnung für die Hebamme) |
| **Team** | **Marielena Pontus** (Hebamme) · **Johanna Mede** (Hebamme) · **Lorina Gosemann** (Hebamme, aktuell in Babypause). Gemeinsame Ausbildung 2014–2017; evidenzbasiertes Arbeiten und regelmäßige Fortbildung sind Teil des Selbstverständnisses. Kurse (z. B. Geburtsvorbereitung am Wochenende) werden teils zu zweit geleitet. |
| **Einzugsgebiet** | Bad Doberan, Rostock, Börgerende-Rethwisch, Kröpelin und weitere Gemeinden im Landkreis Rostock. Das bedeutet viele Hausbesuche und lange Fahrten über Land. |
| **Leistungen** | Schwangerschaftsvorsorge, Schwangerschaftsmassage, Wochenbettbetreuung, Geburtsvorbereitungskurse, Babymassage, Eltern-Kind-Kurse, Akupunktur, Kinesio-Taping |
| **Software heute** | Hebamio (webbasiert, Jahreslizenz) |
| **Abrechnung heute** | HebSet KG (Abrechnungszentrum, 3 % der erstatteten Leistungen) |
| **Online-Präsenz** | Website mit Kontaktformular, Instagram @hebammenpraxis_kindkesmoen |

**Wichtigste Erkenntnis aus der Recherche:** Die Praxis bezahlt heute doppelt für die Abrechnung, einmal über die Hebamio-Lizenz (die eigene Kassenabrechnung ist ab dem Basic-Tarif enthalten) und einmal über die 3 % an HebSet. HebSet nimmt Leistungen laut eigener Website **auf Papier** an, über Durchschreibesätze bzw. personalisierte Kopiervorlagen. Einen digitalen Weg von Hebamio zu HebSet gibt es nach den Hebamio-AGB nur „postalisch“. Die neue App bleibt beim Papierweg, füllt die Belege aber vollständig automatisch als PDF aus (siehe [Kapitel 8](#8-hebset-übertragung-konzept)).

---

## 2. Recherche: Was Hebamio kann

Hebamio (Somedio Software GmbH) ist eine reine Web-Anwendung ohne Installation. Sie läuft im Browser auf Mac, Windows, Tablet und Handy; empfohlen wird Chrome. Laut Hebamio arbeiten rund 30 % der Nutzerinnen nur mobil.

### 2.1 Funktionsumfang

| Bereich | Funktionen |
|---|---|
| **Betreutenverwaltung** | Klientinnen, Kinder, Schwangerschaften; Betreuungsliste; „Cockpit“ als zentrale Übersicht; Flaggensystem für Auffälligkeiten; Felder ausblendbar; Bonusfelder |
| **Dokumentation** | Schwangerschaft, Geburt (Haus-, Beleg-, Praxisgeburt), Wochenbett; Apgar-Berechnung; Arztbrief; handschriftliche Dokumentation (Stift); individuelle Vorlagen |
| **Abrechnung** | Eigene elektronische Abrechnung mit allen Kassen (Hebamio ist selbst zertifizierte Abrechnungsstelle) **oder** Weitergabe an Abrechnungspartner (HebSet nur postalisch); Plausibilitätsprüfungen; Sammelrechnungen; Zusatz- und IGeL-Leistungen; Positionsübersichten; Liste „nicht abgerechnete Betreute“ |
| **eLB** | Elektronische Leistungsbestätigung: Die Versicherte bestätigt die Leistung mit einem Klick in der Kassen-App statt per Unterschriftenzettel (Start mit IKK classic über Davaso) |
| **Finanzen** | Dashboard mit Grafiken; Bilanz; automatische Einnahmen-Überschuss-Rechnung (EÜR) |
| **Fahrten** | Fahrtenbuch; Kilometergeld wird automatisch berechnet, sobald Kilometer eingetragen sind (**keine** Routenplanung) |
| **Termine** | Terminplanung, Teamkalender, Erinnerungsfunktionen |
| **Kurse** | Kurstypen, Kursorte, Teilnehmerinnen; Mini-Homepage mit Online-Anmeldung (z. B. `name.hebamio.de/anmeldung`) |
| **Team/Praxis** | Gemeinsame Akten, Teamkalender, Rollen (Praxis-Tarif ab 4 Hebammen) |
| **QM** | Digitales QM-Handbuch, Standards, Leistungsbeschreibungen, Fortbildungsplan, Medikamentenverwaltung |
| **Material** | Material- und Formularverwaltung |
| **Statistik** | Statistiken und Auswertungen |
| **TI** | Telematikinfrastruktur gegen Aufpreis |
| **Sonstiges** | Datenübernahme aus Altsystemen (Stammdaten, keine Rechnungen); „Babypause-Modus“; Hebamio-Akademie (Schulungen); persönlicher Verschlüsselungsschlüssel, der nicht zurückgesetzt werden kann |

### 2.2 Preise (Stand Recherche)

| Tarif | Preis/Jahr | Inhalt |
|---|---|---|
| Starter | 445 € | Dokumentation und Verwaltung |
| Basic | 599 € | + Abrechnung mit allen Kassen |
| Pro | 699 € | + Geburtsdokumentation, Kursverwaltung, Finanzen |
| Praxis | 2.395 € | Team ab 4 Hebammen, gemeinsame Akten, Priority-Support |
| Add-ons | 79 €/Jahr Langzeitarchiv; TI gegen Aufpreis | |

Keine Provision, jährliche Anpassung an die Inflation, 30 Tage Testzeitraum. Nach einer Kündigung werden die Daten nach 3 Monaten gelöscht.

### 2.3 Lücken bei Hebamio (Chancen für die eigene App)

- **Keine Routenplanung.** Kilometer werden nur nachträglich erfasst.
- **Keine digitale Brücke zu HebSet.** Die Daten werden doppelt erfasst bzw. auf Papier übertragen.
- **Offline nur eingeschränkt** (auf Apple-Geräten mit Einschränkungen bei Formularen). Im ländlichen Landkreis Rostock mit Funklöchern ist das ein echter Nachteil.
- **Kein Klientinnen-Portal** (Eltern sehen weder Termine noch Gewichtsverlauf oder Infomaterial).
- **Keine Kinderurkunde / kein Erinnerungsdokument** für Familien.
- **Kein Kapazitäts- bzw. Belegungsplan nach Entbindungstermin**, mit dem sich Anfragen fair auf drei Hebammen verteilen lassen.
- **Allgemeine Software**: Branding, Texte und Abläufe lassen sich nicht vollständig auf Kindkesmöön zuschneiden.

---

## 3. Recherche: Abrechnung über HebSet

### 3.1 Wie HebSet heute arbeitet

| Aspekt | Erkenntnis |
|---|---|
| **Anbieter** | hebset KG, Lindauer Str. 38, 86845 Großaitingen; info@hebset.de; Tel. 08203 – 95 98 85 / 46 230-0 |
| **Leistung** | Rechnungserstellung nach gültigem Hebammenhilfevertrag, Kontrolle der Belege, Versand an Kassen und Privatversicherte, tägliche Zahlungsüberwachung, vorgerichtliches Mahnverfahren, Korrespondenz, Porto und Telefon inklusive |
| **Kosten** | 3 % der erstatteten Leistungen (Neukundinnen im 1. Jahr 2,5 %); zahlt die Kasse nicht, fallen keine Kosten an |
| **Auszahlung** | In der Regel zweimal pro Monat |
| **Pool-Abrechnung** | Ohne Aufpreis; Aufteilung nach geleisteten Stunden, Zusatzleistungen nach individueller Vereinbarung. **Für eine Praxis mit 3 Hebammen relevant.** |
| **Auswertungen** | Regelmäßige betriebswirtschaftliche Auswertungen und Statistiken |
| **Einreichung** | **Papier**: Durchschreibesätze (25er-Blöcke), Original an HebSet, Durchschlag bleibt bei der Hebamme. Alternativ personalisierte Kopiervorlagen |
| **Formulare** | 3.1 Schwangerschaft · 3.2 Außerklinische Geburt · 3.3 Wochenbett · 3.4 Kurse · 3.5 Beleghebamme · Zusatzbogen „Zusätzliche Leistungen“ |
| **Technik** | „HebSet Print“: mobiles Kartenlesegerät und Etikettendrucker per Bluetooth an der App (iOS/Android). Die eGK wird eingelesen (nur gesetzlich Versicherte) und Patientinnen-Etiketten werden gedruckt, die auf die Formulare geklebt werden |
| **Schnittstellen** | **Auf der Website ist keine digitale Schnittstelle dokumentiert** (kein Upload, kein Datenformat, keine Software-Kooperation außer Qualitas QM) |

### 3.2 Was ein HebSet-Beleg enthalten muss (abgeleitet)

Aus den Formularen und dem Hebammenhilfevertrag (seit 01.11.2025) ergibt sich, was pro Leistung erfasst werden muss:

- **Versichertendaten**: Name, Geburtsdatum, Anschrift, Kasse/IK-Nummer, Versichertennummer, Status. Das ist der Inhalt des Etiketts.
- **Kind** (beim Wochenbett): Name, Geburtsdatum, ggf. Mehrlinge
- **Entbindungstermin bzw. Geburtsdatum** (bestimmt Leistungszeiträume)
- **Pro Leistung**: Datum, Uhrzeit von–bis bzw. Dauer, **Gebührenposition (GPOS)**, Ort (Hausbesuch / kein Hausbesuch / Video / Telefon), Zuschläge (Nacht, Wochenende, Feiertag)
- **Wegegeld**: Kilometer pro Besuch
- **Materialien** (Kategorie 6)
- **Ärztliche Anordnung**, falls Leistungen über das Kontingent hinausgehen
- **Unterschrift der Versicherten** (Versichertenbestätigung) bzw. eLB
- **Hebamme**: Name, IK-Nummer der Hebamme, Unterschrift

### 3.3 Neue Gebührenstruktur (Hebammenhilfevertrag ab 01.11.2025)

Fünfstellige Gebührenpositionen (GPOS), die sich gut maschinell prüfen lassen:

| Stelle | Bedeutung |
|---|---|
| 1 | Kategorie: 1 Schwangerschaft · 2 Geburt · 3 Wochenbett · 4 Kurse · 5 Wegegeld · 6 Material |
| 2–3 | Laufende Nummer |
| 4 | Zuschlag: 0 ohne · 1 mit |
| 5 | Art: 0 keine Angabe · 1 Hausbesuch · 2 kein Hausbesuch · 3 Video · 4 Telefon · 5 Beleghebamme · 6 Selbstlerneinheit |

Beispielregeln für die Plausibilitätsprüfung. Alle Positionen, Beträge und Kontingente werden in der App selbst gepflegt (Modul M26), die folgenden Werte dienen nur als Startbelegung und müssen gegen den Vertragstext geprüft werden:
- Frühes Wochenbett (Tag 1–10): höchstens 20 Kontakte; Tag 1–3 bis zu 120 Minuten auf 2 Kontakte verteilt
- Spätes Wochenbett (Tag 11 bis Ende 12. Woche): 16 Kontakte, höchstens 60 Minuten je Besuch
- Mehrlingszuschlag bis zu 10 Minuten je Kind und Kontakt
- Wegegeld laut Recherche 0,97 € je gefahrenem Kilometer (die genaue Regelung muss aus dem Vertrag übernommen werden)

> **Fazit HebSet:** HebSet ist ein papierbasierter Dienstleister. Die App erzeugt daher vollständig **vorausgefüllte, formulargetreue PDF-Belege**, die ausgedruckt und per Post verschickt werden. Details in [Kapitel 8](#8-hebset-übertragung-konzept).

---

## 4. Rechtlicher und fachlicher Rahmen

| Thema | Bedeutung für die App |
|---|---|
| **DSGVO Art. 9** | Gesundheitsdaten sind besonders geschützt: Verschlüsselung, Rollen, Protokollierung, Auftragsverarbeitungsverträge (AVV) mit allen Dienstleistern, Hosting in Deutschland bzw. der EU |
| **§ 203 StGB** | Berufsgeheimnis: Dienstleister mit Datenzugriff müssen zur Verschwiegenheit verpflichtet werden |
| **Dokumentationspflicht** | Berufsordnung für Hebammen in Mecklenburg-Vorpommern: Dokumentation vollständig, nachvollziehbar und unveränderbar (Änderungen versioniert); Aufbewahrungsfrist mindestens 10 Jahre (genaue Frist bei Kindern prüfen) |
| **Hebammenhilfevertrag (§ 134a SGB V)** | Gebührenpositionen, Zeitkontingente und Wegegeld. Grundlage für die Plausibilitätsprüfung |
| **Telematikinfrastruktur** | TI-Anbindung für Hebammen wird verpflichtend (eGK, SMC-B, eHBA, KIM, ePA, elektronischer Mutterpass). Die App sollte TI-fähig geplant werden (Phase 3) |
| **eLB** | Elektronische Leistungsbestätigung über eleistungsbestaetigung.de bzw. die Kassen-Apps. Ersetzt langfristig die Unterschrift auf Papier |
| **GoBD / EÜR** | Selbstzahlerrechnungen (Akupunktur, Taping, Babymassage, Schwangerschaftsmassage) fortlaufend nummeriert und unveränderbar |
| **Medizinprodukterecht (MDR)** | Reine Dokumentation ist kein Medizinprodukt. **Vorsicht** bei automatischen Diagnosehilfen (z. B. Bilirubin-Bewertung): Solche Funktionen nur als Anzeige von Referenzwerten umsetzen, ohne Therapieempfehlung |

---

## 5. Ziele und Leitprinzipien der neuen App

1. **Einmal erfassen, überall nutzen.** Ein Hausbesuch erzeugt automatisch Dokumentation, Leistungsposition, Kilometer, HebSet-Beleg und Daten für die Kinderurkunde.
2. **Tablet zuerst, Handy gleichwertig.** Am Küchentisch der Familie mit iPad und Stift dokumentieren, unterwegs mit dem Handy navigieren.
3. **Offline zuerst.** Alles funktioniert ohne Netz und wird später synchronisiert, wichtig für Funklöcher zwischen Kröpelin und Rerik.
4. **Weniger Fahren, mehr Betreuen.** Automatische Tourenplanung mit festem Start- und Endpunkt.
5. **Praxis statt Einzelkämpferin.** Gemeinsame Akten, Vertretungen und fairer Belegungsplan für drei Hebammen.
6. **Herz.** Kinderurkunde, Elternportal, das Branding „Kindkesmöön“ und eine Prise Plattdeutsch.
7. **Sicher und rechtskonform** von Anfang an.

---

## 6. Modulübersicht

Legende: **H** = gibt es auch in Hebamio · **⭐ NEU** = Eigenidee bzw. Mehrwert gegenüber Hebamio

| # | Modul | Herkunft | Phase |
|---|---|---|---|
| M1 | Cockpit / Tagesübersicht | H, erweitert | 1 |
| M2 | Klientinnen- und Kinderverwaltung (Akte) | H | 1 |
| M3 | Dokumentation Schwangerschaft / Wochenbett | H | 1 |
| M4 | Dokumentation Geburt (optional, falls Beleg- oder Hausgeburten) | H | 3 |
| M5 | Termine und Teamkalender | H | 1 |
| M6 | **Automatische Routenplanung** | ⭐ NEU | 1 |
| M7 | Leistungserfassung und Plausibilitätsprüfung | H | 1 |
| M8 | **HebSet-Belege als PDF** (vorausgefüllt, Sammeldruck, Versandliste) | ⭐ NEU | 1 |
| M9 | Fahrtenbuch und Wegegeld (automatisch aus der Route) | H, ⭐ automatisiert | 1 |
| M10 | **Kinderurkunde** | ⭐ NEU | 2 |
| M11 | **Anfrage- und Belegungsplan nach Entbindungstermin** | ⭐ NEU | 2 |
| M12 | Kursverwaltung und Online-Anmeldung | H | 2 |
| M13 | Selbstzahler-Rechnungen (IGeL) und EÜR-Export | H | 2 |
| M14 | **Elternportal / Eltern-App** | ⭐ NEU | 3 |
| M15 | **Wachstums- und Gewichtskurven (WHO-Perzentilen)** | ⭐ NEU | 2 |
| M16 | **Spracheingabe und Diktat** | ⭐ NEU | 3 |
| M17 | **Foto-Dokumentation** (Nabel, Naht, Haut; mit Einwilligung) | ⭐ NEU | 2 |
| M18 | Vorlagen und Briefe (Arztbrief, Bescheinigungen) | H | 2 |
| M19 | **Vertretung, Urlaub und Rufbereitschaft** | ⭐ NEU | 2 |
| M20 | **Team-Nachrichten und Übergaben** | ⭐ NEU | 2 |
| M21 | QM-Handbuch, Fortbildungen, Medikamente/Material | H | 3 |
| M22 | Statistik und Auswertungen | H | 2 |
| M23 | **Erinnerungen und Automatisierungen** | H, ⭐ erweitert | 2 |
| M24 | TI-Anbindung (eGK, KIM, ePA/Mutterpass) und eLB | H (Aufpreis) | 3 |
| M25 | Administration (Rollen, Einstellungen, Audit-Log, Backup) | H | 1 |
| M26 | **Gebühren- und Regelwerk-Administration** (GPOS, Beträge, Kontingente, Zuschläge, Wegegeld, Formulare) | ⭐ NEU | 1 |

---

## 7. Module im Detail

### M1 – Cockpit / Tagesübersicht
- **Heute**: Tour des Tages mit Karte, nächster Termin mit „Navigation starten“, geschätzte Ankunft
- **Kacheln**: offene Dokumentationen, nicht abgerechnete Leistungen, fehlende Unterschriften, anstehende Entbindungstermine (nächste 14 Tage), Kinder mit Betreuungsende (→ Kinderurkunde), Kursbelegung
- **Warnungen**: Kontingent fast ausgeschöpft („Noch 2 Kontakte im frühen Wochenbett“), Gewichtsabnahme über 10 %, fehlende ärztliche Anordnung
- Tablet: Dashboard mit 2–3 Spalten · Handy: gestapelte Karten, „Heute“ zuerst

### M2 – Klientinnen- und Kinderverwaltung
- Stammdaten der Mutter (inkl. eGK-Daten), Partner bzw. Begleitperson, Kontakte (Gynäkologin, Kinderärztin, Klinik)
- **Betreuungsfall** als zentrales Objekt: Schwangerschaft → Geburt → Wochenbett → Abschluss
- Kinder (auch Mehrlinge) mit eigener Akte
- **Adresse mit Geokoordinate** (für die Routenplanung), Hinweise wie „Hund“, „Parken hinten“, „3. OG ohne Aufzug“
- Flaggen (Risiko, Sprache, Sozialdienst), Allergien, Einwilligungen (Foto, Elternportal, Kinderurkunde)
- Zuständige Hebamme und Vertretung
- Volltextsuche, Filter (Status, Hebamme, Ort, Entbindungstermin)
- Import der Bestandsdaten aus Hebamio (CSV-Export, falls verfügbar, oder einmalige Übernahme)

### M3 – Dokumentation Schwangerschaft / Wochenbett
- **Besuchsdokumentation als schnelle Maske**: Vitalwerte Mutter (RR, Puls, Temperatur), Fundus/Lochien, Brust/Stillen, Wunde/Naht, Psyche (z. B. EPDS-Fragebogen); Kind: Gewicht, Temperatur, Hautfarbe/Ikterus, Nabel, Ausscheidung, Trinkverhalten
- **Textbausteine** und „wie letztes Mal“-Übernahme
- **Stift-Eingabe** (Apple Pencil / S Pen): Handschrift → Text, Skizzen
- Vorsorge: Mutterpass-relevante Werte, CTG-Notiz, Beschwerden, Beratungsthemen (Checkliste)
- **Versionierung**: Jede Änderung wird mit Zeitstempel und Person protokolliert (rechtssicher)
- Direkt aus der Dokumentation: Leistung erfassen (M7) und Unterschrift einholen

### M5 – Termine und Teamkalender
- Termintypen mit Standarddauer und Leistungsvorschlag (z. B. „Wochenbett Hausbesuch 45 min → GPOS 3xx01“)
- **Fixe** Termine (Uhrzeit vereinbart) und **flexible** Besuche (z. B. „Tag 5, vormittags“). Flexible Besuche plant M6
- Teamansicht (eine Spalte je aktiver Hebamme; Hebammen in Babypause ausgeblendet), Kursräume, Praxisraum-Belegung
- Kalendersynchronisation (ICS-Abo) mit dem privaten Kalender, nur mit Initialen, ohne Gesundheitsdaten
- Terminbestätigung bzw. -erinnerung per SMS/E-Mail an Eltern (optional)

### M7 – Leistungserfassung und Plausibilitätsprüfung
- Leistung entsteht automatisch aus dem Termin; Dauer aus Check-in/Check-out (Start/Stopp-Knopf)
- **Regelwerk Hebammenhilfevertrag**, in der App selbst pflegbar (siehe **M26**): Positionen, Beträge, Kontingente und Zuschläge mit Gültigkeitszeiträumen
- Prüfungen: Kontingente, Zeitfenster (Lebenstag des Kindes), Zuschläge (Nacht/Wochenende/Feiertag MV), doppelte Leistungen, fehlende Anordnung, Mehrlinge
- Status: *erfasst → geprüft → unterschrieben → übergabebereit → an HebSet versendet → bezahlt / gekürzt*
- **Digitale Unterschrift der Versicherten** auf dem Tablet (pro Besuch oder gesammelt am Ende)

### M9 – Fahrtenbuch und Wegegeld
- Kilometer **automatisch aus der geplanten bzw. gefahrenen Route** (M6), nicht mehr nachträglich eingetragen
- Zuordnung von Teilstrecken zu Besuchen nach den Wegegeld-Regeln (z. B. Aufteilung bei mehreren Besuchen auf einer Tour)
- Fahrtenbuch-Export (PDF/CSV) für das Finanzamt, getrennt nach dienstlich und privat (Weg zur Schule = privat)

### M11 – Anfrage- und Belegungsplan nach Entbindungstermin ⭐
- **Anfrageformular** für die Website (ersetzt bzw. ergänzt das Kontaktformular): ET, Wohnort, gewünschte Leistungen, Erstgebärende ja/nein
- **Belegungsplan**: Wie viele Wochenbetten hat jede Hebamme in welchen Kalenderwochen? Ampel pro Woche, Urlaub berücksichtigt
- **Vorschlag**: Welche Hebamme passt (Kapazität, Entfernung zum Wohnort, Leistungswunsch)?
- Zu- oder Absage per Vorlage, Warteliste, Weiterleitung an Kolleginnen im Netzwerk

### M12 – Kursverwaltung und Online-Anmeldung
- Kurstypen (Geburtsvorbereitung, Babymassage, Eltern-Kind, Rückbildung), Termine, Räume, **Kursleitung durch eine oder mehrere Hebammen** (z. B. Geburtsvorbereitung zu zweit; die Aufteilung der Leistungen ist für die Pool-Abrechnung festgelegt)
- Online-Anmeldung über die Website mit Warteliste, Bestätigungs- und Erinnerungsmails
- Teilnehmerliste und Anwesenheit per Tablet abhaken → Kassenkurse an HebSet (Formular 3.4), Selbstzahlerkurse → Rechnung (M13)
- Partnergebühren, Ratenzahlung, Stornoregeln

### M13 – Selbstzahler-Rechnungen
- Akupunktur, Kinesio-Taping, Schwangerschaftsmassage, Babymassage, Partnergebühren
- Rechnungs-PDF mit fortlaufender Nummer, QR-Code für Überweisung (GiroCode/EPC-QR), Zahlungseingang abhaken
- EÜR-Export (CSV/DATEV) für die Steuerberatung

### M14 – Elternportal / Eltern-App ⭐ (Phase 3)
- Login per Magic Link, keine App-Installation nötig (PWA)
- Nächste Termine, Kontakt zur zuständigen Hebamme, Notfallnummern
- **Gewichtsverlauf** des Kindes (freigegebene Werte)
- Infomaterial (Stillen, Beikost, Schlaf, U-Untersuchungen), Kursunterlagen
- Fragebogen vor dem Erstbesuch (Anamnese digital vorab ausfüllen)
- Optional: Still- und Windelprotokoll, das die Hebamme beim Besuch sieht
- Zum Schluss: **Kinderurkunde als Download**

### M15 – Wachstumskurven ⭐
- Gewicht, Länge und Kopfumfang als Kurve mit WHO-Perzentilen (Datensätze offen verfügbar)
- Automatisch: Gewichtsverlust in % vom Geburtsgewicht und Tag des Wiedererreichens des Geburtsgewichts
- Nur Anzeige ohne Diagnose (siehe MDR-Hinweis)

### M16 – Spracheingabe ⭐ (Phase 3)
- Diktat → Text in der Besuchsdokumentation, möglichst **auf dem Gerät** (iOS/Android-Spracherkennung offline), damit keine Gesundheitsdaten in Cloud-Dienste fließen
- Optional: KI-Zusammenfassung zum Arztbrief, nur mit AVV-konformem Anbieter und Zustimmung

### M17 – Foto-Dokumentation ⭐
- Fotos von Nabel, Naht oder Hautbefund direkt in der Akte. Fotos bleiben **nicht** in der Galerie des Geräts, sondern werden verschlüsselt in der App gespeichert
- Verlaufsvergleich (Bilder nebeneinander), Einwilligung wird geprüft

### M18 – Vorlagen und Briefe
- Arztbrief, Überleitungsbericht, Bescheinigungen (z. B. Mutterschutz-relevante Bescheinigungen, soweit zulässig), Kursbescheinigungen
- Platzhalter-System (`{{mutter.name}}`, `{{kind.geburtsgewicht}}`), Praxis-Briefkopf

### M19 – Vertretung, Urlaub und Rufbereitschaft ⭐
- Urlaubsplanung mit Wirkung auf den Belegungsplan (M11)
- **Babypause/Elternzeit** als eigener Status einer Hebamme (aktuell bei Lorina Gosemann): Sie erhält keine neuen Anfragen und keine Touren, behält aber Lesezugriff auf ihre abgeschlossenen Fälle, und das Ende ist im Belegungsplan bereits einplanbar
- **Übergabe**: Vertretung bekommt die Akte freigeschaltet, mit Kurzübergabe („Worauf achten?“)
- Rufbereitschaftsplan (z. B. Wochenende), Weiterleitung der Telefonnummer

### M20 – Team-Nachrichten und Übergaben ⭐
- Kurznachrichten **mit Bezug zur Akte**, verschlüsselt und praxisintern (ersetzt WhatsApp, das für Gesundheitsdaten nicht zulässig ist)
- Aufgaben („Bitte Anordnung bei Dr. X anfordern“) mit Fälligkeit

### M21 – QM, Fortbildung, Material
- QM-Handbuch (Kapitel, Versionen, Lesebestätigung durch das Team)
- Fortbildungsnachweise je Hebamme mit Stundenkonto gegenüber der Fortbildungspflicht laut Berufsordnung MV
- Material- und Medikamentenbestand (Ablaufdaten, Nachbestellung)

### M22 – Statistik
- Betreuungen pro Hebamme/Monat, Wochenbetten nach Ort (Heatmap), Kilometer und Fahrtzeit, Umsatz (Kasse vs. Selbstzahler), Kursauslastung
- Offene Beträge: versendet, aber noch nicht als bezahlt abgehakt (siehe Kapitel 8.4)

### M23 – Erinnerungen und Automatisierungen
- „ET in 2 Wochen → Erstbesuch Wochenbett vorbereiten“
- „Kind 8 Wochen → Rückbildungskurs anbieten“
- „Betreuung endet in 7 Tagen → Kinderurkunde vorbereiten“
- „Übergabebereite Belege vorhanden → HebSet-Versand vorbereiten (1. und 15.)“
- „U-Untersuchung fällig“ (Hinweis für die Eltern)

### M24 – TI und eLB (Phase 3)
- eGK-Einlesen über ein zugelassenes Kartenterminal bzw. TI-Gateway (Anbieter wie CGM, telekonnekt). Ersetzt dann das HebSet-Print-Lesegerät
- KIM-Postfach für Arztbriefe, ePA/elektronischer Mutterpass lesen
- eLB: Leistungsbestätigung über die Kassen-App der Versicherten (nur, wenn auch der Abrechnungsweg sie unterstützt; mit HebSet klären)

### M25 – Administration
- Rollen: **Administration** (alles inkl. Regelwerk M26), **Hebamme** (eigene und vertretene Fälle), **Büro/Verwaltung** (optional, ohne medizinische Daten)
- Hebammen-Profile: Name, IK-Nummer, Kontaktdaten, Start- und Endpunkt-Vorlagen, Status *aktiv / Babypause / ausgeschieden*
- Audit-Log, Geräteverwaltung (verlorenes Tablet sperren), automatische Backups, Export aller Daten (keine Abhängigkeit vom Anbieter)

### M26 – Gebühren- und Regelwerk-Administration ⭐
Alle abrechnungsrelevanten Regeln sind **Daten, nicht Code**. Die Praxis pflegt sie selbst in der App, z. B. wenn der Hebammenhilfevertrag sich ändert, Beträge angepasst werden oder HebSet ein Formular ändert. Zugriff hat nur die Rolle **Administration** (Inhaberin bzw. eine benannte Hebamme).

**1. Regelwerk-Versionen**
- Ein Regelwerk hat einen Namen (z. B. „Hebammenhilfevertrag 2025“) und **gültig von / bis**.
- Neue Version = **Kopie** der alten, dann ändern. Für jede Leistung gilt automatisch die Version, die **am Leistungsdatum** gültig war (wichtig für Nachträge über den Jahreswechsel).
- Status *Entwurf → aktiv → archiviert*. Aktive Versionen, mit denen schon Belege erzeugt wurden, sind schreibgeschützt; Korrekturen erfolgen über eine neue Version.
- **Import/Export als Excel/CSV**: Positionen lassen sich gesammelt einlesen (z. B. aus der Anlage des Vertrags abgetippt oder von einer Kollegin übernommen) und sichern.

**2. Gebührenpositionen (GPOS)**

| Feld | Beispiel |
|---|---|
| GPOS | `3xxx1` (frei definierbar, Prüfung des 5-stelligen Musters optional) |
| Bezeichnung lang / Kurztext für den Beleg | „Wochenbettbetreuung, Hausbesuch“ / „WB HB“ |
| Kategorie | Schwangerschaft · Geburt · Wochenbett · Kurse · Wegegeld · Material · Zusatzleistung |
| Leistungsart | Hausbesuch · kein Hausbesuch · Video · Telefon · Beleg · Selbstlerneinheit |
| Vergütung | Betrag je Einheit, Einheit (pauschal / je angefangene 5 Min. / je Minute / je km / je Stück) |
| Zeitangaben | Mindestdauer, Höchstdauer, Regeldauer (Vorschlag für den Termin) |
| Zuschlag | Verweis auf Zuschlagsposition (z. B. Nacht, Wochenende, Feiertag) und Bedingung |
| Zeitraum-Bedingung | z. B. „Lebenstag 1–10“, „ab SSW 12“, „bis Ende 12. Woche nach Geburt“ |
| Kombinationsregeln | „nicht am selben Tag mit …“, „nur zusammen mit …“, „Mehrlingszuschlag je weiterem Kind“ |
| Anordnungspflicht | ab welchem Kontakt bzw. welcher Dauer eine ärztliche Anordnung nötig ist |
| HebSet-Formular | 3.1 / 3.2 / 3.3 / 3.4 / 3.5 / Zusatzbogen |
| Sichtbarkeit | aktiv / ausgeblendet, Sortierung, Favorit (schnell wählbar beim Besuch) |

**3. Kontingente**
- Frei definierbare Zähler, z. B. „Frühes Wochenbett: max. 20 Kontakte, Lebenstag 1–10“, „Spätes Wochenbett: max. 16 Kontakte, Tag 11 bis Ende Woche 12“, „Tag 1–3: max. 120 Minuten auf 2 Kontakte“
- Bestandteile: **zugeordnete Positionen**, **Zeitraum** (relativ zu Geburt/ET oder Lebenstag), **Grenze** (Anzahl Kontakte und/oder Minuten), **Bezug** (je Kind, je Mutter, je Schwangerschaft), **Verhalten bei Überschreitung**: *Hinweis* · *Anordnung erforderlich* · *Sperre*
- Anzeige im Besuch: „Frühes Wochenbett: 14 von 20 Kontakten“

**4. Zuschläge und Kalender**
- Zuschlagsregeln: Uhrzeiten (z. B. 20–8 Uhr), Wochenende, **Feiertage Mecklenburg-Vorpommern** (Feiertagskalender, pflegbar und automatisch vorbelegt)
- Regel, ob ein Zuschlag über eine eigene Position oder über eine Positionsvariante (4. Stelle = 1) abgebildet wird

**5. Wegegeld**
- Satz je km, Ausgangspunkt (Praxis / Wohnung / tatsächliche Strecke), Aufteilung bei mehreren Besuchen auf einer Tour, Rundung, Höchstgrenzen. Alle Werte werden hier gepflegt, M9 rechnet damit.

**6. Material**
- Liste abrechenbarer Materialien mit Position, Preis und Einheit

**7. Selbstzahler-Preisliste**
- Akupunktur, Kinesio-Taping, Schwangerschaftsmassage, Babymassagekurs, Partnergebühren: Preis, USt-Hinweis (Steuerbefreiung prüfen), Rechnungstext (für M13)

**8. Test und Sicherheit**
- **Testrechner**: Eine Beispielbetreuung durchspielen („Geburt 20.09., Besuche an Tag 1, 2, 2, 3 …“). Die App zeigt die erzeugten Positionen, Beträge und Warnungen, bevor eine neue Version aktiviert wird.
- **Änderungsprotokoll**: wer hat wann welchen Wert geändert (alt → neu)
- **Vorbelegung**: Die App wird mit einem Startregelwerk ausgeliefert, das aus dem Vertrag übernommen und von der Praxis geprüft wird. Danach liegt die Pflege vollständig bei der Praxis.


---

## 8. HebSet-Übertragung: Konzept

> **Entscheidung (Version 1.1):** Die App erzeugt **vorausgefüllte PDF-Belege**. Diese werden ausgedruckt, falls nötig unterschrieben und **per Post an HebSet geschickt**. Eine digitale Schnittstelle ist nicht vorgesehen.

### 8.1 Ziel
Kein händisches Ausfüllen der Durchschreibesätze und keine Etiketten mehr. Alles, was beim Besuch ohnehin erfasst wird, landet automatisch auf dem Beleg. HebSet bekommt Belege, die **vollständig, lesbar, plausibel und sofort abrechenbar** sind. Das spart Rückfragen und Kürzungen und beschleunigt die Auszahlung.

**Rückfallebene:** Sollte HebSet die PDF-Ausdrucke nicht als Ersatz für die Durchschreibesätze akzeptieren, behält der Beleg trotzdem seinen Wert: Er ist dann eine vollständige **Übersicht aller Leistungen je Betreuung auf einen Blick**, von der die Durchschreibesätze nur noch abgeschrieben werden müssen.

### 8.2 Ablauf

```
 Besuch dokumentiert ─► Leistung (GPOS, Zeit, km) ─► Plausi-Prüfung (Regelwerk M26)
        │                                                  │
        ▼                                                  ▼
 Unterschrift der Versicherten                   Beleg „übergabebereit“
 (auf Papier oder Tablet, siehe 8.5)                      │
                                                          ▼
                                       „HebSet-Versand vorbereiten“ (z. B. halbmonatlich)
                                                          │
                                       Sammel-PDF: Deckblatt + Belege je Fall/Formular
                                                          │
                                       Drucken ─► ggf. unterschreiben ─► Umschlag ─► Post
                                                          │
                                       Status „versendet“ (Datum, Versand-Nr.) ─► „bezahlt“ abhaken
```

### 8.3 PDF-Beleggenerator
- **Formulare**: 3.1 Schwangerschaft · 3.2 Außerklinische Geburt · 3.3 Wochenbett · 3.4 Kurse · 3.5 Beleghebamme · Zusatzbogen „Zusätzliche Leistungen“. Die Zuordnung Leistung → Formular steht im Regelwerk (M26), sodass neue Formulare ohne Programmierung ergänzt werden können.
- **Formularvorlage**:
  - Bevorzugt: HebSet stellt die **personalisierte Kopiervorlage** als PDF bereit (laut Website gibt es sie). Die App legt die Daten **feldgenau** darüber: Für jedes Feld werden Seite, x/y-Position, Breite, Schriftgröße und Zeilenanzahl hinterlegt.
  - Alternativ: Ein eigenes Formular mit **identischem Aufbau und identischen Feldern**, einmalig von HebSet freigeben lassen.
  - Die Vorlagen und Feldpositionen sind in der Administration hinterlegt (Upload der Vorlage, Feldzuordnung per Vorschau), damit eine neue Formularversion von HebSet ohne Programmierung eingepflegt werden kann.
- **Inhalt je Beleg**:
  - Kopf: Hebamme (Name, IK-Nummer, Anschrift), Versicherte (Name, Geburtsdatum, Anschrift, Kasse mit IK, Versichertennummer, Status; ersetzt das Etikett), Kind(er), ET bzw. Geburtsdatum
  - Leistungszeilen: Datum, Uhrzeit von–bis, Dauer, **GPOS**, Bezeichnung (Kurztext), Hausbesuch-Kennzeichen, Zuschlag, Kilometer/Wegegeld, Material, Hinweis auf ärztliche Anordnung
  - Fuß: Summen (Anzahl Kontakte, km), Unterschriftsfelder Versicherte und Hebamme, Seitenzahl „Blatt 1/2“, Beleg-ID und Druckdatum
- **Seitenumbruch**: Reichen die Zeilen eines Formulars nicht, erzeugt die App automatisch ein Folgeblatt mit wiederholtem Kopf.
- **Lesbarkeit**: Maschinenschrift und eine klare Schrift in der Größe der Formularfelder. Lange Texte werden gekürzt, die volle Bezeichnung steht im Regelwerk.
- **Nachdruck und Korrektur**: Jeder erzeugte Beleg wird als PDF in der Akte archiviert. Änderungen nach dem Versand erzeugen einen **Korrekturbeleg** (mit Verweis auf den Ursprungsbeleg); das Original bleibt unverändert.

### 8.4 Versand an HebSet („HebSet-Versand vorbereiten“)
- Ein Knopf sammelt alle übergabebereiten Belege, filterbar nach Hebamme und Zeitraum. Ein Rhythmus passend zu den Auszahlungen ist voreingestellt (z. B. zum 1. und 15.).
- **Vorabprüfung**: Fehlen Pflichtangaben (Versichertennummer, Unterschrift, Anordnung), wird der Beleg rot markiert und nicht in den Versand übernommen. Die Hebamme sieht eine Liste „Das fehlt noch“.
- **Sammel-PDF** zum Drucken in einem Rutsch:
  1. **Deckblatt bzw. Versandliste**: Absender, Datum, Anzahl Belege und Blätter, Liste der Fälle (Versicherte, Formular, Zeitraum, Anzahl Leistungen, erwarteter Betrag)
  2. Optional: **Stundenübersicht je Hebamme** für die Pool-Aufteilung bei HebSet
  3. Die Belege, sortiert nach Hebamme → Formular → Versicherte
- Optional ein **Adressetikett bzw. Anschreiben** für den Umschlag (DIN-lang-Fenster)
- Nach dem Druck: Status **„versendet“** mit Datum (optional Einschreiben-Nummer). Danach sind die Belege gesperrt.
- **Eigene Kopie**: Statt des Durchschlags bleibt das archivierte PDF in der App. Der ausgedruckte Stapel kann zusätzlich eingescannt werden, falls eine Kopie mit Unterschrift gebraucht wird.
- **Zahlungsstatus (einfach)**: Wenn die HebSet-Auszahlung kommt, werden die Belege der Versandliste als **„bezahlt“** bzw. einzelne als **„gekürzt / abgelehnt“** (mit Grund) abgehakt. Daraus entsteht eine kleine Übersicht offener Beträge, ganz ohne Schnittstelle.

### 8.5 Unterschrift der Versicherten
Zwei Varianten, pro Praxis einstellbar (mit HebSet abstimmen, welche akzeptiert wird):

| Variante | Ablauf | Vorteil | Nachteil |
|---|---|---|---|
| **A: Papier** | Beleg ausdrucken (zu Hause oder in der Praxis), die Versicherte unterschreibt beim nächsten oder letzten Besuch, dann geht er in den Versand | Entspricht dem heutigen Verfahren, sicher akzeptiert | Ausdruck muss mitgenommen werden |
| **B: Tablet** | Unterschrift pro Besuch oder gesammelt am Ende auf dem Tablet, wird ins PDF übernommen | Kein Papier beim Hausbesuch | Akzeptanz durch HebSet und die Kassen ist offen |

In beiden Fällen zeigt die App, welche Belege noch auf eine Unterschrift warten („3 Belege warten auf Unterschrift, nächster Besuch bei Familie Muster am Do.“).

### 8.6 Versichertendaten ohne Etiketten
- Die Versichertendaten werden **einmal** erfasst: abtippen, aus HebSet Print übernehmen oder ein Foto der eGK auf dem Gerät per Texterkennung (OCR) auslesen. Danach stehen sie automatisch auf jedem Beleg.
- Mittelfristig (TI, Phase 3) wird die eGK direkt über ein zugelassenes Kartenterminal eingelesen.

### 8.7 Bewusst nicht vorgesehen
- Digitale Übertragung an HebSet (Upload/CSV): HebSet bietet sie öffentlich nicht an. Falls HebSet das später anbietet, kann die App die Belegdaten zusätzlich als Datei exportieren, weil die Daten ohnehin strukturiert vorliegen.
- Eigene Direktabrechnung nach § 302 SGB V: Zertifizierung, Kostenträgerdateien und Pflege sind für eine Eigenentwicklung unverhältnismäßig.

### 8.8 Zeitersparnis (Schätzung)
Bei etwa 8 Wochenbett-Kontakten pro Woche und aktiver Hebamme mit je 2–3 Minuten Formular- und Etikettenarbeit sind das bei zwei aktiven Hebammen rund 45–60 Minuten pro Woche. Dazu kommen weniger Rückfragen und Kürzungen durch die Plausibilitätsprüfung.

---

## 9. Routenplanung: Konzept

### 9.1 Anforderungen
- **Start- und Endpunkt pro Tag frei wählbar**, z. B. Start Wohnung, Ende Schule der Tochter um 15:30 Uhr (**festes Ankunftsfenster am Ende**)
- Vorlagen: „Normaler Schultag“, „Praxistag“ (Start/Ende Praxis), „Kurs abends“, je Wochentag hinterlegbar
- **Fixe Termine** (Uhrzeit mit Familie vereinbart) bleiben fest; **flexible Besuche** mit Zeitfenster (z. B. „vormittags“, „nicht vor 10 Uhr, Baby schläft“) werden optimiert
- **Besuchsdauer** je Termintyp (Erstbesuch Wochenbett länger), Puffer einstellbar
- **Pausen** (z. B. 30 Minuten Mittag), Praxistermine dazwischen
- **Lebenstag-Regeln**: z. B. „Tag 3 muss heute besucht werden“ hat Vorrang
- **Mehrere Hebammen**: Optional werden flexible Besuche zwischen den dreien verteilt (Vertretung, Urlaub); jede Hebamme hat eigene Start- und Endpunkte
- Ergebnis: Reihenfolge, Ankunftszeiten, Fahrzeiten, km, Karte; **„Navigation starten“** (übergibt die Adresse an Apple Maps, Google Maps oder Waze)
- **Benachrichtigung an Familien** (optional): „Ihre Hebamme kommt heute zwischen 10:15 und 10:45 Uhr“
- **Neuplanung unterwegs**: Ein Besuch dauert länger → Folgezeiten werden neu berechnet, Familien optional informiert

### 9.2 Algorithmus
- Ein **Vehicle Routing Problem mit Zeitfenstern (VRPTW)**: mehrere Fahrzeuge (= Hebammen), Start und Ende pro Fahrzeug, Zeitfenster pro Stopp, harte Termine, Service-Zeiten
- Umsetzung mit einer bewährten Open-Source-Engine:
  - **VROOM** (spezialisiert auf genau dieses Problem) + **OSRM** oder **OpenRouteService** für Fahrzeiten und Distanzen auf OpenStreetMap
  - Alternativ Google OR-Tools mit eigener Distanzmatrix
- **Datenschutz**: Self-Hosting in einem deutschen Rechenzentrum, sodass keine Adressen an Google übertragen werden. Für die Optimierung reichen Koordinaten, Namen werden nie übertragen.
- Bei wenigen Stopps pro Tag (5–10) liegt die Rechenzeit unter einer Sekunde, auch für alle drei Hebammen zusammen.

### 9.3 Ablauf in der App
1. Am Vorabend oder morgens: „Tour planen“ für morgen
2. Start und Ende wählen (Vorlage vorausgewählt: Wohnung → Schule bis 15:30)
3. Die App schlägt die Reihenfolge vor. Per Drag & Drop anpassen, Termine fixieren
4. „Tour bestätigen“ → Termine werden gesetzt, Familien optional benachrichtigt
5. Unterwegs: Check-in/Check-out pro Besuch (Dauer → Leistung), km → Wegegeld/Fahrtenbuch
6. Am Ende: Tagesbilanz (km, Fahrtzeit, Betreuungszeit, Wegegeld)

### 9.4 Kilometer-Logik für Wegegeld und Fahrtenbuch
- Die Teilstrecken werden den Besuchen nach den Wegegeld-Regeln des Hebammenhilfevertrags zugeordnet. Die Regeln (Aufteilung bei mehreren Besuchen, Bezugspunkt Praxis oder Wohnung) werden als Konfiguration hinterlegt.
- Der private Anteil (z. B. Weg zur Schule) wird im Fahrtenbuch als privat markiert und **nicht** abgerechnet.

---

## 10. Kinderurkunde: Konzept

### 10.1 Auslöser
- Beim **Abschluss der Hebammenbetreuung** (Ende der Wochenbettbetreuung bzw. letzter Besuch; spätestens bei Ende des Leistungszeitraums) schlägt die App vor: „Kinderurkunde für Ole erstellen?“
- Erinnerung 7 Tage vorher, damit die Urkunde beim letzten Besuch übergeben werden kann (ausgedruckt oder digital über das Elternportal)

### 10.2 Inhalt
1. **Kopf**: Logo „Kindkesmöön“, Titel z. B. „Lütt Kindkes Urkunde“ bzw. „Urkunde für Ole“
2. **Persönlicher Text** aus Vorlagen mit Platzhaltern, auswählbar bzw. bearbeitbar:

   > *„Lieber Ole, am 20. September 2026 um 04:12 Uhr bist du in Rostock auf die Welt gekommen und hast deine Familie zur glücklichsten der Welt gemacht. In den ersten Wochen durfte ich dich und deine Eltern begleiten: Du hast tapfer getrunken, fleißig zugenommen und uns mit deinem ersten Lächeln beschenkt. Nun bist du groß genug, und meine Zeit als deine Kindkes-Möön ist vorbei. Ich wünsche dir eine wunderbare Zukunft! – Deine Hebamme Marielena“*

   - Varianten: warm, kurz, mit plattdeutschem Gruß („Allens Gode, lütt Ole!“), für Mehrlinge, für Geschwisterkinder
   - Optional: KI-Formulierungshilfe auf Basis der Stichworte der Hebamme (nur mit Zustimmung, ohne Gesundheitsdaten)
3. **Geburtsdaten**: Datum, Uhrzeit, Ort, Geburtsgewicht, Länge, Kopfumfang, Sternzeichen (optional)
4. **Tabelle aus der Hebammenzeit** (automatisch aus der Dokumentation):

   | Datum | Lebenstag | Gewicht | Länge | Kopfumfang | Besonderes |
   |---|---|---|---|---|---|
   | 20.09.2026 | 1 | 3.480 g | 52 cm | 35 cm | Geburt |
   | 23.09.2026 | 4 | 3.290 g | | | |
   | 30.09.2026 | 11 | 3.510 g | | | Geburtsgewicht wieder erreicht 🎉 |
   | … | | | | | |
   | 08.11.2026 | 50 | 4.720 g | 56 cm | 38 cm | Abschluss |

   - Die Hebamme wählt aus, welche Zeilen bzw. Spalten erscheinen (z. B. nur Wochenwerte)
5. **Gewichtskurve** als Grafik (optional mit WHO-Perzentilen, weich gestaltet)
6. **Meilensteine** (manuell gepflegt): erstes Baden, Nabel abgefallen, erstes Lächeln
7. **Optional**: Foto des Kindes, Fußabdruck (Scan oder Foto), Unterschrift der Hebamme (digital), Praxisstempel
8. **Fuß**: Praxisadresse, Instagram-Handle, „Wir sehen uns beim Rückbildungs- oder Babymassagekurs!“ (dezenter Kurs-Hinweis)

### 10.3 Technik
- Vorlage als HTML/CSS → **PDF** (A4 hoch, druckfertig, 300 dpi). Mehrere Designs (Aquarell-Ostsee, Leuchtturm, schlicht)
- Vorschau auf dem Tablet, Bearbeiten des Textes direkt in der Vorschau
- Ausgabe: drucken, über das Elternportal teilen, per E-Mail senden (mit Einwilligung)
- Die erzeugte Urkunde wird in der Akte gespeichert
- Einwilligung zur Nutzung des Fotos ist Pflicht

---

## 11. UX: Tablet zuerst, Handy gleichwertig

### 11.1 Gerätestrategie
| Gerät | Typische Nutzung | Layout |
|---|---|---|
| **Tablet quer** (iPad 10,9"/11", Android 10–12") | Dokumentation beim Hausbesuch, Unterschrift, Kurs-Anwesenheit, Kinderurkunde, Planung | **Master-Detail**: links Liste/Navigation, rechts Akte. Mehrspaltige Formulare |
| **Tablet hoch** | Unterschrift, Lesen | Einspaltig mit seitlichem Ausklappmenü |
| **Handy** | Tour, Navigation, Check-in, kurze Notiz, Anrufe | **Untere Tab-Leiste** (Heute · Tour · Klientinnen · + · Mehr), einspaltig, große Buttons |
| **Desktop/Laptop** | Büroarbeit, Abrechnung, Statistik, QM | Wie Tablet quer, breiter |

### 11.2 Gestaltungsprinzipien
- **Touch-Ziele mindestens 48×48 px**, keine Hover-Abhängigkeit
- **Stift-Unterstützung**: Unterschrift, Handschrift → Text, Skizzen
- **Einhand-Bedienung am Handy**: wichtige Aktionen in der unteren Hälfte
- **Schnell-Eingaben**: Zahlen-Pads für Gewicht und RR, Schieberegler, Chips statt Freitext, „wie letztes Mal“
- **Dunkel-Modus** und Nachtmodus (gedimmt) für nächtliche Einsätze
- **Barrierearm**: große Schrift skalierbar, hoher Kontrast
- **Klare Status-Farben**: offen, zu prüfen, fertig, übergeben
- **Offline-Anzeige**: kleines Symbol „offline – wird synchronisiert“, ohne die Arbeit zu blockieren
- **Branding**: Farben und Logo von Kindkesmöön, ruhige Ostsee-Töne

### 11.3 Kern-Screens (Wireframe-Skizze Tablet quer)

```
┌──────────────┬─────────────────────────────────────────────────────┐
│ ☰ Kindkesmöön│  Anna Muster · Ole (Tag 4)          [Navigation] [⋯]│
│──────────────│─────────────────────────────────────────────────────│
│ 🏠 Heute     │  ┌─ Besuch 23.09. 09:10 ───────── ⏱ 00:32 läuft ─┐ │
│ 🗺 Tour      │  │ Mutter          │ Kind                          │ │
│ 👩 Klientinnen│  │ RR [120/80]     │ Gewicht [3290] g  (-5,5 %)    │ │
│ 📅 Kalender  │  │ Temp [36,8]     │ Temp [37,0]                   │ │
│ 🧾 Abrechnung│  │ Fundus [Chips]  │ Haut ○ rosig ● leicht gelb    │ │
│ 🎓 Kurse     │  │ Brust [Chips]   │ Nabel [Chips]  📷             │ │
│ 📜 Urkunden  │  │ Notiz ✍️ 🎤      │ Stillen [Chips]               │ │
│ 📊 Statistik │  └─────────────────┴───────────────────────────────┘ │
│ ⚙️ Einstellungen│  Leistung: 3xxx1 Wochenbett Hausbesuch · 14,2 km ✔ │
│              │  [ Unterschrift Versicherte ✍️ ]   [ Besuch beenden ] │
└──────────────┴─────────────────────────────────────────────────────┘
```

---

## 12. Technische Architektur

### 12.1 Empfehlung: Offline-fähige Web-App (PWA) + optionale native Hülle

| Option | Vorteile | Nachteile | Bewertung |
|---|---|---|---|
| **PWA (Web) + Capacitor-Hülle** | Eine Codebasis für iPad, Android, Handy und Desktop; Updates ohne App Store; mit Capacitor Zugriff auf Kamera, Stift, Biometrie, Bluetooth (Kartenleser/Drucker), Hintergrund-Sync | Etwas weniger „nativ“ als Swift/Kotlin | ✅ **Empfohlen** |
| Flutter | Sehr gute Tablet-UI, native Performance | Web-Version schwächer, kleineres Ökosystem für PDF/Formulare | Gute Alternative |
| Native (Swift + Kotlin) | Beste Plattformintegration | Doppelter Aufwand | ❌ zu teuer für 3 Nutzerinnen |

### 12.2 Bausteine

```
┌───────────────────────── Geräte (iPad / Android / Handy / Laptop) ─────────────────────────┐
│  PWA / Capacitor-App (React + TypeScript, responsive UI, Tailwind)                         │
│  • Lokale verschlüsselte DB (SQLite/IndexedDB) • Offline-Sync-Engine • PDF-Erzeugung lokal │
└──────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                           │ HTTPS/TLS 1.3, Ende-zu-Ende für Anhänge
┌──────────────────────── Backend (Hosting in Deutschland, z. B. Hetzner / IONOS / STACKIT) ─┐
│  API (Node.js/NestJS oder Supabase self-hosted) · PostgreSQL (verschlüsselt, Backups)      │
│  • Auth (Passkeys/2FA) • Rollen & Audit-Log • Datei-Speicher (S3-kompatibel, verschlüsselt)│
│  • Regelwerk-Service (in der App pflegbar, versioniert, M26)                                │
│  • Routing: VROOM + OSRM/OpenRouteService (OSM-Daten Mecklenburg-Vorpommern)                │
│  • PDF-Service (HebSet-Belege, Urkunden, Rechnungen, Briefe)                                │
│  • Benachrichtigungen (E-Mail, SMS-Gateway DE, Push)                                        │
└──────────────────────────────────────────┬─────────────────────────────────────────────────┘
               ┌───────────────────────────┼───────────────────────────────┐
               ▼                           ▼                               ▼
       Website Kindkesmöön         HebSet (PDF → Druck → Post)      TI-Gateway (Phase 3)
       (Anfrage-/Kursformular)     Rückkanal-Import                 eGK · KIM · ePA · eLB
```

### 12.3 Offline-Synchronisation
- Lokale Datenbank auf dem Gerät, Änderungen als Ereignisse mit Zeitstempel und Gerät
- Konflikte (selten, da meist eine Hebamme pro Fall): Feldweise zusammenführen, bei echten Konflikten nachfragen
- Werkzeuge: z. B. PowerSync, ElectricSQL, RxDB oder ein eigener Sync auf Postgres

### 12.4 Qualität
- Automatisierte Tests vor allem für das **Abrechnungsregelwerk** (Kontingente, Zuschläge, Wegegeld) und die **PDF-Formulare** (Snapshot-Tests)
- Testgeräte: iPad (aktuelles iPadOS), ein Android-Tablet, iPhone, Android-Handy
- Staging-Umgebung mit Testdaten, niemals mit echten Patientinnendaten

---

## 13. Datenschutz und Sicherheit

| Maßnahme | Umsetzung |
|---|---|
| Hosting | Deutschland, ISO-27001-zertifizierter Anbieter, AVV abgeschlossen |
| Verschlüsselung | TLS 1.3 beim Transport; Datenbank und Dateien verschlüsselt; lokale Daten auf dem Gerät verschlüsselt (Schlüssel im Secure Enclave/Keystore) |
| Anmeldung | Passkeys oder Passwort + 2FA; App-Sperre per Face ID/Fingerabdruck; automatische Sperre nach Inaktivität |
| Rollen | Need-to-know: Hebammen sehen eigene und vertretene Fälle; Administration sieht alles; Büro nur Verwaltungsdaten |
| Protokoll | Unveränderbares Audit-Log (wer hat wann was gesehen bzw. geändert) |
| Geräte | Verlorenes Gerät aus der Ferne abmelden und lokale Daten unbrauchbar machen |
| Backups | Täglich, verschlüsselt, an einem zweiten Standort in Deutschland; Wiederherstellung regelmäßig testen |
| Löschung | Aufbewahrungsfristen automatisch überwachen, danach Löschvorschlag |
| Einwilligungen | Elternportal, Fotos, Kinderurkunde, SMS/E-Mail digital erfasst und widerrufbar |
| E-Mail-Kommunikation | Die Hebammen nutzen heute private Gmail- und Outlook-Adressen. Für Nachrichten mit Gesundheitsdaten empfiehlt sich eine Praxis-Domain mit deutschem Anbieter (AVV) bzw. die Kommunikation über das Elternportal (M14) und die Team-Nachrichten (M20) |
| Drittanbieter | Keine Weitergabe an Google oder Meta; Karten auf OSM-Basis selbst gehostet; keine Tracking-Tools |
| Dokumente | Verzeichnis der Verarbeitungstätigkeiten, TOMs, Datenschutzinformation für Klientinnen, ggf. DSFA (Art. 35 DSGVO) |

---

## 14. Datenmodell (Kern)

```
Praxis ─┬─ Hebamme (IK, Rolle, Start/Ziel-Vorlagen, Fahrzeug)
        │
        └─ Klientin (Stammdaten, eGK-Daten, Adresse+Geo, Kontakte, Einwilligungen)
              └─ Betreuungsfall (ET, Status, zuständige Hebamme, Vertretung)
                    ├─ Kind[] (Name, Geburt: Datum/Zeit/Ort, Maße)
                    ├─ Termin[] (fix/flexibel, Zeitfenster, Typ, Hebamme)
                    │     └─ Besuch (Check-in/out, Dokumentation, Messwerte, Fotos, Unterschrift)
                    │           └─ Leistung[] (GPOS, Dauer, Zuschläge, km, Material, Status)
                    ├─ Dokument[] (Arztbrief, Urkunde, Anordnung …)
                    └─ HebSet-Beleg[] (Formular 3.x, Zeitraum, PDF, Versand-ID, Status, Korrektur-von)

Tour (Datum, Hebamme, Start, Ziel, Zeitfenster Ende) ─ Stopp[] → Termin
HebSet-Versand (ID, Datum, Belege[], Blattzahl, erwarteter Betrag, Einschreiben-Nr., bezahlt am)
Kurs ─ Kurstermin[] ─ Teilnahme[] (Anwesenheit → Leistung/Rechnung)
Regelwerk (Version, gültig von/bis, Status) ─┬─ Position[] (GPOS, Texte, Kategorie, Art, Betrag, Einheit,
                                             │              Dauer min/max, Zeitraum, Kombinationsregeln, Formular)
                                             ├─ Kontingent[] (Positionen, Zeitraum, Grenze, Bezug, Verhalten)
                                             ├─ Zuschlagsregel[] · Feiertag[] · Wegegeldregel · Material[]
                                             └─ Änderungsprotokoll[]
Formularvorlage (HebSet 3.x, PDF-Vorlage, Feld[]: Seite, x/y, Breite, Schrift, Zeilen)
Hebamme (Status aktiv/Babypause/ausgeschieden, IK, Vorlagen)
```

---

## 15. Umsetzungsplan und Roadmap

### Phase 0 – Klärung (2–4 Wochen)
- Workshop mit den drei Hebammen: typischer Tag, Schmerzpunkte, Prioritäten
- **Gespräch mit HebSet** zu Formularvorlagen und Unterschrift (siehe [Kapitel 17](#17-offene-fragen))
- Startregelwerk aus dem Hebammenhilfevertrag zusammenstellen und von der Praxis prüfen lassen
- Datenexport aus Hebamio prüfen (welche Formate, wie vollständig)
- Klickbarer Prototyp (Figma) auf dem Tablet testen

### Phase 1 – MVP: „Der Hausbesuch“ (ca. 3–4 Monate)
M1 Cockpit · M2 Akte · M3 Doku Schwangerschaft/Wochenbett · M5 Kalender · **M6 Routenplanung** · M7 Leistungen + Plausi · **M8 HebSet-PDF-Belege + Versand** · M9 Fahrtenbuch · M25 Admin · **M26 Regelwerk-Administration (mit Startbelegung)** · Offline-Sync
→ **Parallelbetrieb** mit Hebamio für 1–2 Monate, danach Umstieg

### Phase 2 – „Die Praxis“ (ca. 3 Monate)
**M10 Kinderurkunde** · M11 Belegungsplan + Website-Anfrage · M12 Kurse + Online-Anmeldung · M13 Selbstzahler-Rechnungen · M15 Wachstumskurven · M17 Fotos · M18 Vorlagen · M19 Vertretung · M20 Team-Nachrichten · M22 Statistik · M23 Automatisierungen

### Phase 3 – „Vernetzt“ (laufend)
M14 Elternportal · M16 Spracheingabe · M21 QM/Fortbildung · M24 TI (eGK, KIM, ePA) und eLB · M4 Geburtsdoku (bei Bedarf)

### Kündigung Hebamio
Erst nach erfolgreichem Parallelbetrieb und **vollständigem Datenexport** kündigen. Hebamio löscht die Daten 3 Monate nach Kündigung, die Aufbewahrungspflicht bleibt aber bestehen. Altdaten deshalb als PDF/CSV archivieren oder das Hebamio-Langzeitarchiv (79 €/Jahr) nutzen.

---

## 16. Kosten und Wirtschaftlichkeit

### Laufende Kosten heute (Schätzung)
| Posten | Kosten/Jahr |
|---|---|
| Hebamio: 3 × Pro (je 699 €) bzw. je nach gewähltem Tarif | ca. 1.800–2.100 € |
| HebSet: 3 % der Kassenerstattungen (Beispiel 2 aktive Hebammen × 60.000 € Umsatz) | ca. 3.600 € |
| TI-Zusatzkosten (künftig Pflicht) | variabel |

### Laufende Kosten eigene App (Schätzung)
| Posten | Kosten/Jahr |
|---|---|
| Hosting Deutschland (Server, DB, Backups, Routing-Server) | ca. 300–900 € |
| SMS/E-Mail-Dienst | ca. 50–150 € |
| Domain, Zertifikate, Apple-Developer-Konto (falls App Store) | ca. 100 € |
| Wartung, Updates (Regelwerk, Sicherheit): Eigenleistung bzw. Stunden | je nach Modell |

**Bewertung:** Die Einsparung bei den Lizenzkosten ist moderat. Der eigentliche Gewinn liegt in **Zeit** (Routenplanung, keine Doppelerfassung für HebSet, weniger Kürzungen) und in **Funktionen, die es nirgends gibt** (Kinderurkunde, Elternportal, Belegungsplan). Langfristig kann die Praxis mit sauberen digitalen Daten auch den Abrechnungsweg frei wählen.

**Risiken:**
- Verantwortung für Datenschutz, Sicherheit und Verfügbarkeit liegt bei der Praxis
- Änderungen im Hebammenhilfevertrag muss die Praxis selbst in M26 einpflegen. Testrechner und Versionierung reduzieren das Fehlerrisiko, die fachliche Verantwortung für korrekte Werte bleibt aber bei der Praxis
- Abhängigkeit von einer Person als Entwickler: saubere Dokumentation und Datenexport jederzeit
- TI-Pflicht: Bis M24 umgesetzt ist, eine separate TI-Lösung eines Anbieters nutzen

---

## 17. Offene Fragen

### An HebSet (Gesprächsleitfaden)
1. Akzeptiert HebSet **selbst erzeugte, vorausgefüllte PDF-Ausdrucke** statt der Durchschreibesätze? Gibt es die **personalisierte Kopiervorlage als PDF** (für feldgenaues Ausfüllen)?
2. Werden **auf dem Tablet erfasste Unterschriften** der Versicherten auf dem Ausdruck akzeptiert, oder muss auf Papier unterschrieben werden?
3. Ersetzt der Ausdruck mit vollständigen Versichertendaten das **Etikett**?
4. Wünscht HebSet ein **Deckblatt bzw. eine Versandliste** in bestimmter Form, und welche Angaben braucht es für die **Pool-Aufteilung**?
5. Gibt es **Fristen** oder bevorzugte Versandrhythmen?
6. Wie werden **Korrekturen** an bereits eingereichten Belegen gewünscht?

### An die Praxis
1. Werden Haus- oder Beleggeburten betreut (Modul M4 nötig)?
2. Wie wird heute zwischen den Hebammen aufgeteilt (Pool? Einzelabrechnung)? Wer übernimmt die Administration des Regelwerks?
3. Wann endet die Babypause von Lorina (für Belegungsplan und Lizenzen)?
4. Welche Geräte gibt es (iPad? Stift? Android)?
5. Welche Start- und Endpunkte sind typisch (Wohnung, Praxis, Schule, Kita)?
6. Welcher Ton passt für die Kinderurkunde, und soll es eine plattdeutsche Variante geben?
7. Soll es ein Elternportal geben, und wie viel Kontakt außerhalb der Besuche ist gewünscht?
8. Wer entwickelt und betreibt die App (Eigenentwicklung, Freelancer, Agentur)?

---

## 18. Quellen

- Hebamio – Startseite: https://www.hebamio.de/ und https://www.hebamio.de/en/
- Hebamio – Funktionen: https://www.hebamio.de/funktionen/
- Hebamio – Preise: https://www.hebamio.de/unsere-preise_neu/
- Hebamio – FAQ: https://www.hebamio.de/faq/
- Hebamio – eLB integriert: https://www.hebamio.de/en/3-elb-electronic-performance-confirmation-integrated-into-hebamio/
- Hebamio – Beispiel-AGB einer Nutzerin (Abrechnungswege, Online-Anmeldung): https://buehlerbeate.hebamio.de/agb
- HebSet – Startseite: https://www.hebset.de/
- HebSet – Abrechnungsservice: https://www.hebset.de/abrechnungsservice/
- HebSet – Zubehör (Formulare 3.1–3.5, HebSet Print): https://www.hebset.de/zubehoer/
- HebSet – Kooperationen: https://www.hebset.de/kooperationen/
- HebSet Print – Kurzanleitung: https://www.hebset.de/wp-content/uploads/2024/11/hebset_anleitung.pdf
- Hebammenpraxis Kindkesmöön: https://www.hebammen-landkreisrostock.de/
- GKV-Spitzenverband – Hebammenhilfevertrag (ab 01.11.2025): https://www.gkv-spitzenverband.de/media/dokumente/krankenversicherung_1/ambulante_leistungen/hebammen/25-04-02_Hebammenhilfevertrag.pdf
- BfHD – FAQ zum neuen Hebammenhilfevertrag: https://bfhd.de/wp-content/uploads/2025/04/FAQs-Hebammenhilfevertrag-ab-01.11.25.pdf
- Deutscher Hebammenverband – Neuer Hebammenhilfevertrag: https://hebammenverband.de/neuer-hebammenhilfevertrag-festgesetzt-bfhd-und-netzwerk-der-geburtshaeuser-stimmen-im-schiedsstellenverfahren-mit-dem-gkv-spitzenverband
- TK – Elektronische Leistungsbestätigung: https://www.tk.de/presse/themen/medizinische-versorgung/ambulante-versorgung/elektronische-leistungsbestaetigung-2177186
- eLeistungsbestätigung: https://www.eleistungsbestaetigung.de/start/
- TI für Hebammen: https://www.telekonnekt.de/artikel/was-mir-die-telematik-als-hebamme-bringt · https://www.cgm.com/deu_de/loesungen/weitere-institutionen/ti-anbindung/ti-fuer-hebammen.html

> **Hinweis:** Preise, Vertragsdetails (GPOS, Kontingente, Wegegeld) und HebSet-Abläufe stammen aus öffentlich zugänglichen Quellen vom Oktober 2026 und müssen vor der Umsetzung mit den Originaldokumenten bzw. direkt mit HebSet abgeglichen werden.
