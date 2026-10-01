# Regelwerk (Startbelegung für Modul M26)

Abrechnungsregeln aus dem **Hebammenhilfevertrag nach § 134a SGB V**
(Anlage 1.1 Vergütungsverzeichnis, Anlage 2 Abrechnung, Anlage 3 Qualität, Anlage 6 Formulare 3.1–3.5).

| Datei | Inhalt |
|---|---|
| `hhv-2026-04-01.json` | **Aktuelle Fassung ab 01.04.2026**: 129 Gebührenpositionen, 24 Kontingente, Zuschläge, Feiertage MV, Wegegeld, Pflichtangaben der Abrechnungsdaten, Fristen und Hinweise, Spaltenzuordnung der Formulare |
| `hhv-2026-04-01-positionen.csv` | Alle Positionen der Fassung 2026 zum Prüfen in Excel (Semikolon, UTF-8) |
| `hhv-2025-11-01.json` / `-positionen.csv` | Vorgängerfassung (01.11.2025–31.03.2026) für Nachträge |
| `tools/build_hhv.py` | Erzeugt alle Dateien aus den im Skript hinterlegten Vertragswerten |
| `../docs/hebammenhilfevertrag-ab-2026-04-01.pdf` | Vertragstext (Quelle) |
| `../docs/vorlagen/anlage6-versichertenbestaetigungen-3.1-3.5-ab-*.pdf` | Leere amtliche Formulare je Fassung (Druckvorlagen) |

Neu erzeugen: `python3 regelwerk/tools/build_hhv.py`

Änderungen zum 01.04.2026: neue befristete Positionen 109X5/110X5 (bis 31.12.2027), 1:1-Zulage 203X5
je Einheit statt pauschal, 60300 auch im Wochenbett, Telefonkurzberatung nicht mehr auf den Formularen
(nicht quittierungspflichtig), Formulare 3.1–3.5 überarbeitet.

**Status: Entwurf.** Alle Positionsnummern und die explizit aufgeführten Beträge wurden automatisch gegen
den Vertragstext abgeglichen. Vor der Aktivierung prüft die Praxis das Regelwerk fachlich und gibt es
nach dem Vier-Augen-Prinzip frei. Danach wird es ausschließlich in der App gepflegt.
