# Kindkesmöön – Praxis-App

Praxis-App für die Hebammenpraxis Kindkesmöön (Bad Doberan): Tablet-optimiert, auch fürs Handy, offline-fähig, Betrieb auf eigenem VPS.

**Stand:** Meilensteine 1–6 abgeschlossen (bereit für den Parallelbetrieb mit Testdaten):
- Meilenstein 1: Anmeldung, Team, Hebammenprofile mit Orten, Tourvorlagen und Abrechnungseinstellungen, Regelwerk-Ansicht, Fristen, Docker-Betrieb
- Meilenstein 2: Klientinnen, Betreuungen, Kinder, Besuchsdokumentation fürs Tablet, Unterschrift auf Papier oder Tablet, automatische Leistungsberechnung nach dem Hebammenhilfevertrag mit Plausibilitätsprüfung und Kontingentanzeige
- Meilenstein 3: Abrechnung – amtliche Formulare als PDF, Abrechnungsdatenblatt, Versandmappe für HebSet bzw. die gewählte Abrechnungsstelle, Versand- und Zahlungsstatus, Fristen
- Meilenstein 4: Touren – Tagesplanung mit Zeitfenstern und Optimierung, Karte und Navigation, eigenes Routing (OSRM) und Adressverzeichnis aus OpenStreetMap, Wegegeld (50100/50200) automatisch aus den Hausbesuchen, Fahrtenbuch mit Export
- Meilenstein 5: Regelwerk-Administration – Positionen, Kontingente, Zuschläge, Wegegeld, Feiertage, Fristen und Selbstzahler-Preise in der App bearbeiten und neu anlegen, CSV-Import/-Export, eigene Selbstzahler-Preise je Hebamme; wirksam erst nach Freigabe durch eine zweite Hebamme (Vier-Augen-Prinzip); Fassung freigeben, neue Fassung, Testrechner mit Vorher/Nachher
- Meilenstein 6: Offline-Betrieb – Tour, Akten, frühere Besuche, Gewichtsverläufe und Regelwerk für heute und morgen verschlüsselt auf dem Gerät (automatisch und per „Für unterwegs laden“), Besuche ohne Netz dokumentieren und abschließen inkl. vorläufiger Abrechnung, Warteschlange mit automatischer Übertragung, feldweises Zusammenführen bei Änderungen auf zwei Geräten, Statusanzeige und Abgleich-Seite (Einstellungen → Offline)
- Ergänzungen: Tour-Übersicht auf der Startseite, persönliche Ansicht der Besuchsdokumentation (Felder ein-/ausblenden, Vergleich mit dem letzten Besuch, aufklappbare Kacheln), Gewichtsseite je Kind mit WHO-Perzentilkurve und Tabelle, erweiterte Demo-Daten

| Meilenstein | Status |
|---|---|
| M-1 Grundgerüst | ✅ |
| M-2 Akte und Besuch | ✅ |
| M-3 Abrechnung | ✅ |
| M-4 Touren | ✅ |
| M-5 Regelwerk-Administration | ✅ |
| M-6 Offline-Betrieb mit Synchronisation | ✅ |

- [Konzept & Recherche](docs/KONZEPT.md)
- [Betrieb auf dem Hostinger-VPS](docs/BETRIEB.md)
- [Entwicklung](docs/ENTWICKLUNG.md)
- [Regelwerk aus dem Hebammenhilfevertrag](regelwerk/README.md)
- [Beispielkonfiguration](konfiguration/einstellungen-beispiel.json) · [Selbstzahler-Preisliste (Dummydaten)](konfiguration/selbstzahler-preisliste.json)
