# Roadmap – was noch offen ist

Stand: 07.10.2026 · Grundlage: Modulübersicht im [Konzept](KONZEPT.md#6-modulübersicht), Code-Stand nach PR #29, [Walkthroughs](WALKTHROUGHS.md) (Abschnitt P) und [Betrieb](BETRIEB.md#vor-dem-echtbetrieb).

Aufwand grob: **S** = ein kleiner Arbeitsschritt (ein PR), **M** = zwei bis drei PRs, **L** = größeres Paket mit eigener Planung.

---

## 1. Was fertig ist

| Bereich | Module |
|---|---|
| Hausbesuch (Phase 1) | M1 Cockpit mit Tour und Hinweisen · M2 Akte (Kontakte, Merkmale, Einwilligungen, Vertretung je Betreuung) · M3 Besuchsdokumentation mit persönlicher Ansicht · M6 Tourenplanung · M7 Leistungen mit Plausibilitätsprüfung · M8 Abrechnungsunterlagen (Formulare 3.1/3.3/3.4, Versandmappe, Fristen) · M9 Fahrtenbuch und Wegegeld · M25 Konten, Rollen, Orte, Abrechnungseinstellungen, Zwei-Faktor-Anmeldung, App-Sperre, Geräte, Datenexport · M26 Regelwerk mit Vier-Augen-Freigabe · Offline-Betrieb |
| Praxis (Phase 2) | M10 Kinderurkunde · M11 Anfragen, Belegungsplan, Rückrufwünsche · M12 Kurse mit Anwesenheit und Online-Anmeldung · M15 Wachstumskurven (Gewicht, Länge, Kopfumfang) |
| Website | Alle Seiten neu, Kurse mit Buchung, Betreuungsanfrage, Rückrufwunsch, Kapazitätsampel, Team-Status – live aus der App |

## 2. Was offen ist

| Modul | Was fehlt | Aufwand | Hängt ab von |
|---|---|---|---|
| **Basis E-Mail** | Versand über das Postfach der Praxis-Domain (SMTP), Vorlagen, Versandprotokoll | S | Postfach der Domain |
| **M5 Kalender** | Teamkalender (Spalte je aktiver Hebamme), Raumbelegung Praxis/Kursraum, Kalender-Abo (ICS, nur Initialen, ohne Gesundheitsdaten) | M | – |
| **M13 Selbstzahler-Rechnungen** | Rechnungs-PDF mit fortlaufender Nummer und GiroCode (QR), Zahlungseingang, Rechnungen für Selbstzahlerkurse und Partnergebühren, EÜR-Export (CSV/DATEV) | M | Preisliste (M26, fertig) |
| **M12 Rest** | Bestätigungs- und Erinnerungsmails an Teilnehmerinnen, Ratenzahlung, Stornoregeln | S | E-Mail, M13 |
| **M23 Automatisierungen** | „ET in 2 Wochen → Erstbesuch vorbereiten“, „Kind 8 Wochen → Rückbildungskurs anbieten“, „U-Untersuchung fällig“ (Fristen-, Versand- und Urkunden-Hinweise gibt es schon) | S | – |
| **M1/M7 Warnungen** | Gewichtsabnahme über 10 %, Kontingent fast ausgeschöpft im Cockpit, fehlende ärztliche Anordnung; Start/Stopp-Knopf für die Besuchsdauer | S | – |
| **M3 Rest** | Textbausteine, „wie letztes Mal“, EPDS-Fragebogen, Checkliste Beratungsthemen | M | – |
| **M19 Rest** | Kurzübergabe für die Vertretung („Worauf achten?“), Rufbereitschaftsplan (Babypause, Urlaub und Vertretung je Betreuung gibt es schon) | S | – |
| **M20 Team-Nachrichten** | Nachrichten mit Bezug zur Akte (statt WhatsApp), Aufgaben mit Fälligkeit | M | – |
| **M18 Vorlagen und Briefe** | Arztbrief, Überleitungsbericht, Bescheinigungen, Kursbescheinigung; Platzhalter, Briefkopf | M | – |
| **M17 Fotos** | Fotos von Nabel, Naht, Haut verschlüsselt in der Akte (nicht in der Galerie), Verlauf nebeneinander, Prüfung der Einwilligung | M | Einwilligungen (fertig) |
| **M22 Statistik** | Betreuungen je Hebamme und Monat, Orte, Kilometer, Umsatz Kasse/Selbstzahler, Kursauslastung, offene Beträge | M | M13 für Umsatz Selbstzahler |
| **M21 QM, Fortbildung, Material** | Fortbildungskonto (40 Stunden in 3 Jahren), QM-Handbuch mit Lesebestätigung, Material mit Ablaufdaten | M | – |
| **M16 Spracheingabe** | Diktat in der Besuchsdokumentation, möglichst auf dem Gerät | M | – |
| **M24 TI und eLB** | eGK lesen, KIM, ePA/Mutterpass, elektronische Leistungsbestätigung | L | TI-Anbieter, HebSet |
| Hebamio-Import | Übernahme von Bestandsdaten | M | Entscheidung der Praxis (derzeit: Start mit leerem Bestand) |
| M4 Geburt | Geburtsdokumentation, Formulare 3.2/3.5 | M | nur bei Haus- oder Beleggeburten |
| ~~M14 Elternportal~~ | – | – | Out of Scope |

## 3. Roadmap in Etappen

### Etappe A – Startklar für den Echtbetrieb

Ziel: Die App läuft auf dem VPS, die Hebammen können mit echten Familien parallel zu Hebamio arbeiten.

1. **Basis E-Mail** (S). Voraussetzung für Passwort-Hinweise, Kursmails und spätere Erinnerungen.
2. ~~**M25 Sicherheit**~~ ✅ umgesetzt (Zwei-Faktor-Anmeldung, App-Sperre, Geräte abmelden, Datenexport).
3. **M1/M7 Warnungen** (S): Gewichtsabnahme über 10 %, Kontingent fast ausgeschöpft, Start/Stopp-Knopf.
4. **Echtbetrieb einrichten** (Praxis + Claude): Checkliste in [BETRIEB.md](BETRIEB.md#vor-dem-echtbetrieb) abarbeiten – AVV mit Hostinger, Backup mit getesteter Wiederherstellung, Regelwerk fachlich prüfen und freigeben, Datenschutz-Dokumente, persönliche Konten, `DEMO_MODUS=nein`.
5. **Website live** (Praxis + Claude): Impressum und Datenschutz vervollständigen, Lorinas Namen und E-Mail vereinheitlichen, eigene Fotos, Domain umstellen.

→ danach **Parallelbetrieb mit Hebamio** (1–2 Monate), Rückmeldungen fließen in Etappe B.

**Website-Bausteine:** Website-Livegang selbst; E-Mail-Bestätigung nach Anfrage und Rückrufwunsch („Wir haben deine Nachricht erhalten“).

### Etappe B – Praxisalltag rund

Ziel: Alles, was die Hebammen im Parallelbetrieb täglich vermissen werden.

1. **M5 Teamkalender und Kalender-Abo** (M)
2. **M13 Selbstzahler-Rechnungen und EÜR-Export** (M) – Babymassage, Akupunktur, Partnergebühren
3. **M12 Rest** (S): Kursbestätigung und -erinnerung per E-Mail, Ratenzahlung, Storno
4. **M23 Automatisierungen** (S)
5. **M3 Rest** (M): Textbausteine, „wie letztes Mal“, EPDS

**Website-Bausteine:** Kursbestätigung mit Link zum Selbst-Stornieren (Platz wird frei, Warteliste rückt nach); „Kurs beendet → Rechnung per E-Mail“ bei Selbstzahlerkursen; Hinweis „Rückbildungskurs“ für Familien, deren Kind 8 Wochen alt wird (per E-Mail, mit Einwilligung).

### Etappe C – Team

Ziel: Zusammenarbeit der drei Hebammen ohne WhatsApp und Zettel.

1. **M19 Rest** (S): Kurzübergabe, Rufbereitschaftsplan
2. **M20 Team-Nachrichten und Aufgaben** (M)
3. **M18 Vorlagen und Briefe** (M)
4. **M17 Fotos** (M)
5. **M22 Statistik** (M)

**Website-Bausteine:** Urlaubs- und Vertretungshinweis automatisch aus den Abwesenheiten („Johanna ist bis 14.08. im Urlaub, Vertretung: Marielena“); „Heute erreichbar“ aus dem Rufbereitschaftsplan; Kursbescheinigung zum Herunterladen per Link aus der Bestätigungsmail.

### Etappe D – Vernetzt (laufend)

1. **M21 QM, Fortbildung, Material** (M)
2. **M16 Spracheingabe** (M)
3. **M24 TI und eLB** (L) – bis dahin separate TI-Lösung eines Anbieters
4. Bei Bedarf: Hebamio-Import, M4 Geburtsdokumentation

**Website-Bausteine:** „Unsere Qualifikationen“ aus den Fortbildungsnachweisen (nur Titel, freiwillig je Hebamme).

## 4. Entscheidungen, die die Praxis treffen muss

| Thema | Frage | Wichtig für |
|---|---|---|
| Wegegeld | Hin- und Rückweg wie umgesetzt – mit HebSet bzw. Berufsverband bestätigen | Etappe A (Abrechnung) |
| Papier-Unterschrift | Zusätzlich ausgefüllte Formulare in die Versandmappe (Option A) oder nur Kontrollliste (Option B)? | Etappe A |
| Fahrtenbuch | Steuerliche Anerkennung des elektronischen Fahrtenbuchs mit der Steuerberatung klären | Etappe A |
| E-Mail | Welches Postfach (Domain, Anbieter mit AVV)? | Etappe A |
| Zwei-Faktor-Anmeldung | App (z. B. Authenticator) oder Sicherheitsschlüssel? Pflicht für alle? | Etappe A |
| Umsatzsteuer | Kleinunternehmerregelung bzw. Steuerbefreiung je Leistung bestätigen (Rechnungstexte M13) | Etappe B |
| Hebamio | Altdaten nur archivieren (PDF/CSV, Langzeitarchiv) oder doch importieren? Kündigung erst nach vollständigem Export | nach Parallelbetrieb |
| TI | Anbieter und Zeitpunkt der TI-Anbindung | Etappe D |

## 5. Pflege dieses Dokuments

Nach jedem umgesetzten Paket: Zeile in Abschnitt 2 streichen bzw. kürzen, „Umgesetzt“ im Konzept ergänzen, Walkthrough ergänzen und Abschnitt P in [WALKTHROUGHS.md](WALKTHROUGHS.md) anpassen.
