# Konzept: Praxis-App „Kindkesmöön“

**Eigene Software für die Hebammenpraxis Kindkesmöön, Bad Doberan**
Stand: 01.10.2026 · Version 1.0 (Entwurf)

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
| **Team** | 3 Hebammen (eine Inhaberin, zwei weitere) |
| **Einzugsgebiet** | Bad Doberan, Rostock, Börgerende-Rethwisch, Kröpelin und weitere Gemeinden im Landkreis Rostock. Das bedeutet viele Hausbesuche und lange Fahrten über Land. |
| **Leistungen** | Schwangerschaftsvorsorge, Schwangerschaftsmassage, Wochenbettbetreuung, Geburtsvorbereitungskurse, Babymassage, Eltern-Kind-Kurse, Akupunktur, Kinesio-Taping |
| **Software heute** | Hebamio (webbasiert, Jahreslizenz) |
| **Abrechnung heute** | HebSet KG (Abrechnungszentrum, 3 % der erstatteten Leistungen) |
| **Online-Präsenz** | Website mit Kontaktformular, Instagram @hebammenpraxis_kindkesmoen |

**Wichtigste Erkenntnis aus der Recherche:** Die Praxis bezahlt heute doppelt für die Abrechnung, einmal über die Hebamio-Lizenz (die eigene Kassenabrechnung ist ab dem Basic-Tarif enthalten) und einmal über die 3 % an HebSet. HebSet nimmt Leistungen laut eigener Website **auf Papier** an, über Durchschreibesätze bzw. personalisierte Kopiervorlagen. Einen digitalen Weg von Hebamio zu HebSet gibt es nach den Hebamio-AGB nur „postalisch“. Genau hier kann eine eigene App am meisten Zeit sparen (siehe [Kapitel 8](#8-hebset-übertragung-konzept)).

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

Beispielregeln für die Plausibilitätsprüfung (vor der Umsetzung gegen den Vertragstext prüfen):
- Frühes Wochenbett (Tag 1–10): höchstens 20 Kontakte; Tag 1–3 bis zu 120 Minuten auf 2 Kontakte verteilt
- Spätes Wochenbett (Tag 11 bis Ende 12. Woche): 16 Kontakte, höchstens 60 Minuten je Besuch
- Mehrlingszuschlag bis zu 10 Minuten je Kind und Kontakt
- Wegegeld laut Recherche 0,97 € je gefahrenem Kilometer (die genaue Regelung muss aus dem Vertrag übernommen werden)

> **Fazit HebSet:** HebSet ist ein papierbasierter Dienstleister. Die beste mögliche Übertragung besteht daher aus (a) perfekt vorausgefüllten, formulargetreuen Belegen direkt aus der App und (b) dem Versuch, mit HebSet einen digitalen Einreichungsweg zu vereinbaren. Details in [Kapitel 8](#8-hebset-übertragung-konzept).

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
| M8 | **HebSet-Brücke** (Beleggenerator, Export, Rückabgleich) | ⭐ NEU | 1–2 |
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
- Teamansicht (3 Spalten, je Hebamme), Kursräume, Praxisraum-Belegung
- Kalendersynchronisation (ICS-Abo) mit dem privaten Kalender, nur mit Initialen, ohne Gesundheitsdaten
- Terminbestätigung bzw. -erinnerung per SMS/E-Mail an Eltern (optional)

### M7 – Leistungserfassung und Plausibilitätsprüfung
- Leistung entsteht automatisch aus dem Termin; Dauer aus Check-in/Check-out (Start/Stopp-Knopf)
- **Regelwerk Hebammenhilfevertrag** als versionierte Konfiguration (Gültigkeitszeiträume, damit Änderungen im Vertrag nur Daten und keinen Code betreffen)
- Prüfungen: Kontingente, Zeitfenster (Lebenstag des Kindes), Zuschläge (Nacht/Wochenende/Feiertag MV), doppelte Leistungen, fehlende Anordnung, Mehrlinge
- Status: *erfasst → geprüft → unterschrieben/bestätigt → an HebSet übergeben → abgerechnet → bezahlt*
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
- Kurstypen (Geburtsvorbereitung, Babymassage, Eltern-Kind, Rückbildung), Termine, Räume, Kursleitung
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
- Auswertung gegen HebSet-Auszahlungen (siehe Rückkanal in Kapitel 8)

### M23 – Erinnerungen und Automatisierungen
- „ET in 2 Wochen → Erstbesuch Wochenbett vorbereiten“
- „Kind 8 Wochen → Rückbildungskurs anbieten“
- „Betreuung endet in 7 Tagen → Kinderurkunde vorbereiten“
- „Leistungen älter als X Tage nicht übergeben → HebSet-Paket erstellen“
- „U-Untersuchung fällig“ (Hinweis für die Eltern)

### M24 – TI und eLB (Phase 3)
- eGK-Einlesen über ein zugelassenes Kartenterminal bzw. TI-Gateway (Anbieter wie CGM, telekonnekt). Ersetzt dann das HebSet-Print-Lesegerät
- KIM-Postfach für Arztbriefe, ePA/elektronischer Mutterpass lesen
- eLB: Leistungsbestätigung über die Kassen-App der Versicherten (nur, wenn auch der Abrechnungsweg sie unterstützt; mit HebSet klären)

### M25 – Administration
- Rollen: **Inhaberin** (alles), **Hebamme** (eigene und vertretene Fälle), **Büro/Verwaltung** (optional, ohne medizinische Daten)
- Audit-Log, Geräteverwaltung (verlorenes Tablet sperren), automatische Backups, Export aller Daten (keine Abhängigkeit vom Anbieter)

---

## 8. HebSet-Übertragung: Konzept

### 8.1 Ziel
Keine Doppelerfassung und kein händisches Ausfüllen der Durchschreibesätze mehr. HebSet soll Belege bekommen, die **vollständig, plausibel und sofort abrechenbar** sind. Das beschleunigt auch die Auszahlung.

### 8.2 Stufenmodell

Weil HebSet öffentlich keine digitale Schnittstelle anbietet, plant die App drei Stufen. Stufe A funktioniert sofort ohne Mitwirkung von HebSet.

```
 Besuch dokumentiert ──► Leistung (GPOS, Zeit, km) ──► Plausi-Prüfung ──► Unterschrift / eLB
                                                                              │
                     ┌────────────────────────────────────────────────────────┤
                     ▼                              ▼                         ▼
           A) Formulargetreues PDF      B) Digitales Paket            C) Rückkanal
              (3.1–3.5, Zusatzbogen)       PDF + CSV/XLSX/JSON           HebSet-Auszahlungs-
              → drucken & per Post         → sicherer Upload/E-Mail      auswertung importieren
                 (oder Scan/Fax/Mail,         (nach Absprache)           → Abgleich „bezahlt“
                  falls HebSet erlaubt)
```

#### Stufe A – Formulargetreuer Beleggenerator (Phase 1, ohne Abhängigkeiten)
- Die App erzeugt pro Betreuungsfall und Abrechnungszeitraum ein PDF **im Layout der HebSet-Formulare** 3.1 Schwangerschaft, 3.2 Außerklinische Geburt, 3.3 Wochenbett, 3.4 Kurse, 3.5 Beleghebamme und Zusatzbogen.
  - Ideal: HebSet stellt die **personalisierte Kopiervorlage** als PDF bereit (laut Website gibt es sie). Die App füllt sie dann pixelgenau aus.
  - Alternativ: Nachbau der Formularstruktur 1:1 nach Vorlage. Vorher von HebSet freigeben lassen.
- Inhalt: Versichertendaten (ersetzt das Etikett), Kind, ET bzw. Geburtsdatum, alle Leistungszeilen mit Datum, Uhrzeit, Dauer, GPOS, Hausbesuch-Kennzeichen, Zuschlägen, Kilometern, Material, Anordnung; IK und Unterschrift der Hebamme.
- **Unterschrift der Versicherten**: Sie wird pro Besuch digital auf dem Tablet erfasst und in die Unterschriftsspalte des PDFs übernommen. Ob HebSet bzw. die Kassen digital erfasste Unterschriften auf dem Ausdruck akzeptieren, muss geklärt werden. Fallback: Ausdruck vor Ort unterschreiben lassen (mobiler Drucker) oder Sammelunterschrift beim letzten Besuch.
- **Sammelversand**: Knopf „HebSet-Paket erstellen“ bündelt alle übergabebereiten Belege (z. B. halbmonatlich passend zu den Auszahlungsterminen), druckt sie mit einem Deckblatt (Liste der Fälle, Summen, Anzahl Blätter) und setzt sie auf „übergeben“.
- **Pool-Abrechnung**: Pro Leistung wird die erbringende Hebamme gespeichert. Das Deckblatt enthält auf Wunsch eine Stundenübersicht je Hebamme für die Poolaufteilung bei HebSet.

#### Stufe B – Digitales Paket (Phase 2, nach Absprache mit HebSet)
Vorschlag an HebSet. Gesprächsleitfaden siehe [Kapitel 17](#17-offene-fragen).
- **Inhalt**: (1) die PDFs aus Stufe A und (2) eine strukturierte Datei pro Paket:
  - CSV/XLSX für die manuelle Erfassung bei HebSet, oder
  - JSON/XML, falls HebSet eine eigene Software mit Importfunktion nutzt.
- **Übertragungsweg**, in dieser Reihenfolge der Präferenz:
  1. Upload-Portal bzw. API von HebSet (falls vorhanden)
  2. KIM-Nachricht (sobald beide Seiten TI haben)
  3. Ende-zu-Ende-verschlüsselte E-Mail (S/MIME oder passwortgeschütztes ZIP, Passwort auf separatem Weg)
  4. Sicherer Download-Link (zeitlich begrenzt, z. B. aus der eigenen Cloud)
- **Beispiel einer Datenzeile (CSV)**:

```csv
paket_id;hebamme_ik;versicherte_nachname;versicherte_vorname;geburtsdatum;kasse_ik;versichertennr;kind_name;kind_geburtsdatum;formular;datum;von;bis;gpos;hausbesuch;zuschlag;km;material;anordnung;unterschrift_art
2026-10-A;123456789;Muster;Anna;1993-04-12;101575519;A123456789;Ole Muster;2026-09-20;3.3;2026-09-22;09:10;09:55;3xxx1;ja;nein;14,2;;;tablet
```

- **Prüfsumme und Quittung**: Jedes Paket bekommt eine ID und eine Summenprüfung. HebSet bestätigt den Eingang (manuell oder automatisch).

#### Stufe C – Rückkanal / Zahlungsabgleich (Phase 2)
- HebSet erstellt Auszahlungsübersichten und Auswertungen. Diese werden (PDF/CSV) in die App importiert oder per Hand abgehakt.
- Die App gleicht pro Beleg ab: *abgerechnet / gekürzt / abgelehnt / offen*. Kürzungen erscheinen im Cockpit mit Grund, damit dieselben Fehler nicht wieder passieren.
- Statistik „erwarteter vs. ausgezahlter Betrag“, abzüglich 3 % HebSet-Gebühr.

### 8.3 eGK-Daten ohne HebSet-Print
- Kurzfristig: Versichertendaten **einmal** aus HebSet Print bzw. der Karte abtippen oder per Foto der eGK mit Texterkennung (OCR) auf dem Gerät übernehmen. Danach stehen sie automatisch auf jedem Beleg; Etiketten sind nicht mehr nötig.
- Mittelfristig (TI, Phase 3): eGK über ein zugelassenes Kartenterminal direkt in die App einlesen.

### 8.4 Alternative: eigene Direktabrechnung (nicht empfohlen für den Start)
Elektronische Abrechnung nach § 302 SGB V (Datenaustausch mit den Kassen) erfordert Zertifizierung, Kostenträgerdateien, Testverfahren und laufende Pflege. Das ist für eine Eigenentwicklung unverhältnismäßig. Wenn die Praxis HebSet irgendwann ersetzen will, wäre ein zertifizierter Abrechnungsdienst mit **dokumentierter API** sinnvoller als eine Eigenzertifizierung. Die App liefert die Daten dann über denselben Exportkern (Stufe B).

### 8.5 Zeitersparnis (Schätzung)
Bei etwa 8 Wochenbett-Kontakten pro Woche und Hebamme × 3 Hebammen mit je 2–3 Minuten Formular- und Etikettenarbeit sind das rund 1–1,5 Stunden pro Woche für die Praxis. Dazu kommen weniger Rückfragen und Kürzungen durch die Plausibilitätsprüfung.

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

   > *„Lieber Ole, am 20. September 2026 um 04:12 Uhr bist du in Rostock auf die Welt gekommen und hast deine Familie zur glücklichsten der Welt gemacht. In den ersten Wochen durfte ich dich und deine Eltern begleiten: Du hast tapfer getrunken, fleißig zugenommen und uns mit deinem ersten Lächeln beschenkt. Nun bist du groß genug, und meine Zeit als deine Kindkes-Möön ist vorbei. Ich wünsche dir eine wunderbare Zukunft! – Deine Hebamme Anna“*

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
│  • Regelwerk-Service (Hebammenhilfevertrag, versioniert)                                    │
│  • Routing: VROOM + OSRM/OpenRouteService (OSM-Daten Mecklenburg-Vorpommern)                │
│  • PDF-Service (HebSet-Belege, Urkunden, Rechnungen, Briefe)                                │
│  • Benachrichtigungen (E-Mail, SMS-Gateway DE, Push)                                        │
└──────────────────────────────────────────┬─────────────────────────────────────────────────┘
               ┌───────────────────────────┼───────────────────────────────┐
               ▼                           ▼                               ▼
       Website Kindkesmöön         HebSet (Paket: PDF/CSV)          TI-Gateway (Phase 3)
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
| Rollen | Need-to-know: Hebammen sehen eigene und vertretene Fälle; Inhaberin sieht alles; Büro nur Verwaltungsdaten |
| Protokoll | Unveränderbares Audit-Log (wer hat wann was gesehen bzw. geändert) |
| Geräte | Verlorenes Gerät aus der Ferne abmelden und lokale Daten unbrauchbar machen |
| Backups | Täglich, verschlüsselt, an einem zweiten Standort in Deutschland; Wiederherstellung regelmäßig testen |
| Löschung | Aufbewahrungsfristen automatisch überwachen, danach Löschvorschlag |
| Einwilligungen | Elternportal, Fotos, Kinderurkunde, SMS/E-Mail digital erfasst und widerrufbar |
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
                    └─ HebSet-Beleg[] (Formular 3.x, Zeitraum, PDF, Paket-ID, Abrechnungsstatus)

Tour (Datum, Hebamme, Start, Ziel, Zeitfenster Ende) ─ Stopp[] → Termin
HebSet-Paket (ID, Datum, Belege[], Summen, Übergabeweg, Quittung)
Kurs ─ Kurstermin[] ─ Teilnahme[] (Anwesenheit → Leistung/Rechnung)
Regelwerk (Version, gültig von/bis, Positionen, Kontingente, Wegegeld-Regeln)
```

---

## 15. Umsetzungsplan und Roadmap

### Phase 0 – Klärung (2–4 Wochen)
- Workshop mit den drei Hebammen: typischer Tag, Schmerzpunkte, Prioritäten
- **Gespräch mit HebSet** (siehe [Kapitel 17](#17-offene-fragen))
- Datenexport aus Hebamio prüfen (welche Formate, wie vollständig)
- Klickbarer Prototyp (Figma) auf dem Tablet testen

### Phase 1 – MVP: „Der Hausbesuch“ (ca. 3–4 Monate)
M1 Cockpit · M2 Akte · M3 Doku Schwangerschaft/Wochenbett · M5 Kalender · **M6 Routenplanung** · M7 Leistungen + Plausi · **M8 HebSet-Beleggenerator (Stufe A)** · M9 Fahrtenbuch · M25 Admin · Offline-Sync
→ **Parallelbetrieb** mit Hebamio für 1–2 Monate, danach Umstieg

### Phase 2 – „Die Praxis“ (ca. 3 Monate)
**M10 Kinderurkunde** · M11 Belegungsplan + Website-Anfrage · M12 Kurse + Online-Anmeldung · M13 Selbstzahler-Rechnungen · M15 Wachstumskurven · M17 Fotos · M18 Vorlagen · M19 Vertretung · M20 Team-Nachrichten · M22 Statistik · M23 Automatisierungen · **M8 Stufe B/C**

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
| HebSet: 3 % der Kassenerstattungen (Beispiel 3 × 60.000 € Umsatz) | ca. 5.400 € |
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
- Änderungen im Hebammenhilfevertrag müssen eingepflegt werden; das versionierte Regelwerk reduziert den Aufwand
- Abhängigkeit von einer Person als Entwickler: saubere Dokumentation und Datenexport jederzeit
- TI-Pflicht: Bis M24 umgesetzt ist, eine separate TI-Lösung eines Anbieters nutzen

---

## 17. Offene Fragen

### An HebSet (Gesprächsleitfaden)
1. Gibt es eine **digitale Einreichung** (Upload-Portal, E-Mail, API, KIM)? In welchem Format (PDF, CSV, XML)?
2. Akzeptiert HebSet **selbst erzeugte, formulargetreue PDF-Ausdrucke** statt der Durchschreibesätze? Gibt es die **personalisierte Kopiervorlage als PDF**?
3. Werden **digital erfasste Unterschriften** der Versicherten (Tablet) auf dem Ausdruck akzeptiert, oder muss auf Papier unterschrieben werden?
4. Unterstützt HebSet die **eLB** (elektronische Leistungsbestätigung)?
5. Kann HebSet **Auszahlungs- und Kürzungsdaten digital** (CSV) bereitstellen?
6. Welche Felder sind für die **Pool-Abrechnung** nötig?
7. Gibt es bestehende Software-Partner mit Schnittstelle, an deren Format man sich anlehnen kann?

### An die Praxis
1. Werden Haus- oder Beleggeburten betreut (Modul M4 nötig)?
2. Wie wird heute zwischen den drei Hebammen aufgeteilt (Pool? Einzelabrechnung)?
3. Welche Geräte gibt es (iPad? Stift? Android)?
4. Welche Start- und Endpunkte sind typisch (Wohnung, Praxis, Schule, Kita)?
5. Welcher Ton passt für die Kinderurkunde, und soll es eine plattdeutsche Variante geben?
6. Soll es ein Elternportal geben, und wie viel Kontakt außerhalb der Besuche ist gewünscht?
7. Wer entwickelt und betreibt die App (Eigenentwicklung, Freelancer, Agentur)?

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
