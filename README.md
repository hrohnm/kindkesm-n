# Kindkesmöön – Praxis-App

Praxis-App für die Hebammenpraxis Kindkesmöön (Bad Doberan): Tablet-optimiert, auch fürs Handy, offline-fähig (geplant), Betrieb auf eigenem VPS.

**Stand:** Meilenstein 4 (Touren) abgeschlossen, als Nächstes Meilenstein 5 (Regelwerk-Administration):
- Meilenstein 1: Anmeldung, Team, Hebammenprofile mit Orten, Tourvorlagen und Abrechnungseinstellungen, Regelwerk-Ansicht, Fristen, Docker-Betrieb
- Meilenstein 2: Klientinnen, Betreuungen, Kinder, Besuchsdokumentation fürs Tablet, Unterschrift auf Papier oder Tablet, automatische Leistungsberechnung nach dem Hebammenhilfevertrag mit Plausibilitätsprüfung und Kontingentanzeige
- Meilenstein 3: Abrechnung – amtliche Formulare als PDF, Abrechnungsdatenblatt, Versandmappe für HebSet bzw. die gewählte Abrechnungsstelle, Versand- und Zahlungsstatus, Fristen
- Meilenstein 4: Touren – Tagesplanung mit Zeitfenstern und Optimierung, Karte und Navigation, eigenes Routing (OSRM) und Adressverzeichnis aus OpenStreetMap, Wegegeld (50100/50200) automatisch aus den Hausbesuchen, Fahrtenbuch mit Export
- Ergänzungen: Tour-Übersicht auf der Startseite, persönliche Ansicht der Besuchsdokumentation (Felder ein-/ausblenden, Vergleich mit dem letzten Besuch, aufklappbare Kacheln), Gewichtsseite je Kind mit WHO-Perzentilkurve und Tabelle, erweiterte Demo-Daten

| Meilenstein | Status |
|---|---|
| M-1 Grundgerüst | ✅ |
| M-2 Akte und Besuch | ✅ |
| M-3 Abrechnung | ✅ |
| M-4 Touren | ✅ |
| M-5 Regelwerk-Administration (Positionen, Kontingente, Fristen, Selbstzahler-Preise, Vier-Augen-Freigabe, Testrechner) | als Nächstes |
| M-6 Offline-Betrieb mit Synchronisation | offen |

- [Konzept & Recherche](docs/KONZEPT.md)
- [Betrieb auf dem Hostinger-VPS](docs/BETRIEB.md)
- [Entwicklung](docs/ENTWICKLUNG.md)
- [Regelwerk aus dem Hebammenhilfevertrag](regelwerk/README.md)
- [Beispielkonfiguration](konfiguration/einstellungen-beispiel.json) · [Selbstzahler-Preisliste (Dummydaten)](konfiguration/selbstzahler-preisliste.json)
