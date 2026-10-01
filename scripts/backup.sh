#!/usr/bin/env bash
# Tägliche Datenbanksicherung (per Cron auf dem VPS), verschlüsselt mit einem Passwort aus BACKUP_PASSWORT_DATEI.
# Beispiel-Cron (täglich 02:30):  30 2 * * * /opt/kindkesmoeoen/scripts/backup.sh >> /var/log/kindkes-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
ZIEL="${BACKUP_ORDNER:-/var/backups/kindkesmoeoen}"
PASSWORT_DATEI="${BACKUP_PASSWORT_DATEI:-/root/.kindkes-backup-passwort}"
AUFBEWAHREN_TAGE="${BACKUP_AUFBEWAHREN_TAGE:-30}"
DATEI="$ZIEL/kindkes-$(date +%Y-%m-%d_%H%M).sql.gz.enc"

mkdir -p "$ZIEL"
chmod 700 "$ZIEL"
[ -f "$PASSWORT_DATEI" ] || { echo "Passwortdatei $PASSWORT_DATEI fehlt (openssl rand -base64 32 > $PASSWORT_DATEI; chmod 600 $PASSWORT_DATEI)"; exit 1; }

docker compose exec -T db pg_dump -U kindkes --clean --if-exists kindkes \
  | gzip -9 \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass "file:$PASSWORT_DATEI" -out "$DATEI"

find "$ZIEL" -name 'kindkes-*.sql.gz.enc' -mtime +"$AUFBEWAHREN_TAGE" -delete
echo "$(date -Is) Sicherung erstellt: $DATEI ($(du -h "$DATEI" | cut -f1))"

# Externe Kopie (empfohlen), z. B. mit rclone auf einen Speicher in der EU:
# rclone copy "$ZIEL" backup-eu:kindkesmoeoen --max-age 2d
