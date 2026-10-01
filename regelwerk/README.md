# Regelwerk (Startbelegung für Modul M26)

Abrechnungsregeln aus dem **Hebammenhilfevertrag nach § 134a SGB V, gültig ab 01.11.2025**
(Anlage 1.1 Vergütungsverzeichnis, Anlage 6 Formulare 3.1–3.5).

| Datei | Inhalt |
|---|---|
| `hhv-2025-11-01.json` | Vollständiges Regelwerk: 125 Gebührenpositionen, 21 Kontingente, Zuschläge, Feiertage MV, Wegegeld, Abrechnungsfristen, Spaltenzuordnung der Formulare 3.1–3.5 |
| `hhv-2025-11-01-positionen.csv` | Alle Gebührenpositionen zum Prüfen in Excel (Semikolon, UTF-8) |
| `tools/build_hhv_2025.py` | Erzeugt beide Dateien aus den im Skript hinterlegten Vertragswerten |
| `../docs/vorlagen/anlage6-versichertenbestaetigungen-3.1-3.5.pdf` | Leere amtliche Formulare (Druckvorlage für den PDF-Beleggenerator) |

Neu erzeugen: `python3 regelwerk/tools/build_hhv_2025.py`

**Status: Entwurf.** Die Werte wurden aus dem Vertragstext übernommen und gegen die
Positionsnummern im Vergütungsverzeichnis abgeglichen. Vor der Aktivierung in der App
prüft die Praxis sie fachlich. Danach wird das Regelwerk ausschließlich in der App
gepflegt (neue Version bei Vertragsänderungen).
