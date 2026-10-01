#!/usr/bin/env bash
# API und Web-App im Hintergrund starten (Logs in /tmp/kindkes-*.log).
#   bash .devcontainer/starten.sh       startet, was noch nicht läuft
#   bash .devcontainer/starten.sh neu   beendet beide und startet sie neu (= npm run dev:neustart)
cd "$(dirname "$0")/.."
laeuft() { node -e "require('net').connect($1,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"; }

if [ "${1:-}" = "neu" ]; then
  pkill -f "tsx watch src/server.ts" 2>/dev/null || true
  pkill -f "vite/bin/vite.js" 2>/dev/null || true
  pkill -f "node_modules/.bin/vite" 2>/dev/null || true
  sleep 1
fi

# Belegte Ports zeigen an, ob schon etwas läuft (zuverlässiger als Prozessnamen)
# (nur der Startbefehl selbst läuft im Hintergrund, damit das Terminal nicht hängen bleibt)
if ! laeuft 3000; then setsid nohup npm run dev:api > /tmp/kindkes-api.log 2>&1 < /dev/null & fi
if ! laeuft 5173; then setsid nohup npm run dev:web > /tmp/kindkes-web.log 2>&1 < /dev/null & fi

for _ in $(seq 1 45); do
  laeuft 3000 && laeuft 5173 && break
  sleep 1
done
echo ""
if laeuft 3000 && laeuft 5173; then
  echo "Kindkesmöön läuft: Web-App auf Port 5173 (Tab „Ports“, Globus-Symbol), API auf Port 3000."
else
  laeuft 3000 || { echo "API startet nicht – letzte Zeilen aus /tmp/kindkes-api.log:"; tail -n 15 /tmp/kindkes-api.log; }
  laeuft 5173 || { echo "Web-App startet nicht – letzte Zeilen aus /tmp/kindkes-web.log:"; tail -n 15 /tmp/kindkes-web.log; }
fi
echo "Demo-Anmeldung: johanna@kindkesmoeoen.test / kindkes-demo-2026"
echo "Neu starten: npm run dev:neustart · Demo-Daten zurücksetzen: npm run db:reset:demo"
