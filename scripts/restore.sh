#!/usr/bin/env bash
# Stellt eine Sicherung wieder her:  scripts/restore.sh /var/backups/kindkesmoeoen/kindkes-JJJJ-MM-TT_HHMM.sql.gz.enc
set -euo pipefail
cd "$(dirname "$0")/.."
DATEI="${1:?Pfad zur Sicherung angeben}"
PASSWORT_DATEI="${BACKUP_PASSWORT_DATEI:-/root/.kindkes-backup-passwort}"
read -r -p "Aktuelle Datenbank wird überschrieben. Fortfahren? (ja/nein) " ANTWORT
[ "$ANTWORT" = "ja" ] || exit 1
openssl enc -d -aes-256-cbc -pbkdf2 -pass "file:$PASSWORT_DATEI" -in "$DATEI" | gunzip | docker compose exec -T db psql -U kindkes -d kindkes -q
echo "Wiederhergestellt aus $DATEI"
