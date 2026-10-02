# Konzept: Praxis-App „Kindkesmöön“

**Eigene Software für die Hebammenpraxis Kindkesmöön, Bad Doberan**
Stand: 01.10.2026 · Version 2.0 (Entwurf)

---

## Inhalt

1. [Ausgangslage](#1-ausgangslage)
2. [Recherche: Was Hebamio kann](#2-recherche-was-hebamio-kann)
3. [Recherche: Abrechnung über HebSet](#3-recherche-abrechnung-über-hebset)
4. [Rechtlicher und fachlicher Rahmen](#4-rechtlicher-und-fachlicher-rahmen)
5. [Ziele und Leitprinzipien der neuen App](#5-ziele-und-leitprinzipien-der-neuen-app)
6. [Modulübersicht](#6-modulübersicht)
7. [Module im Detail](#7-module-im-detail)
8. [Abrechnung und Übertragung an HebSet: Konzept](#8-abrechnung-und-übertragung-an-hebset-konzept)
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
| **Abrechnung heute** | HebSet KG (Abrechnungszentrum, 3 % der erstatteten Leistungen); jede Hebamme rechnet einzeln ab |
| **Vertragsgrundlage** | Hebammenhilfevertrag nach § 134a SGB V, aktuelle Fassung **gültig ab 01.04.2026** ([`docs/hebammenhilfevertrag-ab-2026-04-01.pdf`](hebammenhilfevertrag-ab-2026-04-01.pdf)) |
| **Online-Präsenz** | Website mit Kontaktformular, Instagram @hebammenpraxis_kindkesmoen |

**Wichtigste Erkenntnis aus der Recherche:** Die Praxis bezahlt heute doppelt für die Abrechnung, einmal über die Hebamio-Lizenz (die eigene Kassenabrechnung ist ab dem Basic-Tarif enthalten) und einmal über die 3 % an HebSet. HebSet nimmt Leistungen laut eigener Website **auf Papier** an, über Durchschreibesätze bzw. personalisierte Kopiervorlagen. Einen digitalen Weg von Hebamio zu HebSet gibt es nach den Hebamio-AGB nur „postalisch“. Die neue App bleibt beim Papierweg, füllt die Belege aber vollständig automatisch als PDF aus (siehe [Kapitel 8](#8-abrechnung-und-übertragung-an-hebset-konzept)).

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
| **Formulare** | 3.1 Schwangerschaft · 3.2 Außerklinische Geburt · 3.3 Wochenbett · 3.4 Kurse · 3.5 Beleghebamme (das sind die amtlichen Formulare aus Anlage 6 des Hebammenhilfevertrags, siehe 3.3) · dazu ein eigener HebSet-Zusatzbogen „Zusätzliche Leistungen“ |
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

### 3.3 Die Formulare sind Teil des Vertrags

Die Formulare 3.1–3.5 sind **keine HebSet-Formulare**, sondern die amtlichen **Versichertenbestätigungen aus Anlage 6 des Hebammenhilfevertrags** HebSet verkauft sie lediglich als Durchschreibesätze. Die leeren Vorlagen liegen im Repository unter `docs/vorlagen/`, je für die Fassung ab 01.11.2025 und die aktuelle Fassung ab 01.04.2026. Damit braucht die App keine Kopiervorlage von HebSet.

Aufbau aller fünf Formulare:
- **Kopf**: Rechnungsnummer, Krankenkasse, Name und Geburtsdatum der Versicherten, Krankenkassen-IK, Versichertennummer, ET, Geburtsdatum Kind
- **Hebammentabelle** (bis 8 Zeilen): Name, Heb-Nr., IK bzw. „angestellt“. Mehrere Hebammen können auf einem Blatt quittieren lassen, praktisch für Vertretungen in der Praxis. Bei Kindkesmöön sind **alle drei Hebammen freiberuflich**: Jede steht mit ihrem **eigenen IK** in der Tabelle, „angestellt“ kommt nicht vor.
- **Leistungszeilen** (Fassung 2026: 15 je Blatt, Formular 3.5: 11): Heb-Nr., Datum, Uhrzeit von/bis, je Leistungsart eine Spalte, in die die **Endziffer** (1 aufsuchend, 2 nicht-aufsuchend, 3 Video; bei Kursen 2/3/6) eingetragen wird. Die Telefonkurzberatung (4) steht seit 01.04.2026 nicht mehr auf den Formularen und ist damit nicht quittierungspflichtig; Materialspalten zum Ankreuzen; Unterschrift der Versicherten; Kreuz für Begründung
- **Begründungen und Vermerke** (Freitext); bei 3.5 zusätzlich ein Block für die ärztliche Anordnung
- Der **Zuschlag** wird nicht eingetragen, er ergibt sich aus Datum und Uhrzeit.
- **Wegegeld und einige Materialpauschalen** (z. B. Wochenbett lang/kurz 61200/61300) stehen nicht auf den Formularen. Sie sind nicht quittierungspflichtig und gehören nur zu den Abrechnungsdaten (siehe Kapitel 8.6).
- **Änderungen der Fassung 2026**: Formular 3.1 „geplanter Geburtsort nach Aufklärungsgespräch“; 3.2 ohne Spalte Neugeborenenscreening und ohne „nicht vollendete Geburt“ im Kopf; 3.3 mit Spalte Entnahme Körpermaterial (Frau), Angabe Abort/Fehlgeburt und Mehrlingsanzahl; 3.5 mit den neuen befristeten Positionen 109X5/110X5 und neu gestalteter Anordnung.

### 3.4 Gebührenstruktur (Hebammenhilfevertrag ab 01.04.2026)

Fünfstellige Gebührenpositionen (GPOS), die sich gut maschinell prüfen lassen:

| Stelle | Bedeutung |
|---|---|
| 1 | Kategorie: 1 Schwangerschaft · 2 Geburt · 3 Wochenbett · 4 Kurse · 5 Wegegeld · 6 Material |
| 2–3 | Laufende Nummer |
| 4 | Zuschlag: 0 ohne · 1 mit |
| 5 | Art: 0 keine Angabe · 1 Hausbesuch · 2 kein Hausbesuch · 3 Video · 4 Telefon · 5 Beleghebamme · 6 Selbstlerneinheit |

Das komplette Vergütungsverzeichnis ist als Startbelegung für Modul M26 aus dem Vertrag extrahiert, inklusive Kontingenten, Zuschlags-, Feiertags- und Wegegeldregeln, Fristen und der Spalten der Formulare:
- **aktuell** (ab 01.04.2026, 129 Positionen, 24 Kontingente): [`regelwerk/hhv-2026-04-01.json`](../regelwerk/hhv-2026-04-01.json), zum Prüfen in Excel [`regelwerk/hhv-2026-04-01-positionen.csv`](../regelwerk/hhv-2026-04-01-positionen.csv)
- **Vorgänger** (01.11.2025–31.03.2026, für Nachträge): [`regelwerk/hhv-2025-11-01.json`](../regelwerk/hhv-2025-11-01.json)

Änderungen zum 01.04.2026: neue befristete Beleg-Positionen 109X5/110X5 (Abklärung akuter Behandlungsbedarf, bis 31.12.2027), 1:1-Zulage 203X5 jetzt je Einheit (2,17 €/2,53 €, genau 48 Einheiten) statt Pauschale, Materialpauschale 60300 auch einmalig im Wochenbett, Telefonkurzberatung nicht mehr quittierungspflichtig. Alle übrigen Beträge sind unverändert.

Die wichtigsten Regeln:
- **Vergütung in 5-Minuten-Einheiten**: 6,19 € je Einheit, mit Zuschlag 7,24 € (Beleghebamme 4,95 € / 5,79 €)
- **Zuschlag**: nachts 21–6 Uhr, samstags ab 12 Uhr, sonn- und feiertags (MV inkl. Frauentag und Reformationstag); maßgeblich ist der Beginn der jeweiligen Einheit
- **Frühes Wochenbett** (301XX, Lebenstag 1–10): max. 20 Kontakte, max. 2 pro Tag (nur der zweite per Video), max. 90 Min. pro Tag; an Lebenstag 1–3 und am Tag des ersten Hausbesuchs bis 120 Min.
- **Spätes Wochenbett** (303XX, Lebenstag 11 bis Ende 12. Lebenswoche): max. 16 Kontakttage, 1 pro Tag, max. 60 Min.
- **Mehrlinge**: je weiterem Kind bis zu 10 Min. zusätzlich
- **Still- und Ernährungsschwierigkeiten** (306XX): ab 13. Lebenswoche, 8 Kontakttage, max. 45 Min.
- **Kurse** je Teilnehmerin: Geburtsvorbereitung Gruppe 0,95 € je Einheit, bis 14 Std.; Rückbildung Gruppe bis 10 Std. und bis Ende 9. Monat; max. die Hälfte als Selbstlernvideo
- **Wegegeld**: 0,97 € je km (50100), kürzeste Strecke, max. 25 km (bis 50 km nur mit Begründung); mehrere Frauen auf einem Weg: Gesamtstrecke geteilt durch Anzahl (50200); **keine** Erstattung für Wege zu Kursen und Sprechstunden in der Praxis
- **Materialpauschalen**: z. B. Wochenbett lang 35,17 € (Betreuung bis Tag 4 übernommen) bzw. kurz 21,79 €
- **Fristen**: höchstens einmal im Monat, mindestens zweimal im Jahr einreichen; Ausschlussfrist 30.06. für Leistungen des Vorjahres

> **Fazit HebSet:** HebSet ist ein papierbasierter Dienstleister, und die Formulare sind amtlich. Die App erzeugt daher vollständig **vorausgefüllte, formulargetreue PDF-Belege**, die ausgedruckt und per Post verschickt werden. Details in [Kapitel 8](#8-abrechnung-und-übertragung-an-hebset-konzept).

---

## 4. Rechtlicher und fachlicher Rahmen

| Thema | Bedeutung für die App |
|---|---|
| **DSGVO Art. 9** | Gesundheitsdaten sind besonders geschützt: Verschlüsselung, Rollen, Protokollierung, Auftragsverarbeitungsverträge (AVV) mit allen Dienstleistern, Hosting in Deutschland bzw. der EU |
| **§ 203 StGB** | Berufsgeheimnis: Dienstleister mit Datenzugriff müssen zur Verschwiegenheit verpflichtet werden |
| **Dokumentationspflicht** | Berufsordnung für Hebammen in Mecklenburg-Vorpommern: Dokumentation vollständig, nachvollziehbar und unveränderbar (Änderungen versioniert); Aufbewahrungsfrist mindestens 10 Jahre (genaue Frist bei Kindern prüfen) |
| **Hebammenhilfevertrag (§ 134a SGB V)** | Fassung ab 01.04.2026. Gebührenpositionen, Zeitkontingente, Wegegeld, Abrechnungsfristen (Anlage 2), Fortbildung und QM (Anlage 3). Grundlage für Plausibilitätsprüfung und Erinnerungen |
| **Versichertenbestätigung (§ 12 Anlage 1.1)** | Die Versicherte muss **unverzüglich nach jeder Leistung** unterschreiben. Unzulässig sind Vordatierung, Globalbestätigung, Blankounterschrift und nachträgliche Unterschrift. Korrektur nur durch Streichen der ganzen Zeile und neue Unterschrift. Elektronische Signatur auf PDF ist ausdrücklich nur bei **Videobetreuung** geregelt; abweichende digitale Verfahren können Hebammen und Kassen vereinbaren (Anlage 2) |
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
6. **Herz.** Kinderurkunde, das Branding „Kindkesmöön“ und eine Prise Plattdeutsch.
7. **Sicher und rechtskonform** von Anfang an.

### 5.1 Entscheidungen der Praxis (Stand 01.10.2026)

| Thema | Entscheidung |
|---|---|
| Belegart | Eigendruck der amtlichen Formulare **und** Durchschreibesatz, beides umgesetzt, je Hebamme wählbar |
| Unterschrift | Papier **und** Tablet, beides umgesetzt, je Hebamme wählbar |
| Etiketten | Entfallen |
| Abrechnung | Jede Hebamme rechnet einzeln ab; Abrechnungsweg je Hebamme einstellbar (HebSet, andere Abrechnungsstelle, selbst) |
| Versandrhythmus | Individuell je Hebamme, nur vertragskonforme Rhythmen, mit Erinnerungen und Fristen aus dem Vertrag |
| Beschäftigung | Alle drei Hebammen freiberuflich mit eigenem IK |
| Geräte | iPad mit Stift, die App muss auch ohne Stift voll bedienbar sein |
| Start-/Endpunkte | Je Hebamme konfigurierbar (private Anschrift, Schule, Kita …), dazu der Praxisstandort |
| Geburtshilfe | Vorerst keine Haus- oder Beleggeburten (M4 und Formulare 3.2/3.5 nicht im MVP, Regelwerk enthält sie trotzdem) |
| Datenübernahme aus Hebamio | Vorerst nicht, Start mit leerem Bestand |
| Regelwerk-Änderungen | Jede Hebamme darf ändern, eine **andere** Hebamme muss bestätigen (Vier-Augen-Prinzip) |
| Babypause Lorina | Fiktives Ende **01.03.2027** als Platzhalter |
| Kinderurkunde | Wie in Kapitel 10 beschrieben |
| Elternportal | **Out of Scope** |
| Eigendruck und Tablet-Unterschrift bei HebSet | Werden akzeptiert (Voreinstellung: Eigendruck) |
| Wegegeld-Ausgangspunkt | Laut Routenkonfiguration; Standard ist der **Wohnort der Hebamme** |
| Selbstzahler-Preise | Administrierbar; Start mit plausiblen Dummydaten ([`konfiguration/selbstzahler-preisliste.json`](../konfiguration/selbstzahler-preisliste.json)) |
| Fortbildung | Laut Vertrag 40 Unterrichtsstunden in 3 Jahren |
| Entwicklung und Betrieb | Entwicklung durch Claude (KI-gestützt, in diesem Repository); Betrieb durch den Auftraggeber auf einem eigenen **VPS bei Hostinger** |

---

## 6. Modulübersicht

Legende: **H** = gibt es auch in Hebamio · **⭐ NEU** = Eigenidee bzw. Mehrwert gegenüber Hebamio

| # | Modul | Herkunft | Phase |
|---|---|---|---|
| M1 | Cockpit / Tagesübersicht | H, erweitert | 1 |
| M2 | Klientinnen- und Kinderverwaltung (Akte) | H | 1 |
| M3 | Dokumentation Schwangerschaft / Wochenbett | H | 1 |
| M4 | Dokumentation Geburt (falls später Beleg- oder Hausgeburten) | H | später |
| M5 | Termine und Teamkalender | H | 1 |
| M6 | **Automatische Routenplanung** | ⭐ NEU | 1 |
| M7 | Leistungserfassung und Plausibilitätsprüfung | H | 1 |
| M8 | **Abrechnungsunterlagen** (Formulare als PDF, Abrechnungsdatenblatt, Versandmappe, Fristen) | ⭐ NEU | 1 |
| M9 | Fahrtenbuch und Wegegeld (automatisch aus der Route) | H, ⭐ automatisiert | 1 |
| M10 | **Kinderurkunde** | ⭐ NEU | 2 |
| M11 | **Anfrage- und Belegungsplan nach Entbindungstermin** | ⭐ NEU | 2 |
| M12 | Kursverwaltung und Online-Anmeldung | H | 2 |
| M13 | Selbstzahler-Rechnungen (IGeL) und EÜR-Export | H | 2 |
| M14 | ~~Elternportal / Eltern-App~~ | ⭐ NEU | Out of Scope |
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
- Flaggen (Risiko, Sprache, Sozialdienst), Allergien, Einwilligungen (Foto, Kinderurkunde, E-Mail)
- Zuständige Hebamme und Vertretung
- Volltextsuche, Filter (Status, Hebamme, Ort, Entbindungstermin)
- Import der Bestandsdaten aus Hebamio (CSV-Export, falls verfügbar, oder einmalige Übernahme)

### M3 – Dokumentation Schwangerschaft / Wochenbett
- **Besuchsdokumentation als schnelle Maske**: Vitalwerte Mutter (RR, Puls, Temperatur), Fundus/Lochien, Brust/Stillen, Wunde/Naht, Psyche (z. B. EPDS-Fragebogen); Kind: Gewicht, Temperatur, Hautfarbe/Ikterus, Nabel, Ausscheidung, Trinkverhalten
- **Persönliche Ansicht** (umgesetzt): jede Hebamme legt unter Einstellungen → Dokumentation fest, welche Felder sichtbar sind und bei welchen der Wert des letzten Besuchs zum Vergleich erscheint (bei Zahlen mit Differenz). Ausgeblendete Felder lassen sich im Besuch mit „Weitere Felder“ einblenden, Felder mit Wert erscheinen immer. Die Kacheln Mutter und Kind sind auf- und zuklappbar, standardmäßig zugeklappt (je Hebamme änderbar); zugeklappt zeigen sie eine Kurzfassung der eingetragenen Werte.
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
- **Unterschrift der Versicherten unmittelbar nach jeder Leistung** (Vertragspflicht, siehe Kapitel 8.5); die App erinnert beim Beenden des Besuchs daran

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

### M14 – Elternportal / Eltern-App ⭐ (Out of Scope)
> Von der Praxis vorerst ausgeschlossen. Die Ideen bleiben als Ausblick erhalten.

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
- **Umgesetzt (Gewicht):** eigene Seite je Kind mit Perzentilkurve nach Lebenstag (WHO weight-for-age, LMS-Werte je Tag 0–365 aus den offiziellen WHO-Tabellen, P3/P15/P50/P85/P97), Tabelle aller Gewichtswerte mit Lebenstag, Veränderung zum Vorwert, g/Tag, % zum Geburtsgewicht und Perzentile; Kennzahlen tiefster Wert und Wiedererreichen des Geburtsgewichts.
- **Umgesetzt (Länge und Kopfumfang):** Reiter Gewicht/Länge/Kopfumfang auf der Wachstumsseite und im Fenster aus dem Besuch, WHO length-for-age und head-circumference-for-age (LMS je Tag 0–365), Geburtswerte aus der Kinderakte, Werte aus der Besuchsdokumentation, Tabelle mit Veränderung zum Vorwert, seit Geburt und Perzentile.

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
- Offene Beträge: versendet, aber noch nicht als bezahlt abgehakt (siehe Kapitel 8.7)

### M23 – Erinnerungen und Automatisierungen
- „ET in 2 Wochen → Erstbesuch Wochenbett vorbereiten“
- „Kind 8 Wochen → Rückbildungskurs anbieten“
- „Betreuung endet in 7 Tagen → Kinderurkunde vorbereiten“
- „Übergabebereite Belege vorhanden → HebSet-Versand vorbereiten (1. und 15.)“
- „U-Untersuchung fällig“ (Hinweis für die Eltern)
- „Ausschlussfrist 30.06.: Leistungen aus dem Vorjahr noch nicht versendet“

### M24 – TI und eLB (Phase 3)
- eGK-Einlesen über ein zugelassenes Kartenterminal bzw. TI-Gateway (Anbieter wie CGM, telekonnekt). Ersetzt dann das HebSet-Print-Lesegerät
- KIM-Postfach für Arztbriefe, ePA/elektronischer Mutterpass lesen
- eLB: Leistungsbestätigung über die Kassen-App der Versicherten (nur, wenn auch der Abrechnungsweg sie unterstützt; mit HebSet klären)

### M25 – Administration
- Rollen: **Hebamme** (eigene und vertretene Fälle, darf Regelwerk-Änderungen vorschlagen und die anderer bestätigen), **Büro/Verwaltung** (optional, ohne medizinische Daten)
- Hebammen-Profile: Name, IK-Nummer, Kontaktdaten, Status *aktiv / Babypause (mit Enddatum) / ausgeschieden*
- **Orte je Hebamme**: beliebig viele benannte Orte (private Anschrift, Schule, Kita …, optional mit Abholzeit) und **Tourvorlagen** je Wochentag (Start, Ende, „Ende spätestens“)
- **Praxisstandort** als gemeinsamer Ort für alle (Neue Reihe 46b, Bad Doberan)
- **Abrechnungseinstellungen** je Hebamme (siehe Kapitel 8.2)
- Audit-Log, Geräteverwaltung (verlorenes Tablet sperren), automatische Backups, Export aller Daten (keine Abhängigkeit vom Anbieter)

### M26 – Gebühren- und Regelwerk-Administration ⭐
Alle abrechnungsrelevanten Regeln sind **Daten, nicht Code**. Die Praxis pflegt sie selbst in der App, z. B. wenn der Hebammenhilfevertrag sich ändert, Beträge angepasst werden oder ein Formular neu gefasst wird.

**0. Vier-Augen-Prinzip**
- **Jede der drei Hebammen** darf Änderungen anlegen (Position, Kontingent, Frist, Formularzuordnung, neue Version).
- Eine Änderung wird erst wirksam, wenn **eine andere Hebamme sie bestätigt**. Bis dahin ist sie als „wartet auf Freigabe“ sichtbar; die anderen Hebammen werden benachrichtigt.
- Die Freigabe zeigt die Änderung als Vorher/Nachher und das Ergebnis des Testrechners. Ablehnen ist mit Kommentar möglich.
- Hebammen im Status Babypause können nicht freigeben; ist nur eine Hebamme aktiv, weist die App darauf hin.

**1. Regelwerk-Versionen**
- Ein Regelwerk hat einen Namen (z. B. „Hebammenhilfevertrag ab 01.04.2026“) und **gültig von / bis**. Einzelne Positionen können zusätzlich befristet sein (z. B. 109X5/110X5 bis 31.12.2027).
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
| Formular | 3.1 / 3.2 / 3.3 / 3.4 / 3.5 oder „nur Abrechnungsdatenblatt“ (nicht quittierungspflichtig) |
| Sichtbarkeit | aktiv / ausgeblendet, Sortierung, Favorit (schnell wählbar beim Besuch) |

**3. Kontingente**
- Frei definierbare Zähler, z. B. „Frühes Wochenbett: max. 20 Kontakte, Lebenstag 1–10“, „Spätes Wochenbett: max. 16 Kontakte, Tag 11 bis Ende Woche 12“, „Tag 1–3: max. 120 Minuten auf 2 Kontakte“
- Bestandteile: **zugeordnete Positionen**, **Zeitraum** (relativ zu Geburt/ET oder Lebenstag), **Grenze** (Anzahl Kontakte und/oder Minuten), **Bezug** (je Kind, je Mutter, je Schwangerschaft), **Verhalten bei Überschreitung**: *Hinweis* · *Anordnung erforderlich* · *Sperre*
- Anzeige im Besuch: „Frühes Wochenbett: 14 von 20 Kontakten“

**4. Zuschläge und Kalender**
- Zuschlagsregeln: Uhrzeiten (laut Vertrag 21–6 Uhr), Samstag ab 12 Uhr, Sonntag, **Feiertage Mecklenburg-Vorpommern** (Feiertagskalender, pflegbar und automatisch vorbelegt)
- Regel, ob ein Zuschlag über eine eigene Position oder über eine Positionsvariante (4. Stelle = 1) abgebildet wird

**5. Wegegeld**
- Satz je km, Ausgangspunkt (Praxis / Wohnung / tatsächliche Strecke), Aufteilung bei mehreren Besuchen auf einer Tour, Rundung, Höchstgrenzen. Alle Werte werden hier gepflegt, M9 rechnet damit.

**6. Material**
- Liste abrechenbarer Materialien mit Position, Preis und Einheit

**7. Selbstzahler-Preisliste**
- Akupunktur, Kinesio-Taping, Schwangerschaftsmassage, Babymassage- und Eltern-Kind-Kurs, Partnergebühren, Ausfallgebühr: Preis, Dauer, Pakete/Varianten, Umsatzsteuer-Option (§ 4 Nr. 14 / § 19 / 19 %), Rechnungstext (für M13)
- Praxis-Standardpreise, je Hebamme überschreibbar (jede rechnet selbst ab); Änderungen ebenfalls mit Vier-Augen-Freigabe
- Startbelegung mit plausiblen Dummydaten: [`konfiguration/selbstzahler-preisliste.json`](../konfiguration/selbstzahler-preisliste.json)

**Umgesetzt in Meilenstein 5:**
- Bearbeiten im Regelwerk (je Tab mit Stift): Gebührenpositionen (Betrag, Bezeichnung, Kurztext, Formular, quittierungspflichtig, Hinweis), Kontingente (Grenzen), Zuschläge, Wegegeld (Satz, Höchstgrenzen, Hin- und Rückweg), Feiertage, Fristentexte, Selbstzahler-Preise (ändern, nicht mehr anbieten, neue Leistung).
- Jede Bearbeitung wird ein **Vorschlag** mit Kurzbeschreibung und Begründung/Quelle; die App hält die bisherigen Werte fest und zeigt Vorher → Nachher. Offene Vorschläge erscheinen bei den anderen Hebammen auf der Startseite und im Tab „Änderungen“ (mit Zähler).
- **Freigeben** nur durch eine andere, aktive Hebamme (nicht in der Babypause), **Ablehnen** nur mit Begründung, **Zurückziehen** nur durch die Vorschlagende. Haben sich die Werte seit dem Vorschlag geändert, verweigert die App die Freigabe (neu vorschlagen).
- **Fassung freigeben** (Entwurf → fachlich geprüft) und **Neue Fassung** (Kopie mit neuem „gültig ab“) laufen ebenfalls über die Vier-Augen-Freigabe. Nach einer Fassung, mit der schon Abrechnungen versendet wurden, sind Inhaltsänderungen gesperrt; Korrekturen über eine neue Fassung.
- **Testrechner**: erfundener Besuch (Datum, Uhrzeit, Art, Leistung, Lebenstag bzw. SSW, Kinderzahl) mit dem aktuellen Regelwerk und – direkt aus dem Vorschlag – mit der offenen Änderung im Vergleich.
- **Verlauf**: alle Vorschläge mit Status, wer vorgeschlagen und wer entschieden hat; zusätzlich im Protokoll.
- Schon gespeicherte Besuche behalten ihre berechneten Beträge; neue Werte gelten für neu gespeicherte bzw. geänderte Besuche. Beim Einspielen von Updates (`seed`) werden in der App geänderte Regelwerke nicht durch die Datei überschrieben.
- **Neu anlegen:** Gebührenpositionen (GPOS, Bezeichnung, Betrag, Einheit, Leistungsart, Formular, Quittierungspflicht; Materialpauschalen mit „im Besuch auswählbar bei“ und „nur einmal je Betreuung“) und Kontingente (Kennung = GPOS-Stamm, Grenzen, Verhalten bei Überschreitung) – ebenfalls mit Vier-Augen-Freigabe. Neue Varianten bestehender Leistungen nutzt die automatische Berechnung sofort; die Materialauswahl im Besuch kommt jetzt aus dem am Besuchstag gültigen Regelwerk.
- **CSV-Import/-Export** der Positionen je Fassung und der Selbstzahler-Preisliste (Semikolon, Dezimalkomma, öffnet in Excel). Der Import vergleicht mit dem Bestand und erzeugt einen Vorschlag (geänderte Werte, neue Zeilen; gelöscht wird nichts), den eine zweite Hebamme freigibt.
- **Selbstzahler-Preise je Hebamme:** eigener Preis je Leistung (leer = Praxispreis), mit Vier-Augen-Freigabe; die Liste zeigt die eigenen Preise aller Hebammen.

**8. Test und Sicherheit**
- **Testrechner**: Eine Beispielbetreuung durchspielen („Geburt 20.09., Besuche an Tag 1, 2, 2, 3 …“). Die App zeigt die erzeugten Positionen, Beträge und Warnungen, bevor eine neue Version aktiviert wird.
- **Änderungsprotokoll**: wer hat wann welchen Wert geändert (alt → neu)
- **Vorbelegung**: Die Startregelwerke sind bereits aus dem Vertrag extrahiert ([`regelwerk/hhv-2026-04-01.json`](../regelwerk/hhv-2026-04-01.json) aktuell, [`regelwerk/hhv-2025-11-01.json`](../regelwerk/hhv-2025-11-01.json) für Nachträge; Status „Entwurf“). Die Praxis prüft sie einmal (z. B. in der CSV-Fassung) und aktiviert sie mit Vier-Augen-Freigabe.
- **Fristen und Hinweise**: Die vertraglichen Fristen (Kapitel 8.7) sind ebenfalls Teil des Regelwerks und pflegbar.
- **Formularspalten**: Welche Positionsgruppe in welche Spalte von Formular 3.1–3.5 gehört und ob eine Ziffer oder ein Kreuz eingetragen wird, ist ebenfalls Teil des Regelwerks.


---

## 8. Abrechnung und Übertragung an HebSet: Konzept

> **Entscheidungen der Praxis (Version 1.3):**
> - Die App erzeugt **vorausgefüllte PDF-Belege** auf Basis der amtlichen Formulare 3.1–3.5. Sie werden ausgedruckt und **per Post** verschickt; eine digitale Schnittstelle gibt es nicht.
> - **Belegart** und **Unterschriftsverfahren** sind **beide umgesetzt und in den Einstellungen wählbar** (je Hebamme).
> - **Keine Etiketten.**
> - **Jede Hebamme rechnet einzeln ab.** Der Abrechnungsweg (HebSet, andere Abrechnungsstelle oder selbst) ist je Hebamme einstellbar.
> - **Versandrhythmus individuell**, aber vertragskonform, mit Erinnerungen und Fristen aus dem Hebammenhilfevertrag.

### 8.1 Ziel
Kein händisches Ausfüllen der Kopfdaten, keine Etiketten, keine Doppelerfassung. Alles, was beim Besuch ohnehin erfasst wird, landet automatisch auf dem Beleg und im Abrechnungsdatenblatt. Die Abrechnungsstelle bekommt Unterlagen, die **vollständig, lesbar, plausibel und sofort abrechenbar** sind.

**Rückfallebene:** Akzeptiert eine Abrechnungsstelle die Eigendrucke nicht, behält die App ihren Wert: Sie liefert dann eine Ausfüllhilfe für die Durchschreibesätze und eine vollständige **Übersicht aller Leistungen je Betreuung auf einen Blick**.

### 8.2 Einstellungen je Hebamme

| Einstellung | Optionen | Wirkung |
|---|---|---|
| **Abrechnungsweg** | *HebSet* · *andere Abrechnungsstelle* (Name, Anschrift) · *selbst* | Bestimmt Empfänger, Deckblatt und Versandliste. Bei *selbst* liefert die App alle Unterlagen und einen Datenexport; die vertraglich vorgeschriebene elektronische Übermittlung an die Kassen (§ 302 SGB V, sonst bis zu 5 % Kürzung) erfolgt mit einer externen zertifizierten Software. |
| **Belegart** | *Eigendruck amtliches Formular* (Voreinstellung, von HebSet akzeptiert) · *Durchschreibesatz der Abrechnungsstelle* | Eigendruck: App druckt die Formulare 3.1–3.5. Durchschreibesatz: App zeigt je Besuch die einzutragende Zeile und erstellt Kontrolllisten. |
| **Unterschrift** | *Papier* · *Tablet* (von HebSet akzeptiert) | Siehe 8.5. Pro Hebamme wählbar, damit z. B. eine Hebamme mit Stift-iPad das Tablet nutzt und eine andere auf Papier bleibt. |
| **Versandrhythmus** | *monatlich* (Stichtag frei) · *zweimonatlich* · *quartalsweise* · *halbjährlich* | Erinnerung vor dem Stichtag. Die App lässt nur vertragskonforme Rhythmen zu (siehe 8.7). |
| **IK** | persönliches IK (beginnt mit 45) | Steht auf jedem Beleg; alle drei Hebammen sind freiberuflich mit eigenem IK. |

Ein Beispiel liegt in [`konfiguration/einstellungen-beispiel.json`](../konfiguration/einstellungen-beispiel.json).

### 8.3 Ablauf

```
 Betreuung beginnt ─► Kopf (Kasse, Versichertennr., ET, Hebamme mit IK) einmal erfasst
   │
   ├─ Unterschrift „Papier“:
   │     Eigendruck:        App druckt das Formular mit fertigem Kopf ─► Blatt in die Mappe
   │     Durchschreibesatz: Kopf von Hand bzw. aus der App abschreiben
   │     Beim Besuch: App zeigt die Zeile ─► Zeile eintragen ─► Mutter unterschreibt sofort
   │
   └─ Unterschrift „Tablet“:
         Beim Besuch: App füllt die Zeile ─► Mutter unterschreibt sofort auf dem Tablet
         Beim Versand: App druckt das komplette Formular inkl. Unterschriften
   │
   ▼
 Plausi-Prüfung (Regelwerk M26) ─► Erinnerung zum Stichtag ─► „Abrechnung vorbereiten“
   │
   ▼
 Versandmappe je Hebamme: Deckblatt/Versandliste + je Fall Abrechnungsdatenblatt + Formulare + Anordnungen/Nachweise
   │
   ▼
 Umschlag an die eingestellte Abrechnungsstelle ─► Status „versendet“ ─► „bezahlt“ / „gekürzt“ abhaken
```

### 8.4 PDF-Beleggenerator
- **Vorlagen**: die amtlichen Versichertenbestätigungen aus Anlage 6, je Vertragsfassung
  - gültig ab 01.04.2026 (aktuell): [`docs/vorlagen/anlage6-versichertenbestaetigungen-3.1-3.5-ab-2026-04-01.pdf`](vorlagen/anlage6-versichertenbestaetigungen-3.1-3.5-ab-2026-04-01.pdf)
  - gültig ab 01.11.2025 (für Nachträge bis 31.03.2026): [`docs/vorlagen/anlage6-versichertenbestaetigungen-3.1-3.5-ab-2025-11-01.pdf`](vorlagen/anlage6-versichertenbestaetigungen-3.1-3.5-ab-2025-11-01.pdf)
  - Die App wählt die Vorlage nach dem Leistungsdatum. Liegen Leistungen beider Fassungen vor, entstehen getrennte Blätter.
- **Feldgenaues Ausfüllen**: Für jedes Feld sind Seite, x/y-Position, Breite und Schriftgröße hinterlegt, für die Tabelle Zeilenhöhe und Spaltenpositionen. Neue Vorlagen werden in der Administration hochgeladen und per Vorschau zugeordnet, ohne Programmierung.
- **Inhalt**:
  - Kopf: Krankenkasse, Name und Geburtsdatum der Versicherten, Krankenkassen-IK, Versichertennummer, ET, Geburtsdatum Kind. Die Rechnungsnummer bleibt frei (vergibt die Abrechnungsstelle).
  - Hebammentabelle: alle Hebammen, die bei der Familie Leistungen erbracht haben, je mit eigenem IK. Die Heb-Nr. vergibt die App je Blatt fortlaufend (1, 2, 3) in der Reihenfolge des ersten Einsatzes.
  - Leistungszeilen: Heb-Nr., Datum, Uhrzeit von/bis, Endziffer in der richtigen Spalte (seit 01.04.2026 nur 1–3, Telefonkurzberatung steht nicht mehr auf dem Formular), Materialkreuze, Kreuz bei Begründung
  - Zusatzangaben der Fassung 2026: Formular 3.3 „nach Abort/Fehlgeburt bis 11+6 / 23+6 SSW“ und „Gesamtzahl der Kinder bei Mehrlingen“; Formular 3.1 „geplanter Geburtsort nach Aufklärungsgespräch“
  - Begründungen und Vermerke: automatisch aus der Leistung (z. B. Anordnung, Mehrlinge)
- **Folgeblatt**: Bei mehr als 15 Zeilen (Formular 3.5: 11) entsteht ein weiteres Blatt mit identischem Kopf.
- **Korrektur**: nach Vertragsregel; ganze Zeile streichen, neue Zeile, neue Unterschrift. Jeder erzeugte Beleg wird als PDF archiviert.

### 8.5 Unterschrift der Versicherten
§ 12 Anlage 1.1 verlangt die Unterschrift **unverzüglich nach jeder Leistung**; nachträgliche oder gesammelte Unterschriften sind unzulässig. Beide Verfahren sind umgesetzt und je Hebamme wählbar:

| Verfahren | Ablauf | Hinweis |
|---|---|---|
| **Papier** | Formular mit fertigem Kopf liegt in der Mappe. Beim Besuch zeigt die App die Zeile genau an („12.10.2026 · 09:10–09:55 · Spalte Wochenbett: 1“), die Hebamme trägt sie ein, die Mutter unterschreibt sofort. Vor dem Versand wird das Original abfotografiert und an den Fall gehängt. | Entspricht dem Vertrag und dem heutigen Verfahren |
| **Tablet** | Die App füllt die Zeile, die Mutter unterschreibt sofort auf dem Tablet (Stift oder Finger). Beim Versand druckt die App das komplette Formular mit den Unterschriften. | Von HebSet akzeptiert. Vertraglich ist sie bei persönlichen Besuchen nicht ausdrücklich geregelt (nur bei Video); bei einer anderen Abrechnungsstelle weist die App beim Aktivieren darauf hin, die Akzeptanz zu klären. |

**Videobetreuung:** Hier erlaubt der Vertrag die einfache elektronische Signatur auf dem PDF. Die App schickt das ausgefüllte PDF direkt nach der Videobetreuung; Rücksendung binnen zwei Wochen, die App erinnert.

**Telefonkurzberatung:** Seit 01.04.2026 nicht mehr auf den Formularen und damit **nicht quittierungspflichtig** (§ 12: Positionen, die die Formulare nicht vorsehen, sind ausgenommen). Sie steht nur im Abrechnungsdatenblatt.

### 8.6 Abrechnungsdatenblatt (Wegegeld, Pauschalen, Begründungen)
**Recherche im Vertrag (Anlage 2 § 2 und § 7, Anlage 1.1 § 11):** Die Kassen erhalten zwei Dinge: die **Abrechnungsdaten** (elektronisch nach § 302 SGB V, das macht die Abrechnungsstelle) und die **Urbelege** (Versichertenbestätigungen, ärztliche Anordnungen, Nachweise). Wegegeld und Positionen, die nicht auf den Formularen stehen, gehören **nur zu den Abrechnungsdaten**. Der Vertrag schreibt kein Format vor, in dem die Hebamme diese Angaben an ihre Abrechnungsstelle gibt, wohl aber den Inhalt. Die App erzeugt deshalb je Fall ein **Abrechnungsdatenblatt** mit allen Angaben, die die Abrechnungsstelle für die elektronische Rechnung braucht:

| Angabe | Vertragsgrundlage |
|---|---|
| Versichertennummer, Name, Vorname, Geburtsdatum, **Anschrift** der Versicherten (Anschrift steht nicht auf dem Formular) | Anlage 2 § 2 |
| IK der leistungserbringenden Hebamme | Anlage 2 § 2, § 7 |
| Alle GPOS einzeln mit Datum, Uhrzeit bzw. Dauer, inkl. Zuschlagsvariante | Anlage 2 § 7 |
| Geburtsdatum des Kindes bzw. ET bei vorgeburtlichen Leistungen; bei Mehrlingen Anzahl der Kinder | Anlage 2 § 7 |
| **Wegegeld je Hilfeleistung**: km der kürzesten Strecke (50100). Bei mehreren Frauen auf einem Weg anteilige km (50200) und **Anzahl der betreuten Versicherten** | Anlage 1.1 § 11, Anlage 2 § 2 |
| Strecke über 25 km: Grund (Hausgeburt / Vertretung mit Name der vertretenen Hebamme / keine Hebamme im Umkreis) | Anlage 1.1 § 11 |
| Maut, Fähre, Begleitfahrt (50300) mit Nachweisen in Kopie; ÖPNV-Pauschale (50400) | Anlage 1.1 § 11 |
| Nicht quittierungspflichtige Pauschalen, z. B. Materialpauschale Wochenbett lang/kurz (61200/61300), Materialpauschale Schwangerschaft/Vorsorge (60100/60200), Telefonkurzberatungen | Anlage 1.1 Abschnitt 2, § 12 |
| Begründungen (z. B. Fehlgeburt, Pflegschaft, Notfall, Abweichung) | Anlage 1.1, Anlage 2 § 2 |
| Ärztliche Anordnungen als Anlage | Anlage 1.1 § 13 |

Wegezeiten müssen nicht angegeben werden, wenn die zugehörige Leistung Zeiten hat (Anlage 2 § 7). Kilometer kommen automatisch aus der Routenplanung (M6/M9); Wege zu Kursen und Sprechstunden in der Praxis sind nicht erstattungsfähig und werden nicht übernommen.

### 8.7 Versand, Fristen und Benachrichtigungen
- **„Abrechnung vorbereiten“** sammelt je Hebamme alle übergabebereiten Fälle; die Vorabprüfung markiert fehlende Pflichtangaben (Unterschrift, Versichertennummer, Anordnung, Begründung) rot.
- **Versandmappe**: Deckblatt/Versandliste (Absender mit IK, Empfänger laut Einstellung, Anzahl Fälle und Blätter, erwarteter Betrag), je Fall Abrechnungsdatenblatt und Formulare, Anordnungen und Nachweise; optional Adressetikett für den Umschlag.
- **Status**: *versendet* (Datum, optional Einschreiben-Nr.) → *bezahlt* / *gekürzt* / *abgelehnt* (mit Grund). Die Belege sind nach dem Versand gesperrt.

Alle Fristen stammen aus dem Hebammenhilfevertrag und sind als Daten im Regelwerk hinterlegt ([`regelwerk/hhv-2026-04-01.json`](../regelwerk/hhv-2026-04-01.json), Abschnitt `fristen_und_hinweise`):

| Frist bzw. Regel | Quelle | Benachrichtigung in der App |
|---|---|---|
| Höchstens **eine Abrechnung je Monat** | Anlage 2 § 2 | Warnung, wenn im Monat schon versendet wurde; Rhythmus kürzer als monatlich nicht wählbar |
| Mindestens **zweimal im Jahr** einreichen | Anlage 2 § 2 | Hinweis, wenn im Halbjahr noch nichts versendet wurde |
| **Ausschlussfrist 30.06.** für Leistungen des Vorjahres (Urbelege bis 07.07.) | Anlage 2 § 2 | Erinnerungen am 01.04., 01.06. und 15.06. bei offenen Vorjahresleistungen |
| Zahlung durch die Kasse **21 Tage** (elektronisch) bzw. 28 Tage (Papier) nach Eingang | Anlage 2 § 4 | Offener Posten, wenn nach Versand + Laufzeit keine Zahlung abgehakt ist |
| Beanstandungen der Kassen bis **30.09.** für das Vorjahr | Anlage 2 § 5 | Hinweis „Belege griffbereit halten“ |
| **Widerspruch** gegen Beanstandung binnen **9 Monaten** | Anlage 2 § 5 | Frist ab Beanstandungsdatum, Erinnerung 1 Monat vorher |
| Unterschrift **unverzüglich** nach der Leistung | Anlage 1.1 § 12 | Beim Beenden des Besuchs sofortiger Hinweis |
| Video-Signatur binnen **2 Wochen** | Anlage 1.1 § 12 | Erinnerung nach 7 und 12 Tagen |
| Ärztliche Anordnung **vor** Leistungsbeginn, Leistungen bis **Ende des Folgequartals** | Anlage 1.1 § 13 | Sperre bei Kontingentüberschreitung ohne Anordnung; Ablauf der Anordnung überwachen |
| Aufklärungsgespräch Geburtsort **vor der 38. SSW** | Anlage 1.1 Abschnitt 2 | Hinweis ab SSW 35 |
| Frühes Wochenbett bis **10. Lebenstag**, spätes bis **Ablauf der 12. Lebenswoche** | Anlage 1.1 § 5 | Kontingentanzeige, Hinweis am Vortag bzw. 7 Tage vorher (zugleich Kinderurkunde) |
| Rückbildungskurs bis **Ende 9. Monat** nach Geburt | Anlage 1.1 Abschnitt 2 | Warnung bei Anmeldung und je Kurseinheit |
| **Fortbildung** mind. 40 Unterrichtsstunden in 3 Jahren | Anlage 3 § 2 | Stundenkonto je Hebamme |
| **QM**: jährliches internes Audit, alle 3 Jahre externer Nachweis | Anlage 3.3 § 5 | Jahreserinnerung |
| IK-Daten (Adresse, Bank) **unverzüglich** an SVI melden | Anlage 2 § 1 | Hinweis bei Änderung im Hebammenprofil |
| 109X5/110X5 nur **01.04.2026–31.12.2027** | Anlage 1.1 Abschnitt 2 | Automatische Sperre nach Leistungsdatum |

Die Erinnerung zum persönlichen Versandstichtag kommt mit einstellbarem Vorlauf (z. B. 2 Tage) per App-Benachrichtigung und optional E-Mail.

### 8.8 Versichertendaten ohne Etiketten
- Die Versichertendaten werden **einmal** erfasst: abtippen oder ein Foto der eGK auf dem Gerät per Texterkennung (OCR) auslesen. Danach stehen sie automatisch auf jedem Beleg und im Abrechnungsdatenblatt. **Etiketten entfallen.**
- Mittelfristig (TI, Phase 3) wird die eGK direkt über ein zugelassenes Kartenterminal eingelesen.

### 8.9 Bewusst nicht vorgesehen
- Digitale Übertragung an HebSet: HebSet bietet sie öffentlich nicht an. Die Daten liegen strukturiert vor, ein Export ließe sich später ergänzen.
- Eigene elektronische Kassenabrechnung nach § 302 SGB V (Zertifizierung, Kostenträgerdateien): bei Abrechnungsweg *selbst* über externe Software.

---

## 9. Routenplanung: Konzept

### 9.1 Anforderungen
- **Start- und Endpunkt pro Tag frei wählbar** aus den Orten der Hebamme (private Anschrift, Schule, Kita …) und dem Praxisstandort, z. B. Start Wohnung, Ende Schule der Tochter um 15:30 Uhr (**festes Ankunftsfenster am Ende**)
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
- Ein **Vehicle Routing Problem mit Zeitfenstern (VRPTW)** je Hebamme: Start und Ende, Zeitfenster pro Besuch, feste Termine, Besuchsdauer, Puffer, spätestes Ende (z. B. Schule 15:30).
- **Umsetzung (Meilenstein 4):** eigener Optimierer in `packages/shared/src/tour.ts`. Bis 9 Besuche wird die beste Reihenfolge **exakt** gesucht (Branch and Bound), darüber eine lokale Suche (günstigste Einfügung, Verschieben, 2-opt). Bewertung: Verspätungen gegenüber Zeitfenstern wiegen schwer (Besuche mit „muss heute sein“ doppelt), danach zählt die Fahrzeit. Für einen Hebammen-Tag dauert das Millisekunden; ein zusätzlicher Dienst (VROOM) ist dafür nicht nötig.
- **Fahrzeiten und Strecken:** eigener **OSRM**-Server mit dem Straßennetz Mecklenburg-Vorpommern (OpenStreetMap). Ohne OSRM (z. B. im Codespace) schätzt die App aus der Luftlinie (× 1,3, ca. 50 km/h) und kennzeichnet die Werte als geschätzt.
- **Adressen finden (Geokodierung):** eigenes **Adressverzeichnis** aus den Hausnummern von OpenStreetMap (MV), in der App-Datenbank. Kein externer Geokodierungsdienst; nicht gefundene Anschriften (z. B. Neubau) setzt die Hebamme mit einem Tipp auf die Karte.
- **Datenschutz**: Self-Hosting in einem deutschen Rechenzentrum, sodass keine Adressen an Google übertragen werden. An OSRM gehen nur Koordinaten, nie Namen. Die Kartenansicht lädt nur Kartenkacheln (mit der Adresse der App als Referer, ohne Pfad); erst „Navigation“ übergibt das Ziel an Apple Karten bzw. Google Maps, auf Wunsch der Hebamme.
- **Mehrere Hebammen gemeinsam optimieren** (Verteilung flexibler Besuche bei Vertretung) bleibt eine spätere Ausbaustufe (dafür ggf. VROOM).

### 9.3 Ablauf in der App
1. **Tour** öffnen (Heute oder ein anderer Tag): Start, Ziel, Abfahrt und spätestes Ende kommen aus der Tourvorlage des Wochentags und sind für den Tag änderbar.
2. **Besuch einplanen**: Familie, Zeitwunsch (flexibel, vormittags, nachmittags, feste Uhrzeit, Zeitfenster), Dauer, „muss heute sein“. Wochenbett-Familien, die noch nicht eingeplant sind, schlägt die App mit Lebenstag vor.
3. **Route optimieren**: Reihenfolge, Ankunftszeiten, Strecke, Fahrzeit und Karte. Reihenfolge mit ↑/↓ von Hand ändern; Zeiten werden sofort neu berechnet.
4. **Tour bestätigen**.
5. Unterwegs je Besuch: **Navigation** (Apple Karten/Google Maps), Anrufen, **Dokumentieren** (öffnet den Besuch mit Datum und Leistung, verknüpft ihn mit dem Termin und führt zurück zur Tour). „Ab jetzt neu berechnen“ plant die restlichen Besuche ab der aktuellen Uhrzeit.
6. Tagesbilanz: Strecke, Fahrzeit, Besuchszeit, **Wegegeld**; „Ins Fahrtenbuch“ erzeugt den Fahrtenbuch-Eintrag.

Noch nicht umgesetzt: Benachrichtigung der Familien (kommt mit E-Mail/SMS), Pausen als eigene Stopps, Drag & Drop.

### 9.4 Kilometer-Logik für Wegegeld und Fahrtenbuch
**Wegegeld (§ 11 Anlage 1.1, umgesetzt in `wegegeldAufteilen`):**
- Abrechenbar ist die **kürzest mögliche Strecke zur Hilfeleistung**. Der **Ausgangspunkt** richtet sich nach der Routenkonfiguration: Tour des Tages → Tourvorlage des Wochentags → Wohnort → Praxis.
- **Ein Hausbesuch am Tag**: Ausgangspunkt → Familie → Ausgangspunkt, GPOS **50100**.
- **Mehrere Familien auf einem Weg**: zurückgelegte Gesamtstrecke (Ausgangspunkt → Familien in Tour-Reihenfolge → Ausgangspunkt) geteilt durch die Anzahl der Versicherten, je Versicherte GPOS **50200** mit „Anzahl Versicherte: n“. Wer zwischendurch zum Ausgangspunkt zurückfährt, stellt „jeden Besuch einzeln abrechnen“ ein.
- **Über 25 km** (einfache Strecke zur Familie): nur mit Begründung (Hausgeburt, Vertretung mit Name, keine Hebamme im Umkreis) und höchstens 50 km; ohne Begründung kürzt die App auf 25 km und weist darauf hin.
- **Annahme, fachlich zu prüfen:** Hin- und Rückweg zählen; die 25-/50-km-Grenze gilt für die einfache Strecke. Im Regelwerk als `wegegeld.hin_und_rueckweg` einstellbar. Kilometer mit einer Nachkommastelle.
- Nur **abgeschlossene aufsuchende** Besuche (Leistungsart 1) zählen; Wege zu Kursen und Sprechstunden in der Praxis nicht. Das Wegegeld wird bei jeder Änderung eines Besuchs, einer Position oder eines Ortes automatisch neu berechnet, bis der Tag einem Versand zugeordnet ist. Kilometer lassen sich je Tag von Hand überschreiben.
- Die Wegegeld-Zeilen hängen am jeweiligen Besuch und stehen auf dem **Abrechnungsdatenblatt** (nicht auf dem Formular).

**Fahrtenbuch:**
- „Ins Fahrtenbuch“ erzeugt je Tag einen Eintrag aus der Tour: Strecke als Ortsfolge **ohne Namen** (Schweigepflicht), Zweck „Hausbesuche (n)“, Kilometer je Abschnitt aufgeteilt: Hausbesuche **dienstlich**, Wohnung ↔ Praxis **Wohnung–Betriebsstätte**, Fahrt zu Schule/Kita **privat**.
- Kilometerstand Beginn/Ende trägt die Hebamme ein (Vorschlag: Ende der letzten Fahrt). Lücken im Kilometerstand erscheinen als Privatfahrten. Abweichungen zwischen Kilometerstand und Aufteilung werden angezeigt.
- Änderungen und Löschungen werden mit altem Stand protokolliert. Export als PDF und CSV je Monat oder Jahr. Ob das elektronische Fahrtenbuch steuerlich anerkannt wird, klärt die Steuerberatung.

---

## 10. Kinderurkunde: Konzept

### 10.1 Auslöser
- Beim **Abschluss der Hebammenbetreuung** (Ende der Wochenbettbetreuung bzw. letzter Besuch; spätestens bei Ende des Leistungszeitraums) schlägt die App vor: „Kinderurkunde für Ole erstellen?“
- Erinnerung 7 Tage vorher, damit die Urkunde beim letzten Besuch übergeben werden kann (ausgedruckt oder per E-Mail mit Einwilligung)

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

### 10.4 Umsetzung (Stand M10)
- Akte → Kind → **Kinderurkunde**: Gestaltung *Ostsee (Wellen)*, *Leuchtturm* oder *Schlicht*; Titel; persönlicher Text aus fünf Vorlagen (warm, kurz, plattdeutsch, Mehrlinge, Geschwister) mit eingesetzten Angaben aus der Akte, frei bearbeitbar
- Tabelle aus der Hebammenzeit automatisch aus Geburtsdaten und Besuchsdokumentation (Gewicht, Länge, Kopfumfang; „Geburt“, „Geburtsgewicht wieder erreicht“, „Abschluss“); Auswahl alle / nur Wochenwerte / einzelne Zeilen, „Besonderes“ je Zeile editierbar
- Gewichtskurve (optional mit WHO-Perzentilen), Meilensteine, Sternzeichen, Name der Hebamme als Unterschrift, Kurs-Hinweis im Fuß
- PDF A4 als Vektorgrafik (pdf-lib), Vorschau direkt auf dem Tablet; Entwurf bzw. „Fertig“ wird in der Akte gespeichert, das PDF jederzeit neu erzeugt
- Cockpit-Hinweis 7 Tage vor Ende der 12. Lebenswoche (mit Link zur Urkunde), solange die Urkunde nicht fertig ist
- Noch offen: Foto und Fußabdruck (mit M17 und den Einwilligungen in der Akte), Versand per E-Mail (mit dem E-Mail-Postfach der Praxis), KI-Formulierungshilfe

### 10.3 Technik
- Vorlage als HTML/CSS → **PDF** (A4 hoch, druckfertig, 300 dpi). Mehrere Designs (Aquarell-Ostsee, Leuchtturm, schlicht)
- Vorschau auf dem Tablet, Bearbeiten des Textes direkt in der Vorschau
- Ausgabe: drucken oder per E-Mail senden (mit Einwilligung)
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
- **Branding**: Logo und Farben von Kindkesmöön: Salbei (#DADBC5), Oliv (#4A5038, #6E714D) und Tulpe/Terrakotta (#B85A4C) auf hellem Creme

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

### 12.1 Entscheidung: Offline-fähige Web-App (PWA)

Die App wird als **Progressive Web App** entwickelt: eine Codebasis für iPad (mit und ohne Stift), Android, Handy und Laptop, installierbar über „Zum Home-Bildschirm“, Updates ohne App Store. Eine Capacitor-Hülle für den App Store bleibt als Option, falls später native Funktionen (z. B. Bluetooth-Kartenleser) nötig werden.

| Bereich | Technik | Begründung |
|---|---|---|
| Frontend | **React + TypeScript**, Vite, Tailwind CSS, PWA (Service Worker) | Verbreitet, gut testbar, responsive Tablet-/Handy-Layouts |
| Offline-Daten | **IndexedDB** (Dexie), verschlüsselt; eigener Sync | Arbeiten im Funkloch, Abgleich bei Netz |
| Unterschrift/Stift | Pointer Events (Apple Pencil, Finger, Maus) | Funktioniert mit und ohne Stift |
| PDF | **pdf-lib** (Formulare 3.1–3.5 auf amtliche Vorlage, Abrechnungsdatenblatt, Kinderurkunde, Rechnungen) | Läuft im Browser, also auch offline beim Hausbesuch |
| Backend | **Node.js + TypeScript** (Fastify), **PostgreSQL**, Drizzle ORM | Eine Sprache für alles, einfach zu betreiben, keine Zusatz-Binärdateien |
| Anmeldung | Passkeys bzw. Passwort + 2FA (TOTP), Sitzungen mit kurzer Laufzeit | Gesundheitsdaten |
| Routing | **OSRM** (Straßennetz Mecklenburg-Vorpommern aus OpenStreetMap), eigener Tourenoptimierer, Adressverzeichnis aus OSM | Selbst gehostet, keine Adressen an Google |
| Karten | Leaflet mit OSM-Kacheln (bzw. selbst gehostete Kacheln) | Keine Tracking-Dienste |
| Benachrichtigungen | Web-Push (PWA) und E-Mail (SMTP) | Fristen und Erinnerungen |
| Tests | Vitest (Regelwerk, Plausi, Wegegeld), Playwright (Oberfläche auf iPad-Auflösung) | Abrechnungslogik muss stimmen |

### 12.2 Betrieb auf dem Hostinger-VPS

```
┌───────────────────────── Geräte (iPad / Android / Handy / Laptop) ─────────────────────────┐
│  PWA (React + TypeScript) · IndexedDB verschlüsselt · Offline-Sync · PDF-Erzeugung lokal    │
└──────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                           │ HTTPS (TLS 1.3)
┌──────────────────────── Hostinger VPS (Docker Compose, Rechenzentrum in der EU) ────────────┐
│  caddy        Reverse Proxy, automatische TLS-Zertifikate (Let's Encrypt)                   │
│  app          Frontend (statisch) + API (Node.js/Fastify)                                   │
│  db           PostgreSQL (Volume verschlüsselt), nächtliche Dumps                           │
│  osrm         Routing-Engine mit OSM-Extrakt Mecklenburg-Vorpommern (optional, Profil karte)│
│  backup       verschlüsselte Backups (restic) auf externen Speicher in der EU               │
│  uptime       Überwachung (z. B. Uptime Kuma), Benachrichtigung bei Ausfall                 │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Größe**: Für 3 Nutzerinnen reicht ein kleiner VPS; OSRM für Mecklenburg-Vorpommern braucht beim Vorbereiten der Karte kurzzeitig ca. 2–4 GB RAM. Empfehlung: mindestens 2 vCPU, 8 GB RAM, 100 GB SSD (bei Hostinger etwa Tarif „KVM 2“).
- **Standort**: Rechenzentrum in der EU wählen (wenn verfügbar Deutschland); Auftragsverarbeitungsvertrag (AVV/DPA) mit Hostinger abschließen.
- **Härtung**: SSH nur mit Schlüssel, Firewall (nur 22/80/443), automatische Sicherheitsupdates, fail2ban, Datenbank nicht öffentlich erreichbar.
- **Backups**: täglich verschlüsselt auf einen zweiten Speicherort in der EU (nicht nur Hostinger-Snapshots), Wiederherstellung vierteljährlich testen.
- **Deployment**: Docker-Images aus diesem Repository (GitHub Actions baut und testet), Update auf dem VPS per `docker compose pull && docker compose up -d`. Eine Schritt-für-Schritt-Anleitung kommt mit dem ersten lauffähigen Stand.
- **Umgebungen**: eine **Demo-/Testumgebung mit Dummydaten** und die **Produktivumgebung**; echte Gesundheitsdaten nie in der Testumgebung.

### 12.3 Offline-Synchronisation
- Lokale Datenbank auf dem Gerät, Änderungen als Ereignisse mit Zeitstempel und Gerät
- Konflikte (selten, da meist eine Hebamme pro Fall): Feldweise zusammenführen, bei echten Konflikten nachfragen
- Werkzeuge: z. B. PowerSync, ElectricSQL, RxDB oder ein eigener Sync auf Postgres

**Umsetzung (M-6, eigener schlanker Sync):**
- **Lesen:** Antworten der für Hausbesuche nötigen Schnittstellen (Tour, Heute, Akte, Betreuung, Besuche, Gewicht, Material, gültiges Regelwerk, Abrechnungskontext, eigene Ansicht) werden je Hebamme in der IndexedDB abgelegt, AES-256-GCM-verschlüsselt mit einem nicht exportierbaren Schlüssel des Browsers, höchstens 14 Tage. Vorladen für heute und morgen automatisch beim Start, stündlich und per Knopf „Für unterwegs laden“.
- **Schreiben:** Besuche (neu und geändert) gehen ohne Verbindung in eine Warteschlange – je Besuch ein Eintrag, der bei erneutem Speichern ersetzt wird. Neue Besuche bekommen ihre Kennung auf dem Gerät (UUID), dadurch ist die Übertragung idempotent. Andere Änderungen (Akte, Tour planen, Abrechnung, Regelwerk) melden „nur mit Verbindung möglich“.
- **Abrechnung offline:** Die Plausibilitätsprüfung läuft mit demselben Code auf dem Gerät (gespeichertes Regelwerk + Abrechnungskontext) und wird als „vorläufig (offline)“ markiert; verbindlich rechnet der Server beim Übertragen.
- **Konflikte:** Jede Änderung trägt den Stand (`geaendertAm`), auf dem sie beruht. Weicht der Server ab, antwortet er mit 409 und seiner Fassung; das Gerät führt feldweise zusammen (Ausgangsfassung / eigene / fremde). Nur wenn dasselbe Feld auf beiden Geräten verschieden geändert wurde, entscheidet die Hebamme auf der Abgleich-Seite.
- **Anmeldung:** bleibt ohne Netz erhalten (die App startet aus dem Service Worker). Beim Abmelden werden alle Gerätedaten samt Schlüssel gelöscht, mit Warnung bei noch nicht übertragenen Änderungen.

### 12.4 Qualität
- Automatisierte Tests vor allem für das **Abrechnungsregelwerk** (Kontingente, Zuschläge, Wegegeld) und die **PDF-Formulare** (Snapshot-Tests)
- Testgeräte: iPad (aktuelles iPadOS), ein Android-Tablet, iPhone, Android-Handy
- Staging-Umgebung mit Testdaten, niemals mit echten Patientinnendaten

---

## 13. Datenschutz und Sicherheit

| Maßnahme | Umsetzung |
|---|---|
| Hosting | Eigener VPS bei Hostinger, Rechenzentrum in der EU, AVV/DPA mit Hostinger, Server-Härtung und verschlüsselte externe Backups (Kapitel 12.2) |
| Verschlüsselung | TLS 1.3 beim Transport; Datenbank und Dateien verschlüsselt; lokale Daten auf dem Gerät verschlüsselt (Schlüssel im Secure Enclave/Keystore) |
| Anmeldung | Passkeys oder Passwort + 2FA; App-Sperre per Face ID/Fingerabdruck; automatische Sperre nach Inaktivität |
| Rollen | Need-to-know: Hebammen sehen eigene und vertretene Fälle; Administration sieht alles; Büro nur Verwaltungsdaten |
| Protokoll | Unveränderbares Audit-Log (wer hat wann was gesehen bzw. geändert) |
| Geräte | Verlorenes Gerät aus der Ferne abmelden und lokale Daten unbrauchbar machen |
| Backups | Täglich, verschlüsselt, an einem zweiten Standort in Deutschland; Wiederherstellung regelmäßig testen |
| Löschung | Aufbewahrungsfristen automatisch überwachen, danach Löschvorschlag |
| Einwilligungen | Fotos, Kinderurkunde, SMS/E-Mail digital erfasst und widerrufbar |
| E-Mail-Kommunikation | Die Hebammen nutzen heute private Gmail- und Outlook-Adressen. Für Nachrichten mit Gesundheitsdaten empfiehlt sich eine Praxis-Domain mit deutschem Anbieter (AVV) bzw. die praxisinternen Team-Nachrichten (M20) |
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

### Phase 0 – Klärung (abgeschlossen)
- Recherche, Konzept, Regelwerk aus dem Vertrag, Entscheidungen der Praxis (Kapitel 5.1)
- Rest: Startregelwerk ([`regelwerk/hhv-2026-04-01-positionen.csv`](../regelwerk/hhv-2026-04-01-positionen.csv)) einmal fachlich durchsehen

### Entwicklungsweise
Claude entwickelt in diesem Repository in kleinen, lauffähigen Schritten. Jeder Schritt wird auf dem Branch gepusht und kann in der Demo-Umgebung mit Dummydaten getestet werden. Rückmeldungen der Hebammen fließen in den nächsten Schritt ein.

| Meilenstein | Inhalt |
|---|---|
| **M-1 Grundgerüst** ✅ | Repository-Struktur, Docker Compose, Datenbank, Anmeldung, Hebammenprofile mit Orten und Einstellungen, Regelwerk-Import, Demo-Daten, Deployment-Anleitung für den VPS ([BETRIEB.md](BETRIEB.md)) |
| **M-2 Akte und Besuch** ✅ | Klientinnen, Kinder, Betreuungsfälle, Besuchsdokumentation auf dem Tablet, Unterschrift auf Papier oder Tablet, Leistungsberechnung mit Plausibilitätsprüfung (5-Minuten-Einheiten, Zuschläge inkl. Feiertage MV, Kontingente, Materialpauschalen) und Kontingentanzeige |
| **M-3 Abrechnung** ✅ | Amtliche Formulare 3.1/3.3 als PDF (feldgenau auf der Vorlage; mit Tablet-Unterschriften bzw. mit vorausgefülltem Kopf für die Mappe), Kontrollliste für Papier-Originale, Abrechnungsdatenblatt, Versandmappe mit Deckblatt, Versand vorbereiten/versendet/bezahlt inkl. Kürzungen, Sperre versendeter Besuche, Fristen-Hinweise (Ausschlussfrist, offene Zahlungen, 1×/Monat bei Selbstabrechnung). Formular 3.4 folgt mit dem Kursmodul |
| **M-4 Touren** ✅ | Tagesplanung mit Terminen (fest, Zeitfenster, flexibel), Optimierung mit Zeitfenstern, OSRM-Routing (Luftlinie als Ersatz), Adressverzeichnis aus OpenStreetMap, Karte, Navigation, Wegegeld 50100/50200 automatisch aus den Hausbesuchen, Fahrtenbuch mit Export |
| **M-5 Regelwerk-Administration** ✅ | Positionen, Kontingente, Zuschläge, Wegegeld, Feiertage, Fristen und Selbstzahler-Preise bearbeiten, Vier-Augen-Freigabe mit Konfliktprüfung, Fassung freigeben, neue Fassung, Testrechner mit Vorher/Nachher, Verlauf |
| **M-6 Offline** ✅ | Tour und Akten für heute/morgen verschlüsselt auf dem Gerät, Besuche ohne Netz dokumentieren und abschließen (vorläufige Abrechnung auf dem Gerät), Warteschlange mit automatischer Übertragung, idempotente Übertragung, Konflikterkennung mit feldweisem Zusammenführen, Statusanzeige und Abgleich-Seite (Kapitel 12.3) |

### Phase 1 – MVP: „Der Hausbesuch“ (ca. 3–4 Monate)
M1 Cockpit · M2 Akte · M3 Doku Schwangerschaft/Wochenbett · M5 Kalender · **M6 Routenplanung** · M7 Leistungen + Plausi · **M8 Abrechnungsunterlagen (Formulare 3.1, 3.3, 3.4; Papier und Tablet; Durchschreibesatz-Hilfe; Abrechnungsdatenblatt; Fristen)** · M9 Fahrtenbuch · M25 Admin inkl. Orte und Abrechnungseinstellungen · **M26 Regelwerk-Administration mit Vier-Augen-Freigabe** · Offline-Sync
→ entspricht den Meilensteinen M-1 bis M-6; danach **Parallelbetrieb** mit Hebamio für 1–2 Monate, dann Umstieg

### Phase 2 – „Die Praxis“ (ca. 3 Monate)
**M10 Kinderurkunde** · M11 Belegungsplan + Website-Anfrage · M12 Kurse + Online-Anmeldung · M13 Selbstzahler-Rechnungen · M15 Wachstumskurven · M17 Fotos · M18 Vorlagen · M19 Vertretung · M20 Team-Nachrichten · M22 Statistik · M23 Automatisierungen

### Phase 3 – „Vernetzt“ (laufend)
M16 Spracheingabe · M21 QM/Fortbildung · M24 TI (eGK, KIM, ePA) und eLB · Datenübernahme aus Hebamio · M4 Geburtsdoku und Formulare 3.2/3.5 (bei Bedarf) · M14 Elternportal (derzeit Out of Scope)

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
| Hostinger VPS (z. B. KVM 2) und externer Backup-Speicher | ca. 100–200 € |
| E-Mail-Versand (SMTP-Dienst, optional SMS) | ca. 0–100 € |
| Domain (Zertifikate kostenlos über Let's Encrypt; kein App-Store-Konto nötig) | ca. 10–20 € |
| Betrieb und Updates (Server, Regelwerk): Eigenleistung | – |

**Bewertung:** Die Einsparung bei den Lizenzkosten ist moderat. Der eigentliche Gewinn liegt in **Zeit** (Routenplanung, keine Doppelerfassung für HebSet, weniger Kürzungen) und in **Funktionen, die es nirgends gibt** (Kinderurkunde, Routenplanung, Belegungsplan). Langfristig kann die Praxis mit sauberen digitalen Daten auch den Abrechnungsweg frei wählen.

**Risiken:**
- Verantwortung für Datenschutz, Sicherheit und Verfügbarkeit liegt bei der Praxis
- Änderungen im Hebammenhilfevertrag muss die Praxis selbst in M26 einpflegen. Testrechner und Versionierung reduzieren das Fehlerrisiko, die fachliche Verantwortung für korrekte Werte bleibt aber bei der Praxis
- Betrieb auf eigenem VPS: Verfügbarkeit, Updates und Backups liegen beim Betreiber; daher Monitoring, automatische Updates und getestete Wiederherstellung
- Abhängigkeit von einer Codebasis ohne Hersteller: saubere Dokumentation, Tests und Datenexport jederzeit
- TI-Pflicht: Bis M24 umgesetzt ist, eine separate TI-Lösung eines Anbieters nutzen

---

## 17. Offene Fragen

### Geklärt (01.10.2026)
Siehe Tabelle in Kapitel 5.1. Die Frage, wie Wegegeld und Pauschalen übermittelt werden, ist über den Vertrag beantwortet (Kapitel 8.6).

### Betrieb (geklärt)
- VPS: Hostinger **KVM 2**
- Adresse: zunächst der Hostinger-Hostname des VPS, später eine Subdomain
- E-Mail: später über ein Postfach der eigenen Domain

### Noch offen
- **Wegegeld Hin- und Rückweg:** Die App rechnet Ausgangspunkt → Familie → Ausgangspunkt (bei mehreren Familien die Rundtour geteilt durch die Anzahl). Bitte mit HebSet bzw. dem Berufsverband bestätigen; sonst im Regelwerk `hin_und_rueckweg` auf `false` stellen.
- **Papier-Unterschrift und amtliches Formular:** Sollen für papier-unterschriebene Besuche zusätzlich ausgefüllte Formulare (ohne Unterschrift) in die Versandmappe (Option A) oder bleibt es bei der Kontrollliste (Option B)?
- **Fahrtenbuch:** steuerliche Anerkennung des elektronischen Fahrtenbuchs mit der Steuerberatung klären.

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
- Hebammenhilfevertrag, Fassung ab 01.04.2026 (im Repository): [`docs/hebammenhilfevertrag-ab-2026-04-01.pdf`](hebammenhilfevertrag-ab-2026-04-01.pdf)
- GKV-Spitzenverband – Hebammenhilfevertrag, Fassung ab 01.11.2025 (inkl. Anlage 1.1 Vergütungsverzeichnis und Anlage 6 Formulare): https://www.gkv-spitzenverband.de/media/dokumente/krankenversicherung_1/ambulante_leistungen/hebammen/25-04-02_Hebammenhilfevertrag.pdf
- BfHD – FAQ zum neuen Hebammenhilfevertrag: https://bfhd.de/wp-content/uploads/2025/04/FAQs-Hebammenhilfevertrag-ab-01.11.25.pdf
- Deutscher Hebammenverband – Neuer Hebammenhilfevertrag: https://hebammenverband.de/neuer-hebammenhilfevertrag-festgesetzt-bfhd-und-netzwerk-der-geburtshaeuser-stimmen-im-schiedsstellenverfahren-mit-dem-gkv-spitzenverband
- TK – Elektronische Leistungsbestätigung: https://www.tk.de/presse/themen/medizinische-versorgung/ambulante-versorgung/elektronische-leistungsbestaetigung-2177186
- eLeistungsbestätigung: https://www.eleistungsbestaetigung.de/start/
- TI für Hebammen: https://www.telekonnekt.de/artikel/was-mir-die-telematik-als-hebamme-bringt · https://www.cgm.com/deu_de/loesungen/weitere-institutionen/ti-anbindung/ti-fuer-hebammen.html

> **Hinweis:** Preise, Vertragsdetails (GPOS, Kontingente, Wegegeld) und HebSet-Abläufe stammen aus öffentlich zugänglichen Quellen vom Oktober 2026 und müssen vor der Umsetzung mit den Originaldokumenten bzw. direkt mit HebSet abgeglichen werden.
