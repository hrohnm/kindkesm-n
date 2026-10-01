#!/usr/bin/env bash
# Einmalig beim Erstellen des Codespaces: Abhängigkeiten, Datenbank, Demo-Daten.
set -euo pipefail
npm install
for i in $(seq 1 30); do
  node -e "require('net').connect(5432,'db').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" && break
  sleep 1
done
npm run db:migrate
npm run db:seed:demo
