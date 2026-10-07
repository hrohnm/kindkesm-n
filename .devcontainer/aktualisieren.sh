#!/usr/bin/env bash
# Bestehenden Codespace auf den neuesten Stand von main bringen (Testdeploy):
# Code holen, Abhängigkeiten, Migrationen, frische Demo-Daten, alles neu starten.
#   npm run codespace:aktualisieren
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -n "$(git status --porcelain)" ]; then
  echo "Es gibt lokale Änderungen – bitte erst sichern oder verwerfen (git status)." >&2
  exit 1
fi
git checkout main
git pull --ff-only origin main
npm install
npm run db:migrate
npm run db:reset:demo
bash .devcontainer/starten.sh neu
echo "Aktualisiert auf $(git log -1 --format='%h %s')"
echo "Im Browser einmal hart neu laden (Strg+Umschalt+R bzw. Cmd+Umschalt+R) und neu anmelden."
