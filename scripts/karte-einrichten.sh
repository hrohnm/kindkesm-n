#!/usr/bin/env bash
# Kartendaten für Tourenplanung und Wegegeld einrichten (einmalig, später zum Aktualisieren erneut ausführen):
#  1. OpenStreetMap-Extrakt Mecklenburg-Vorpommern von Geofabrik laden
#  2. Routing-Daten für OSRM vorbereiten (braucht kurzzeitig ca. 2–3 GB RAM, dauert einige Minuten)
#  3. Hausnummern als Adressverzeichnis in die App importieren (Geokodierung ohne externe Dienste)
#  4. OSRM starten und in .env eintragen
#
# Aufruf im App-Ordner auf dem Server:  scripts/karte-einrichten.sh
set -euo pipefail
cd "$(dirname "$0")/.."

REGION_URL="${REGION_URL:-https://download.geofabrik.de/europe/germany/mecklenburg-vorpommern-latest.osm.pbf}"
OSRM_IMAGE="ghcr.io/project-osrm/osrm-backend:v5.27.1"
PYTHON_IMAGE="${PYTHON_IMAGE:-python:3.12-slim}"
mkdir -p karte

echo "1/4 Kartendaten laden: $REGION_URL"
curl -fL --retry 3 -o karte/karte.osm.pbf.neu "$REGION_URL"
mv karte/karte.osm.pbf.neu karte/karte.osm.pbf

echo "2/4 Routing-Daten vorbereiten (OSRM) …"
docker run --rm -v "$PWD/karte:/data" "$OSRM_IMAGE" osrm-extract -p /opt/car.lua /data/karte.osm.pbf
docker run --rm -v "$PWD/karte:/data" "$OSRM_IMAGE" osrm-partition /data/karte.osrm
docker run --rm -v "$PWD/karte:/data" "$OSRM_IMAGE" osrm-customize /data/karte.osrm

echo "3/4 Adressverzeichnis erzeugen und importieren …"
docker run --rm -v "$PWD/karte:/data" -v "$PWD/scripts:/scripts:ro" "$PYTHON_IMAGE" \
  sh -c "pip install --quiet --root-user-action=ignore osmium && python3 /scripts/adressen_extrahieren.py /data/karte.osm.pbf /data/adressen.csv.gz"
gunzip -c karte/adressen.csv.gz | docker compose exec -T app node apps/api/dist/cli.js adressen-importieren

echo "4/4 Routing-Server starten …"
setze() {
  if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else echo "$1=$2" >> .env; fi
}
setze OSRM_URL http://osrm:5000
# Damit "docker compose up -d" den Routing-Server künftig immer mitstartet
setze COMPOSE_PROFILES karte
docker compose up -d
docker compose restart osrm
sleep 5
# Offenes Wegegeld mit echten Straßenstrecken neu berechnen
docker compose exec -T app node apps/api/dist/cli.js geo-aktualisieren

echo "Fertig. Strecken kommen jetzt vom eigenen Routing-Server; Adressen werden lokal gefunden."
