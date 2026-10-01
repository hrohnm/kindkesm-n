#!/usr/bin/env bash
# Bei jedem Öffnen: API und Web-App im Hintergrund starten (Logs in /tmp/kindkes-*.log).
cd "$(dirname "$0")/.."
pgrep -f "tsx watch src/server.ts" >/dev/null || nohup npm run dev:api > /tmp/kindkes-api.log 2>&1 &
pgrep -f "vite" >/dev/null || nohup npm run dev:web > /tmp/kindkes-web.log 2>&1 &
echo ""
echo "Kindkesmöön startet: Web-App auf Port 5173 (Tab „Ports“), API auf Port 3000."
echo "Demo-Anmeldung: johanna@kindkesmoeoen.test / kindkes-demo-2026"
echo "Logs: tail -f /tmp/kindkes-api.log /tmp/kindkes-web.log"
