#!/usr/bin/env python3
"""
Liest alle Hausnummern aus einem OpenStreetMap-Extrakt (.osm.pbf) und schreibt sie als
plz;ort;strasse;hausnummer;lat;lon (gzip) für das Adressverzeichnis der App.

    python3 adressen_extrahieren.py mecklenburg-vorpommern-latest.osm.pbf adressen.csv.gz

Benötigt pyosmium (pip install osmium). Gebäude-Umrisse werden auf ihren Mittelpunkt reduziert.
"""
import gzip
import sys

import osmium


class Adressen(osmium.SimpleHandler):
    def __init__(self, ausgabe):
        super().__init__()
        self.aus = ausgabe
        self.anzahl = 0

    def schreiben(self, tags, lat, lon):
        hnr = tags.get("addr:housenumber")
        strasse = tags.get("addr:street") or tags.get("addr:place")
        plz = tags.get("addr:postcode")
        ort = tags.get("addr:city") or tags.get("addr:place") or ""
        if not (hnr and strasse and plz):
            return
        # Mehrere Hausnummern ("3;5" oder "3,5") einzeln aufnehmen
        for nr in hnr.replace(",", ";").split(";"):
            nr = nr.strip()
            if nr:
                felder = [plz.strip(), ort.strip(), strasse.strip(), nr, f"{lat:.6f}", f"{lon:.6f}"]
                self.aus.write(";".join(f.replace(";", " ") for f in felder) + "\n")
                self.anzahl += 1

    def node(self, n):
        if "addr:housenumber" in n.tags:
            self.schreiben(n.tags, n.location.lat, n.location.lon)

    def way(self, w):
        if "addr:housenumber" not in w.tags:
            return
        punkte = [(nd.lat, nd.lon) for nd in w.nodes if nd.location.valid()]
        if len(punkte) > 1 and punkte[0] == punkte[-1]:
            punkte = punkte[:-1]  # geschlossener Umriss: Startpunkt nicht doppelt zählen
        if punkte:
            lat = sum(p[0] for p in punkte) / len(punkte)
            lon = sum(p[1] for p in punkte) / len(punkte)
            self.schreiben(w.tags, lat, lon)


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    with gzip.open(sys.argv[2], "wt", encoding="utf-8") as aus:
        aus.write("plz;ort;strasse;hausnummer;lat;lon\n")
        h = Adressen(aus)
        h.apply_file(sys.argv[1], locations=True, idx="flex_mem")
    print(f"{h.anzahl} Adressen geschrieben: {sys.argv[2]}")


if __name__ == "__main__":
    main()
