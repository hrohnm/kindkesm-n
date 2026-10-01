"""Erzeugt die Startregelwerke aus dem Hebammenhilfevertrag als JSON und CSV.

Quellen: Vertrag nach § 134a SGB V, Anlage 1.1 (Vergütungsvereinbarung, Abschnitt 2
Vergütungsverzeichnis), Anlage 2 (Abrechnung), Anlage 3 (Qualität) und Anlage 6
(Formulare 3.1-3.5)
  - Fassung gültig ab 01.11.2025 (Version "2025")
  - Fassung gültig ab 01.04.2026 (Version "2026", docs/hebammenhilfevertrag-ab-2026-04-01.pdf)

Aufruf:  python3 regelwerk/tools/build_hhv.py
Ausgabe: regelwerk/hhv-<datum>.json und regelwerk/hhv-<datum>-positionen.csv je Version

Die JSON-Datei ist die Startbelegung für Modul M26 (Regelwerk-Administration).
Nach dem Import wird das Regelwerk ausschließlich in der App gepflegt.
"""

import csv
import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1]

EINHEIT = 6.19          # € je 5-Minuten-Einheit
EINHEIT_ZUSCHLAG = 7.24
BELEG = 4.95
BELEG_ZUSCHLAG = 5.79
UEBERW = 1.86
UEBERW_ZUSCHLAG = 2.17

ART = {
    "0": "keine Spezifikation",
    "1": "aufsuchend",
    "2": "nicht-aufsuchend",
    "3": "Videobetreuung",
    "4": "Telefonkurzberatung",
    "5": "Beleghebamme",
    "6": "Selbstlerneinheit",
}


def build(V):
    """V = "2025" oder "2026"."""
    positionen = []


    def pos(gpos, bezeichnung, kurz, betrag, einheit, gruppe, formular=None, quittierung=True, **extra):
        p = {
            "gpos": gpos,
            "gruppe": gruppe,
            "bezeichnung": bezeichnung,
            "kurztext": kurz,
            "kategorie": int(gpos[0]),
            "zuschlag": gpos[3] == "1" if gruppe[0] in "123" and len(gpos) == 5 else False,
            "leistungsart": ART.get(gpos[4], "keine Spezifikation"),
            "betrag": betrag,
            "einheit": einheit,
            "formular": formular,
            "quittierungspflichtig": quittierung,
        }
        p.update(extra)
        positionen.append(p)


    def zeitleistung(stamm, bezeichnung, kurz, arten, zuschlag_arten, formular, **extra):
        """Positionen mit 5-Minuten-Einheiten, z.B. stamm='101' -> 10101 ... 10113."""
        for a in arten:
            gruppe = f"{stamm}XX" if zuschlag_arten else f"{stamm}0X"
            betrag = BELEG if a == "5" else EINHEIT
            pos(f"{stamm}0{a}", bezeichnung, kurz, betrag, "5min", gruppe, formular, **extra)
            if a in zuschlag_arten:
                betrag_z = BELEG_ZUSCHLAG if a == "5" else EINHEIT_ZUSCHLAG
                pos(f"{stamm}1{a}", bezeichnung + " mit Zuschlag", kurz + " Z", betrag_z, "5min", gruppe, formular, **extra)


    # ---------------------------------------------------------------- 1 Schwangerschaft
    zeitleistung("101", "Hilfeleistung in der Schwangerschaft", "Hilfe SS", "1234", "123", "3.1")
    zeitleistung("102", "Vorsorgeuntersuchung der Schwangeren", "Vorsorge", "12", "", "3.1",
                 hinweis="Bei pathologischem Verlauf nur auf ärztliche Anordnung; Dokumentation im Mutterpass.")
    zeitleistung("103", "Spezifisches Aufklärungsgespräch zum gewählten Geburtsort", "Aufkl. Geburtsort", "12", "", "3.1",
                 bedingung={"ssw_bis_exklusiv": 38},
                 hinweis="Nur bei geplanter Haus-, HgE- oder Begleit-Beleggeburt; geplanter Geburtsort auf Formular ankreuzen.")
    zeitleistung("104", "Individuelle Stillvorbereitung", "Stillvorbereitung", "12", "", "3.1")
    zeitleistung("105", "Hilfeleistung bei einer frühen außerklinischen Fehlgeburt bis 11+6 SSW", "Fehlgeburt früh", "12", "12", "3.1",
                 hinweis="Bis 90 Minuten nach der Geburt abrechenbar.")
    zeitleistung("106", "Hilfeleistung bei einer späten außerklinischen Fehlgeburt 12+0 bis 23+6 SSW", "Fehlgeburt spät", "12", "12", "3.1",
                 hinweis="Bis 3 Stunden nach der Geburt, max. 4 Kontakte, keine Höchstdauer je Kontakt.")
    zeitleistung("107", "Hilfeleistung bei einem stationären Aufenthalt als Beleghebamme", "Beleg stationär", "5", "5", "3.5")
    for gpos, z in (("10805", False), ("10815", True)):
        pos(gpos, "Überwachung bei einem stationären Aufenthalt als Beleghebamme" + (" mit Zuschlag" if z else ""),
            "Beleg Überw. SS" + (" Z" if z else ""), UEBERW_ZUSCHLAG if z else UEBERW, "5min", "108X5", "3.5")
    if V == "2026":
        befristet = {"gueltig_von": "2026-04-01", "gueltig_bis": "2027-12-31"}
        for gpos, z in (("10905", False), ("10915", True)):
            pos(gpos, "Ambulante Hilfeleistung zur Abklärung eines akuten Behandlungsbedarfs als Beleghebamme (befristet)"
                + (" mit Zuschlag" if z else ""), "Abklärung akut" + (" Z" if z else ""),
                BELEG_ZUSCHLAG if z else BELEG, "5min", "109X5", "3.5", befristung=befristet,
                hinweis="Ungeplantes Aufsuchen des Kreißsaals ohne stationäre Aufnahme; max. 30 Min./Tag, darüber nur mit Anordnung.")
        for gpos, z in (("11005", False), ("11015", True)):
            pos(gpos, "Ambulante Überwachung zur Abklärung eines akuten Behandlungsbedarfs als Beleghebamme (befristet)"
                + (" mit Zuschlag" if z else ""), "Überw. akut" + (" Z" if z else ""),
                UEBERW_ZUSCHLAG if z else UEBERW, "5min", "110X5", "3.5", befristung=befristet,
                hinweis="Max. 30 Min./Tag, darüber nur mit Anordnung.")

    # ---------------------------------------------------------------- 2 Geburt
    for gpos, ort, betrag in (
        ("20101", "im häuslichen Umfeld", UEBERW), ("20102", "in einer von Hebammen geleiteten Einrichtung", UEBERW),
        ("20105", "im Krankenhaus als Beleghebamme", BELEG), ("20111", "im häuslichen Umfeld mit Zuschlag", UEBERW_ZUSCHLAG),
        ("20112", "in einer von Hebammen geleiteten Einrichtung mit Zuschlag", UEBERW_ZUSCHLAG),
        ("20115", "im Krankenhaus als Beleghebamme mit Zuschlag", BELEG_ZUSCHLAG),
    ):
        pos(gpos, f"Hilfeleistung bei Wehen und einer Geburt {ort}", "Wehen/Geburt", betrag, "5min", "201XX",
            "3.5" if gpos.endswith("5") else "3.2")
    for gpos, ort, betrag in (
        ("20201", "im häuslichen Umfeld", 738.75), ("20202", "in einer von Hebammen geleiteten Einrichtung", 626.38),
        ("20205", "bei einer Begleit-Beleggeburt", 237.70), ("20211", "im häuslichen Umfeld mit Zuschlag", 864.34),
        ("20212", "in einer von Hebammen geleiteten Einrichtung mit Zuschlag", 732.86),
        ("20215", "bei einer Begleit-Beleggeburt mit Zuschlag", 278.10),
    ):
        pos(gpos, f"Grundpauschale Geburt {ort}", "Grundpauschale Geburt", betrag, "pauschal", "202XX", None, quittierung=False,
            hinweis="Einmal je Geburt, auch bei Mehrlingen.")
    if V == "2025":
        pos("20305", "Pauschale 1:1-Hilfeleistung bei einer stationären Geburt als Beleghebamme", "1:1 Beleg", 103.99, "pauschal", "203X5", "3.5")
        pos("20315", "Pauschale 1:1-Hilfeleistung bei einer stationären Geburt als Beleghebamme mit Zuschlag", "1:1 Beleg Z", 121.67, "pauschal", "203X5", "3.5")
    else:
        hinweis_203 = "Genau 48 Einheiten (2 h vor bis 2 h nach Geburt), weniger bei späterem Erscheinen; einmaliger Hebammenwechsel möglich, Begründung angeben."
        pos("20305", "Zulage für eine 1:1-Hilfeleistung bei einer Geburt als Beleghebamme", "1:1 Beleg", 2.17, "5min", "203X5", "3.5", hinweis=hinweis_203)
        pos("20315", "Zulage für eine 1:1-Hilfeleistung bei einer Geburt als Beleghebamme mit Zuschlag", "1:1 Beleg Z", 2.53, "5min", "203X5", "3.5", hinweis=hinweis_203)
    pos("20505", "Überwachung bei Wehen und einer Geburt als Beleghebamme", "Beleg Überw. Geburt", UEBERW, "5min", "205X5", "3.5")
    pos("20515", "Überwachung bei Wehen und einer Geburt als Beleghebamme mit Zuschlag", "Beleg Überw. Geburt Z", UEBERW_ZUSCHLAG, "5min", "205X5", "3.5")
    for gpos, ort in (("20601", "im häuslichen Umfeld"), ("20602", "in einer von Hebammen geleiteten Einrichtung"), ("20605", "im Krankenhaus als Beleghebamme")):
        pos(gpos, f"Zuschlag für Mehrlingsgeburt {ort}", "Mehrlingszuschlag", 89.14, "pauschal", "2060X", None, quittierung=False)
    zeitleistung("207", "Hilfeleistung bei einer nicht vollendeten außerklinischen Geburt", "Geburt nicht vollendet", "12", "12", "3.2")
    zeitleistung("208", "Hilfeleistung bei einer Geburt durch eine zweite Hebamme", "2. Hebamme", "125", "125", None)
    for p in positionen:
        if p["gruppe"] == "208XX":
            p["formular"] = "3.5" if p["gpos"].endswith("5") else "3.2"

    # ---------------------------------------------------------------- 3 Wochenbett
    zeitleistung("301", "Hilfeleistung im frühen Wochenbett", "WB früh", "1234", "123", "3.3")
    zeitleistung("302", "Hilfeleistung im frühen Wochenbett nach stationärer Geburt als Beleghebamme", "WB Beleg", "5", "5", "3.5")
    zeitleistung("303", "Hilfeleistung im späten Wochenbett", "WB spät", "1234", "123", "3.3")
    zeitleistung("304", "Hilfeleistung beim Kind im frühen Wochenbett bei Abwesenheit der Mutter", "WB früh Kind", "1234", "123", "3.3",
                 hinweis="Abrechnung mit der Krankenkasse des Kindes; Begründung angeben.")
    zeitleistung("305", "Hilfeleistung beim Kind im späten Wochenbett bei Abwesenheit der Mutter", "WB spät Kind", "1234", "123", "3.3",
                 hinweis="Abrechnung mit der Krankenkasse des Kindes; Begründung angeben.")
    zeitleistung("306", "Hilfeleistung bei Still- und Ernährungsschwierigkeiten des Kindes", "Still-/Ernährung", "1234", "123", "3.3")

    # ---------------------------------------------------------------- 4 Kurse (je Teilnehmerin und 5-Minuten-Einheit)
    for stamm, name, live in (("401", "Geburtsvorbereitung in der Gruppe", 0.95), ("402", "Geburtsvorbereitung in Einzelunterweisung", EINHEIT),
                              ("403", "Rückbildung in der Gruppe", 0.95), ("404", "Rückbildung in Einzelunterweisung", EINHEIT)):
        for a, fmt, betrag in (("2", "analoge Live-Kurseinheit", live), ("3", "digitale Live-Kurseinheit", live), ("6", "Selbstlerneinheit", 0.20)):
            pos(f"{stamm}0{a}", f"{name} ({fmt})", name.split(" in ")[0] + (" Gruppe" if "Gruppe" in name else " Einzel"),
                betrag, "5min", f"{stamm}0X", "3.4", leistungsart_kurs=fmt)

    # ---------------------------------------------------------------- 5 Wegegeld
    pos("50100", "Wegegeld je km", "Wegegeld", 0.97, "km", "50100", None, quittierung=False)
    pos("50200", "Anteiliges Wegegeld je km (mehrere Versicherte auf einem Weg)", "Wegegeld anteilig", 0.97, "km", "50200", None, quittierung=False,
        hinweis="Anzahl der auf der Gesamtstrecke betreuten Versicherten im Feld TXT angeben.")
    pos("50300", "Maut, Fähre, Begleitfahrt nach § 11 Abs. 4", "Maut/Fähre", None, "tatsaechlich", "50300", None, quittierung=False,
        hinweis="Tatsächliche Kosten, Nachweise in Kopie beifügen.")
    pos("50400", "Benutzung öffentlicher Verkehrsmittel", "ÖPNV", 3.37, "pauschal", "50400", None, quittierung=False)

    # ---------------------------------------------------------------- 6 Material
    MATERIAL = [
        ("60100", "Materialpauschale Schwangerschaft", 2.84, None, "Einmal je Hilfeleistung in der Schwangerschaft; nicht neben 60200, 60800, 60900."),
        ("60200", "Materialpauschale Vorsorgeuntersuchung", 3.86, None, "Einmal je Vorsorgeuntersuchung; nicht neben 60100."),
        ("60300", "Materialpauschale Entnahme von Körpermaterial (Frau)", 2.27, "3.1",
         "Einmal je Vorsorge oder Hilfeleistung in der Schwangerschaft" + (" und einmalig im Wochenbett (Formular 3.3)." if V == "2026" else ".")),
        ("60400", "Materialpauschale GDM-Screening", 4.44, "3.1", "Einmalig in der Schwangerschaft."),
        ("60500", "Materialpauschale CTG", 10.33, "3.1", "Einmal je Hilfeleistung/Vorsorge; bei Geburt mehrfach möglich (Formular 3.2)."),
        ("60600", "Materialpauschale Individuelle Stillvorbereitung", 2.30, None, "Einmalig in der Schwangerschaft."),
        ("60700", "Materialpauschale Abklärung Blasensprung", 11.56, "3.1", "Einmalig in der Schwangerschaft."),
        ("60800", "Materialpauschale Fehlgeburt", 35.80, None, "Einmalig; nur bei Fehlgeburt; nicht neben 60100."),
        ("60900", "Materialpauschale Geburt", 80.06, None, "Einmalig; nur mit vollendeter oder nicht vollendeter Geburt; nicht neben 60100."),
        ("61000", "Materialpauschale Versorgung einer Naht bei Geburtsverletzung", 57.74, "3.2", "Einmalig, nur zusammen mit 60900."),
        ("61100", "Materialpauschale Pulsoxymetrie", 7.87, "3.3", "Einmalig (auch auf Formular 3.2)."),
        ("61200", "Materialpauschale Wochenbett lang", 35.17, None, "Einmalig, wenn aufsuchende Wochenbettbetreuung bis 4 Tage nach Geburt übernommen."),
        ("61300", "Materialpauschale Wochenbett kurz", 21.79, None, "Einmalig, wenn aufsuchende Wochenbettbetreuung später als 4 Tage nach Geburt übernommen."),
        ("61400", "Materialpauschale Neugeborenen-Screening", 4.05, "3.3", "Einmalig" + (" (auch auf Formular 3.2)." if V == "2025" else ".")),
        ("61500", "Materialpauschale Entnahme von Körpermaterial (Kind)", 4.05, "3.3", "Je Hilfeleistung im Wochenbett, nur Bilirubinkontrolle bei Verdacht auf Hyperbilirubinämie."),
        ("61600", "Materialpauschale Fäden ziehen Dammnaht", 9.69, "3.3", "Einmalig."),
        ("61700", "Materialpauschale Fäden und Klammern entfernen Sectionaht", 7.56, "3.3", "Einmalig."),
        ("61800", "Perinatalerhebung", 12.06, None, "Einmalig bei außerklinischer Geburt."),
    ]
    for gpos, name, betrag, formular, hinweis in MATERIAL:
        pos(gpos, name, name.replace("Materialpauschale ", "Mat. "), betrag, "pauschal", gpos, formular,
            quittierung=formular is not None, hinweis=hinweis)

    # ---------------------------------------------------------------- Kontingente (Anlage 1.1 Abschnitt 2)
    # Felder: kontakte_pro_tag, einheiten_pro_kontakt, einheiten_pro_tag, kontakte_gesamt / kontakttage_gesamt
    K = []


    def kont(id_, name, gruppen, zeitraum=None, bezug="Versicherte", verhalten="anordnung", **grenzen):
        K.append({"id": id_, "name": name, "positionen": gruppen, "zeitraum": zeitraum, "bezug": bezug,
                  "verhalten_bei_ueberschreitung": verhalten, **grenzen})


    SET = ["101X1", "101X2", "101X3"]
    kont("101-live", "Hilfeleistung Schwangerschaft (aufsuchend/nicht-aufsuchend/Video)", SET,
         kontakte_pro_tag=2, davon_video_max=1, einheiten_pro_kontakt=18, einheiten_pro_kontakt_video=6, einheiten_pro_tag=18,
         kontakte_gesamt=None)
    kont("101-tel", "Hilfeleistung Schwangerschaft Telefonkurzberatung", ["10104"],
         kontakte_pro_tag=2, einheiten_pro_kontakt=2, einheiten_pro_tag=2, kontakte_gesamt=12)
    kont("102", "Vorsorgeuntersuchung", ["10201", "10202"], kontakte_pro_tag=1, einheiten_pro_kontakt=6, einheiten_pro_tag=6,
         kontakte_gesamt="analog Mutterschaftsrichtlinie")
    kont("103", "Aufklärungsgespräch Geburtsort", ["10301", "10302"], zeitraum={"ssw_bis_exklusiv": 38},
         kontakte_pro_tag=1, einheiten_pro_kontakt=18, einheiten_gesamt=18, kontakte_gesamt=2, verhalten="sperre")
    kont("104", "Individuelle Stillvorbereitung", ["10401", "10402"], kontakte_pro_tag=1, einheiten_pro_kontakt=9, einheiten_pro_tag=9,
         kontakte_gesamt=1, verhalten="sperre")
    kont("105", "Frühe Fehlgeburt", ["105X1", "105X2"], kontakte_pro_tag=2, einheiten_pro_kontakt=54, einheiten_pro_tag=54, kontakte_gesamt=2)
    kont("106", "Späte Fehlgeburt", ["106X1", "106X2"], kontakte_gesamt=4)
    kont("107", "Beleg stationär Schwangerschaft", ["107X5"], einheiten_pro_tag=6)
    kont("108", "Beleg Überwachung Schwangerschaft", ["108X5"], einheiten_pro_tag=6)
    if V == "2026":
        kont("109", "Abklärung akuter Behandlungsbedarf (befristet bis 31.12.2027)", ["109X5"], einheiten_pro_tag=6)
        kont("110", "Überwachung akuter Behandlungsbedarf (befristet bis 31.12.2027)", ["110X5"], einheiten_pro_tag=6)
        kont("203", "1:1-Zulage Beleggeburt", ["203X5"], einheiten_gesamt=48, verhalten="sperre")
    kont("208-ak", "Zweite Hebamme außerklinisch", ["208X1", "208X2"], einheiten_gesamt=72, verhalten="sperre")
    kont("208-beleg", "Zweite Hebamme Krankenhaus", ["208X5"], einheiten_gesamt=48, verhalten="sperre")
    kont("301", "Frühes Wochenbett", ["301X1", "301X2", "301X3", "30104"],
         zeitraum={"lebenstag_von": 1, "lebenstag_bis": 10}, bezug="Kind/Geburt",
         kontakte_pro_tag=2, video_nur_zweiter_kontakt=True, einheiten_pro_kontakt=18, einheiten_pro_kontakt_video=6,
         einheiten_pro_tag=18, telefon={"kontakte_pro_tag": 1, "einheiten_pro_kontakt": 2, "einheiten_pro_tag": 2},
         kontakte_gesamt=20,
         erste_tage={"bis_lebenstag": 3, "auch_tag_erster_hausbesuch": True, "leistungsart": "1", "einheiten_pro_kontakt": 24, "einheiten_pro_tag": 24},
         mehrling_zusatz_einheiten=2,
         sonderregeln=[
             "301X1: an Lebenstag 1-3 sowie am Tag der ersten aufsuchenden Hilfeleistung bis 24 Einheiten (120 Min.)",
             "301X1/301X2: Mehrlinge +2 Einheiten (10 Min.) je weiterem Kind",
             "Nach Fehlgeburt bis 11+6 SSW max. 6 Kontakte, bis 23+6 SSW max. 10 Kontakte",
         ])
    kont("302", "Frühes Wochenbett Beleg", ["302X5"], einheiten_pro_tag=6,
         sonderregeln=["Mehrlinge +2 Einheiten je weiterem Kind"])
    kont("303", "Spätes Wochenbett", ["303X1", "303X2", "303X3", "30304"],
         zeitraum={"lebenstag_von": 11, "lebenswoche_bis": 12}, bezug="Kind/Geburt",
         kontakte_pro_tag=1, einheiten_pro_kontakt=12, einheiten_pro_kontakt_video=6, einheiten_pro_tag=12,
         telefon={"kontakte_pro_tag": 1, "einheiten_pro_kontakt": 2, "einheiten_pro_tag": 2},
         kontakttage_gesamt=16,
         mehrling_zusatz_einheiten=2,
         sonderregeln=["303X1/303X2: Mehrlinge +2 Einheiten je weiterem Kind",
                       "Nach Fehlgeburt max. 4 Kontakte"])
    kont("304", "Frühes Wochenbett Kind (Mutter abwesend)", ["304X1", "304X2", "304X3", "30404"],
         zeitraum={"lebenstag_von": 1, "lebenstag_bis": 10}, bezug="Kind",
         kontakte_pro_tag=2, video_nur_zweiter_kontakt=True, einheiten_pro_kontakt=18, einheiten_pro_kontakt_video=6,
         einheiten_pro_tag=18, telefon={"kontakte_pro_tag": 1, "einheiten_pro_kontakt": 2, "einheiten_pro_tag": 2},
         kontakte_gesamt=20, mehrling_zusatz_einheiten=2)
    kont("305", "Spätes Wochenbett Kind (Mutter abwesend)", ["305X1", "305X2", "305X3", "30504"],
         zeitraum={"lebenstag_von": 11, "lebenswoche_bis": 12}, bezug="Kind",
         kontakte_pro_tag=1, einheiten_pro_kontakt=12, einheiten_pro_kontakt_video=6, einheiten_pro_tag=12,
         telefon={"kontakte_pro_tag": 1, "einheiten_pro_kontakt": 2, "einheiten_pro_tag": 2},
         kontakttage_gesamt=8, mehrling_zusatz_einheiten=2)
    kont("306", "Still- und Ernährungsschwierigkeiten", ["306X1", "306X2", "306X3", "30604"],
         zeitraum={"lebenswoche_von": 13, "bis": "Ende Abstillphase; bei Ernährungsproblemen bis Ende 9. Lebensmonat"},
         bezug="Kind", kontakte_pro_tag=1, einheiten_pro_kontakt=9, einheiten_pro_kontakt_video=6, einheiten_pro_tag=9,
         telefon={"kontakte_pro_tag": 1, "einheiten_pro_kontakt": 2, "einheiten_pro_tag": 2},
         kontakttage_gesamt=8, mehrling_zusatz_einheiten=2)
    kont("401", "Geburtsvorbereitung Gruppe", ["40102", "40103", "40106"], einheiten_gesamt=168, selbstlern_max_anteil=0.5,
         verhalten="sperre", sonderregeln=["Max. 10 Teilnehmerinnen; Pausen nicht abrechenbar"])
    kont("402", "Geburtsvorbereitung Einzel", ["40202", "40203", "40206"], einheiten_gesamt=84, selbstlern_max_anteil=0.5,
         verhalten="sperre", sonderregeln=["Nur mit Begründung (Gründe 1-5 laut Vertrag)"])
    kont("403", "Rückbildung Gruppe", ["40302", "40303", "40306"], einheiten_gesamt=120, selbstlern_max_anteil=0.5,
         zeitraum={"bis": "Ende 9. Monat nach Geburt"}, verhalten="sperre",
         sonderregeln=["Max. 10 Teilnehmerinnen; Pausen nicht abrechenbar"])
    kont("404", "Rückbildung Einzel", ["40402", "40403", "40406"], einheiten_gesamt=60, selbstlern_max_anteil=0.5,
         zeitraum={"bis": "Ende 9. Monat nach Geburt"}, verhalten="sperre",
         sonderregeln=["Nur mit Begründung (Gründe 1-5 laut Vertrag)"])

    # Ab 01.04.2026 sehen die Formulare keine Telefonkurzberatung (Endziffer 4) mehr vor; GPOS, die nicht in den
    # Versichertenbestätigungen vorgesehen sind, sind von der Quittierungspflicht ausgenommen (§ 12 Abs. 5 Anlage 1.1).
    if V == "2026":
        for p in positionen:
            if p["kategorie"] in (1, 3) and p["gpos"].endswith("4"):
                p["quittierungspflichtig"] = False
                p["formular"] = None
                p["hinweis"] = "Nicht quittierungspflichtig (seit 01.04.2026 nicht mehr auf den Formularen)."

    # ---------------------------------------------------------------- Formulare Anlage 6 (Spalten im Leistungsbereich)
    # eintrag: "ziffer" = Endziffer der Leistungsart eintragen (erlaubte Ziffern), "kreuz" = ankreuzen
    TEL = "1234" if V == "2025" else "123"
    FORMULARE = {
        "3.1": {"titel": "Versichertenbestätigung Schwangerschaft", "zeilen": 16 if V == "2025" else 15,
                "kopf_zusatz": ["Geplanter Geburtsort" + (" nach Aufklärungsgespräch" if V == "2026" else "") + ": häusliches Umfeld / HgE / Begleit-Beleggeburt"],
                "spalten": [
                    {"label": "Hilfeleistung Schwangerschaft", "gruppen": ["101XX"], "eintrag": "ziffer", "ziffern": TEL},
                    {"label": "Vorsorgeuntersuchung", "gruppen": ["1020X"], "eintrag": "ziffer", "ziffern": "12"},
                    {"label": "Aufklärungsgespräch Geburtsort", "gruppen": ["1030X"], "eintrag": "ziffer", "ziffern": "12"},
                    {"label": "Individuelle Stillvorbereitung", "gruppen": ["1040X"], "eintrag": "ziffer", "ziffern": "12"},
                    {"label": "Hilfeleistung Fehlgeburt", "gruppen": ["105XX", "106XX"], "eintrag": "ziffer", "ziffern": "12"},
                    {"label": "Entnahme Körpermaterial (Frau)", "gruppen": ["60300"], "eintrag": "kreuz"},
                    {"label": "GDM", "gruppen": ["60400"], "eintrag": "kreuz"},
                    {"label": "CTG", "gruppen": ["60500"], "eintrag": "kreuz"},
                    {"label": "Abklärung Blasensprung", "gruppen": ["60700"], "eintrag": "kreuz"},
                ]},
        "3.2": {"titel": "Versichertenbestätigung außerklinische Geburt", "zeilen": 16 if V == "2025" else 15,
                "kopf_zusatz": ["Uhrzeit der Geburt (bei Mehrlingen weitere Uhrzeiten)",
                                "Lebendgeburt / nicht vollendete Geburt (Verlegung) / Totgeburt" if V == "2025" else "Lebendgeburt / Totgeburt",
                                "Ort: häusliches Umfeld = 1, HgE (Geburtshaus) = 2"],
                "spalten": [
                    {"label": "Hilfeleistung bei Wehen und Geburt", "gruppen": ["201XX"], "eintrag": "ziffer", "ziffern": "12"},
                    {"label": "Hilfeleistung nicht vollendete Geburt", "gruppen": ["207XX"], "eintrag": "ziffer", "ziffern": "12"},
                    {"label": "Hilfeleistung durch 2. Hebamme", "gruppen": ["208XX"], "eintrag": "ziffer", "ziffern": "12"},
                    {"label": "CTG", "gruppen": ["60500"], "eintrag": "kreuz"},
                    {"label": "Versorgung Naht", "gruppen": ["61000"], "eintrag": "kreuz"},
                    {"label": "Pulsoxymetrie", "gruppen": ["61100"], "eintrag": "kreuz"},
                ] + ([{"label": "Neugeborenenscreening", "gruppen": ["61400"], "eintrag": "kreuz"}] if V == "2025" else [])},
        "3.3": {"titel": "Versichertenbestätigung Wochenbett", "zeilen": 17 if V == "2025" else 15,
                "kopf_zusatz": [] if V == "2025" else ["Nach Abort/Fehlgeburt: bis 11+6 SSW / bis 23+6 SSW ankreuzen",
                                                       "Bei Mehrlingen Gesamtzahl der Kinder dieser Geburt"],
                "spalten": [
                    {"label": "Wochenbett", "gruppen": ["301XX", "303XX"], "eintrag": "ziffer", "ziffern": TEL,
                     "hinweis": "Früh/spät ergibt sich aus dem Lebenstag."},
                    {"label": "Wochenbett nur Kind", "gruppen": ["304XX", "305XX"], "eintrag": "ziffer", "ziffern": TEL},
                    {"label": "Still- und Ernährungsschwierigkeiten", "gruppen": ["306XX"], "eintrag": "ziffer", "ziffern": TEL},
                ] + ([] if V == "2025" else [{"label": "Entnahme Körpermaterial (Frau)", "gruppen": ["60300"], "eintrag": "kreuz"}]) + [
                    {"label": "Pulsoxymetrie", "gruppen": ["61100"], "eintrag": "kreuz"},
                    {"label": "Neugeborenenscreening", "gruppen": ["61400"], "eintrag": "kreuz"},
                    {"label": "Entnahme Körpermaterial (Kind)", "gruppen": ["61500"], "eintrag": "kreuz"},
                    {"label": "Fäden ziehen Dammnaht", "gruppen": ["61600"], "eintrag": "kreuz"},
                    {"label": "Fäden/Klammern ziehen Sectionaht", "gruppen": ["61700"], "eintrag": "kreuz"},
                ]},
        "3.4": {"titel": "Versichertenbestätigung Kurse", "zeilen": 17 if V == "2025" else 15,
                "regeln": ["Bei Pause in Live-Kurseinheiten jeweils eine neue Zeile verwenden; Dauer ohne Pausen",
                           "Selbstlerneinheit: Datum der Bereitstellung, keine 'Uhrzeit von', Dauer des Videos bei 'Uhrzeit bis'"],
                "spalten": [
                    {"label": "Geburtsvorbereitung Gruppe", "gruppen": ["4010X"], "eintrag": "ziffer", "ziffern": "236"},
                    {"label": "Geburtsvorbereitung Einzeln", "gruppen": ["4020X"], "eintrag": "ziffer", "ziffern": "236"},
                    {"label": "Rückbildung Gruppe", "gruppen": ["4030X"], "eintrag": "ziffer", "ziffern": "236"},
                    {"label": "Rückbildung Einzeln", "gruppen": ["4040X"], "eintrag": "ziffer", "ziffern": "236"},
                ]},
        "3.5": {"titel": "Versichertenbestätigung Beleghebamme", "zeilen": 15 if V == "2025" else 11,
                "kopf_zusatz": ["Uhrzeit der Geburt, Lebendgeburt / nur Plazentageburt / Fehlgeburt / Totgeburt",
                                "Block Ärztliche Anordnung (Indikation, zusätzliche Dauer, Arztangaben)"],
                "spalten": [
                    {"label": "Hilfeleistung stationär Schwangerschaft", "gruppen": ["107X5"], "eintrag": "kreuz"},
                    {"label": "Überwachung stationär Schwangerschaft", "gruppen": ["108X5"], "eintrag": "kreuz"},
                ] + ([] if V == "2025" else [
                    {"label": "Abklärung akuter Behandlungsbedarf (befristet)", "gruppen": ["109X5"], "eintrag": "kreuz"},
                    {"label": "Überwachung akuter Behandlungsbedarf (befristet)", "gruppen": ["110X5"], "eintrag": "kreuz"},
                ]) + [
                    {"label": "Hilfeleistung Wehen und Geburt", "gruppen": ["201X5"], "eintrag": "kreuz"},
                    {"label": "1:1-Betreuung 2 h vor bis 2 h nach Geburt", "gruppen": ["203X5"], "eintrag": "kreuz"},
                    {"label": "Überwachung Wehen und Geburt", "gruppen": ["205X5"], "eintrag": "kreuz"},
                    {"label": "Hilfeleistung durch 2. Hebamme", "gruppen": ["208X5"], "eintrag": "kreuz"},
                    {"label": "Hilfeleistung Wochenbett", "gruppen": ["302X5"], "eintrag": "kreuz"},
                ]},
    }
    FORMULAR_GEMEINSAM = {
        "kopf": ["Rechnungsnummer", "Krankenkasse bzw. Kostenträger", "Name, Vorname der Versicherten", "geb. am",
                 "Krankenkassen-IK", "Versicherten-Nr.", "Errechneter Termin", "Geburtsdatum Kind"],
        "hebammen_tabelle": {"zeilen": 8, "spalten": ["Name, Vorname der Hebamme", "Heb-Nr.", "IK oder 'angestellt'"],
                             "regel": "Jede freiberufliche Hebamme mit eigenem IK; Heb-Nr. je Blatt fortlaufend in der Reihenfolge des ersten Einsatzes. "
                                      "Angestellte Hebammen: 'angestellt' statt IK (§ 12 Abs. 6 Anlage 1.1) – bei Kindkesmöön nicht relevant."},
        "zeile": ["Heb-Nr.", "Datum (TT.MM.JJJJ)", "Uhrzeit von (HH:MM)", "Uhrzeit bis (HH:MM)", "<Leistungsspalten>",
                  "Unterschrift der Versicherten", "Begründung/Vermerk (X)"],
        "fuss": ["Begründungen und Vermerke (Freitext)"],
        "hinweis": "Der Zuschlag (4. Stelle der GPOS) wird nicht eingetragen, er ergibt sich aus Datum und Uhrzeit (§ 3 Anlage 1.1).",
    }

    META = {
        "2025": {"id": "hhv-2025-11-01", "von": "2025-11-01", "bis": "2026-03-31",
                 "dokument": "Vertrag über die Versorgung mit Hebammenhilfe nach § 134a SGB V, Fassung gültig ab 01.11.2025",
                 "datei": "https://www.gkv-spitzenverband.de/media/dokumente/krankenversicherung_1/ambulante_leistungen/hebammen/25-04-02_Hebammenhilfevertrag.pdf",
                 "vorlage": "docs/vorlagen/anlage6-versichertenbestaetigungen-3.1-3.5-ab-2025-11-01.pdf",
                 "hinweis": "Nur noch für Leistungen bis 31.03.2026 (Nachträge)."},
        "2026": {"id": "hhv-2026-04-01", "von": "2026-04-01", "bis": None,
                 "dokument": "Vertrag über die Versorgung mit Hebammenhilfe nach § 134a SGB V, Fassung gültig ab 01.04.2026",
                 "datei": "docs/hebammenhilfevertrag-ab-2026-04-01.pdf",
                 "vorlage": "docs/vorlagen/anlage6-versichertenbestaetigungen-3.1-3.5-ab-2026-04-01.pdf",
                 "hinweis": "Aktuelle Fassung. Startbelegung, vor Aktivierung fachlich durch die Praxis zu prüfen (Vier-Augen-Freigabe)."},
    }[V]
    FRISTEN = [
        {"id": "einreichung-max", "art": "abrechnung", "regel": "Höchstens eine Abrechnung je Monat einreichen", "quelle": "Anlage 2 § 2",
         "app": "Versand sperren bzw. warnen, wenn im laufenden Monat schon versendet wurde"},
        {"id": "einreichung-min", "art": "abrechnung", "regel": "Mindestens zweimal im Jahr einreichen", "quelle": "Anlage 2 § 2",
         "app": "Hinweis, wenn im Kalenderhalbjahr noch nichts versendet wurde"},
        {"id": "ausschlussfrist", "art": "abrechnung", "regel": "Leistungen des Vorjahres bis 30.06. abrechnen, Urbelege bis 07.07. (Zugang)",
         "quelle": "Anlage 2 § 2", "app": "Erinnerungen ab 01.04., 01.06. und 15.06. für offene Vorjahresleistungen; Zeitpuffer für HebSet einplanen"},
        {"id": "zahlung", "art": "abrechnung", "regel": "Zahlung durch die Kasse 21 Tage (elektronisch) bzw. 28 Tage (Papier) nach vollständigem Eingang",
         "quelle": "Anlage 2 § 4", "app": "Offene Posten markieren, wenn nach Versand + Laufzeit des Abrechnungswegs keine Zahlung abgehakt ist"},
        {"id": "beanstandung", "art": "abrechnung", "regel": "Kassen können bis 30.09. für Leistungen des Vorjahres beanstanden",
         "quelle": "Anlage 2 § 5", "app": "Belege bis dahin griffbereit halten; Kürzungen erfassen"},
        {"id": "widerspruch", "art": "abrechnung", "regel": "Widerspruch gegen eine Beanstandung binnen 9 Kalendermonaten, sonst gilt sie als anerkannt",
         "quelle": "Anlage 2 § 5", "app": "Frist ab Datum der Beanstandung berechnen und erinnern"},
        {"id": "unterschrift", "art": "beleg", "regel": "Unterschrift unverzüglich nach jeder Leistung, keine nachträgliche/globale Unterschrift",
         "quelle": "Anlage 1.1 § 12", "app": "Beim Beenden eines Besuchs fehlende Unterschrift sofort anmahnen"},
        {"id": "video-signatur", "art": "beleg", "regel": "Video: PDF unverzüglich an Versicherte, Rücksendung signiert binnen 2 Wochen",
         "quelle": "Anlage 1.1 § 12", "app": "Erinnerung an Versicherte/Hebamme nach 7 und 12 Tagen"},
        {"id": "anordnung", "art": "leistung", "regel": "Ärztliche Anordnung vor Leistungsbeginn; angeordnete Leistungen bis Ende des Folgequartals erbringen",
         "quelle": "Anlage 1.1 § 13", "app": "Sperre ohne Anordnung bei Überschreitung; Ablaufdatum der Anordnung überwachen"},
        {"id": "aufklaerung-38", "art": "leistung", "regel": "Aufklärungsgespräch Geburtsort (1030X) vor der 38. SSW", "quelle": "Anlage 1.1 Abschnitt 2",
         "app": "Hinweis ab SSW 35"},
        {"id": "wb-frueh", "art": "leistung", "regel": "Frühes Wochenbett endet am 10. Lebenstag", "quelle": "Anlage 1.1 § 5",
         "app": "Kontingentanzeige; Hinweis am 9. Lebenstag"},
        {"id": "wb-spaet", "art": "leistung", "regel": "Spätes Wochenbett endet mit Ablauf der 12. Lebenswoche", "quelle": "Anlage 1.1 § 5",
         "app": "Hinweis 7 Tage vorher (zugleich Kinderurkunde vorbereiten)"},
        {"id": "rueckbildung-9m", "art": "kurs", "regel": "Rückbildungskurse nur bis Ende des 9. Monats nach der Geburt", "quelle": "Anlage 1.1 Abschnitt 2",
         "app": "Warnung bei Anmeldung und vor jeder Kurseinheit"},
        {"id": "fortbildung", "art": "qualitaet", "regel": "Mind. 40 Unterrichtsstunden Fortbildung in 3 Jahren (sofern Berufsordnung nichts anderes regelt)",
         "quelle": "Anlage 3 § 2", "app": "Stundenkonto je Hebamme, Hinweis bei Rückstand"},
        {"id": "qm-audit", "art": "qualitaet", "regel": "QM: jährliches internes Audit, alle 3 Jahre externes Audit oder Nachweis",
         "quelle": "Anlage 3.3 § 5", "app": "Jahreserinnerung je Hebamme"},
        {"id": "ik-aenderung", "art": "stammdaten", "regel": "Änderungen der IK-Daten (Adresse, Bank) unverzüglich an SVI und Verband melden",
         "quelle": "Anlage 2 § 1", "app": "Hinweis bei Änderung von Anschrift/Bankdaten im Hebammenprofil"},
    ]
    if V == "2026":
        FRISTEN.append({"id": "befristung-109-110", "art": "regelwerk", "regel": "GPOS 109X5/110X5 nur vom 01.04.2026 bis 31.12.2027",
                        "quelle": "Anlage 1.1 Abschnitt 2", "app": "Positionen automatisch nach Leistungsdatum sperren"})

    regelwerk = {
        "id": META["id"],
        "name": f"Hebammenhilfevertrag (§ 134a SGB V) ab {META['von'][8:10]}.{META['von'][5:7]}.{META['von'][:4]}",
        "gueltig_von": META["von"],
        "gueltig_bis": META["bis"],
        "status": "entwurf",
        "quelle": {
            "dokument": META["dokument"],
            "datei": META["datei"],
            "formularvorlage": META["vorlage"],
            "anlagen": ["1.1 Vergütungsvereinbarung (Abschnitt 2 Vergütungsverzeichnis)", "2 Abrechnung",
                        "3 Qualität (Fortbildung, QM)", "6 Formulare 3.1-3.5"],
            "hinweis": META["hinweis"],
        },
        "allgemein": {
            "einheit_minuten": 5,
            "einheit_regel": "Abrechnung in zusammenhängenden abgeschlossenen 5-Minuten-Einheiten (z.B. 10:04-10:09); nacheinander, nicht parallel.",
            "gpos_aufbau": {"stelle_1": "Kategorie", "stelle_2_3": "laufende Nummer", "stelle_4": "Zuschlag (0/1)",
                            "stelle_5": ART},
            "versichertenbestaetigung": [
                "Datum, Anfangs- und Endzeit (Selbstlerneinheit: Gesamtdauer) und GPOS eintragen",
                "Unverzüglich nach der Leistung von der Versicherten unterschreiben lassen",
                "Unzulässig: Vordatierung, Globalbestätigung, Blankounterschrift, nachträgliche Unterschrift",
                "Korrektur: komplette Zeile streichen, neu ausfüllen, neu unterschreiben lassen",
                "Video: Unterschrift beim nächsten persönlichen Kontakt oder einfache elektronische Signatur auf PDF binnen 2 Wochen",
                "Ersatzunterschrift (Angehörige/Arzt) nur bei schwerwiegendem Grund mit Begründung",
            ],
            "aerztliche_anordnung": "Vor Leistungsbeginn; Angaben nach § 13 Anlage 1.1; Leistungen bis Ende des Folgequartals erbringen.",
            "abrechnungsfristen": {
                "max_einreichungen_pro_monat": 1,
                "min_einreichungen_pro_jahr": 2,
                "ausschlussfrist": "30.06. für Leistungen des Vorjahres (Urbelege bis 07.07.)",
            },
            "abrechnungsdaten": {
                "quelle": "Anlage 2 § 2 und § 7",
                "hinweis": "Die Kassen erhalten Abrechnungsdaten elektronisch (§ 302 SGB V) plus Urbelege. Wegegeld und nicht "
                           "quittierungspflichtige GPOS stehen nur in den Abrechnungsdaten, nicht auf der Versichertenbestätigung. "
                           "Ein Format zwischen Hebamme und Abrechnungsstelle schreibt der Vertrag nicht vor.",
                "pflichtangaben": [
                    "Versichertennummer, Name, Vorname, Geburtsdatum, Anschrift der Versicherten",
                    "IK der leistungserbringenden Hebamme",
                    "GPOS, jede einzeln; mehrere am selben Tag jeweils eigener Einzelfallnachweis",
                    "Tag der Leistung, Uhrzeit Beginn/Ende (sofern auf Versichertenbestätigung erforderlich)",
                    "Geburtsdatum des Kindes bzw. ET bei vorgeburtlichen Leistungen",
                    "Wegegeld: gefahrene km je Hilfeleistung; bei 50200 Anzahl der auf der Strecke betreuten Versicherten (Feld TXT); "
                    "Zeiten entbehrlich, wenn die zugehörige Leistung Zeiten hat",
                    "Wegstrecke über 25 km: Grund und ggf. Name der vertretenen Hebamme",
                    "Begründungen (z.B. Fehlgeburt, Pflegschaft, Notfall) im Feld TXT",
                    "Mehrlingsgeburt: Anzahl der Kinder",
                    "Maut/Fähre/Begleitfahrt (50300): Nachweise in Kopie beifügen",
                    "Ärztliche Anordnungen als Urbeleg beifügen",
                ],
            },
        },
        "fristen_und_hinweise": FRISTEN,
        "zuschlaege": {
            "nacht": {"von": "21:00", "bis": "06:00"},
            "samstag_ab": "12:00",
            "sonntag": True,
            "feiertage": True,
            "massgeblich": "Beginn der jeweiligen 5-Minuten-Einheit; bei Pauschalen der Zeitpunkt der Geburt",
            "abbildung": "eigene GPOS mit 4. Stelle = 1",
        },
        "feiertage_bundesland": "MV",
        "feiertage": [
            {"name": "Neujahr", "regel": "01-01"},
            {"name": "Internationaler Frauentag", "regel": "03-08"},
            {"name": "Karfreitag", "regel": "ostern-2"},
            {"name": "Ostermontag", "regel": "ostern+1"},
            {"name": "Tag der Arbeit", "regel": "05-01"},
            {"name": "Christi Himmelfahrt", "regel": "ostern+39"},
            {"name": "Pfingstmontag", "regel": "ostern+50"},
            {"name": "Tag der Deutschen Einheit", "regel": "10-03"},
            {"name": "Reformationstag", "regel": "10-31"},
            {"name": "1. Weihnachtsfeiertag", "regel": "12-25"},
            {"name": "2. Weihnachtsfeiertag", "regel": "12-26"},
        ],
        "wegegeld": {
            "gpos_einzeln": "50100",
            "gpos_anteilig": "50200",
            "satz_je_km": 0.97,
            "strecke": "kürzest mögliche Strecke zur Hilfeleistung",
            "ausgangspunkt": "laut Routenkonfiguration der Hebamme; Standard: Wohnort der Hebamme",
            "max_km_regel": 25,
            "max_km_mit_begruendung": 50,
            "begruendungen_ueber_25km": ["geplante Hausgeburt (inkl. SS und frühes WB)", "Vertretung einer anderen Hebamme (Name angeben)",
                                         "keine Hebamme im Umkreis von 25 km verfügbar"],
            "mehrere_versicherte": "Gesamtstrecke / Anzahl betreuter Versicherter, je Versicherte mit 50200; Anzahl im Feld TXT angeben",
            "nicht_erstattungsfaehig": ["Wege zu Sprechstunden und Kursen in Einrichtungen (Praxis)", "Klinikdienste/Bereitschaft"],
        },
        "positionen": positionen,
        "kontingente": K,
        "formulare": {"gemeinsam": FORMULAR_GEMEINSAM, **FORMULARE},
    }

    (OUT / f"{META['id']}.json").write_text(json.dumps(regelwerk, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    with open(OUT / f"{META['id']}-positionen.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["GPOS", "Gruppe", "Bezeichnung", "Kurztext", "Kategorie", "Leistungsart", "Zuschlag", "Betrag EUR",
                    "Einheit", "Formular", "Quittierungspflichtig", "Hinweis"])
        for p in positionen:
            betrag = "" if p["betrag"] is None else f"{p['betrag']:.2f}".replace(".", ",")
            w.writerow([p["gpos"], p["gruppe"], p["bezeichnung"], p["kurztext"], p["kategorie"],
                        p.get("leistungsart_kurs", p["leistungsart"]), "ja" if p["zuschlag"] else "nein", betrag,
                        p["einheit"], p["formular"] or "", "ja" if p["quittierungspflichtig"] else "nein", p.get("hinweis", "")])

    print(f"{META['id']}: {len(positionen)} Positionen, {len(K)} Kontingente, {len(FORMULARE)} Formulare")


if __name__ == "__main__":
    for version in ("2025", "2026"):
        build(version)
