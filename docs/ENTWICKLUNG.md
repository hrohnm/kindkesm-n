# Entwicklung

## Aufbau

| Ordner | Inhalt |
|---|---|
| `apps/web` | Web-App (React, TypeScript, Vite, Tailwind CSS, PWA), optimiert für iPad und Handy |
| `apps/api` | API (Node.js, Fastify, Drizzle ORM, PostgreSQL); liefert im Betrieb auch das Frontend aus |
| `packages/shared` | Gemeinsame Regeln: Einstellungen, Validierung (zod), Fristen |
| `regelwerk` | Regelwerk aus dem Hebammenhilfevertrag (JSON/CSV) und Generator |
| `konfiguration` | Beispielkonfiguration und Selbstzahler-Preisliste (Dummydaten) |
| `deploy`, `Dockerfile`, `docker-compose.yml` | Betrieb (siehe [BETRIEB.md](BETRIEB.md)) |

## Im GitHub Codespace ansehen

Auf GitHub: **Code → Codespaces → Create codespace on main**. Der Codespace richtet sich selbst ein (Node 22, PostgreSQL, Abhängigkeiten, Demo-Daten; beim ersten Mal einige Minuten) und startet API und Web-App. Die Web-App öffnet sich über den Tab **Ports** (Port 5173). Anmeldung: `johanna@kindkesmoeoen.test` / `kindkes-demo-2026`.

Falls nichts startet: im Terminal `bash .devcontainer/starten.sh`, Logs mit `tail -f /tmp/kindkes-api.log /tmp/kindkes-web.log`.

## Lokal starten

Voraussetzungen: Node.js 22, PostgreSQL 16 (lokal oder per Docker).

```bash
npm install

# Datenbank (Beispiel mit Docker)
docker run -d --name kindkes-db -p 5432:5432 -e POSTGRES_USER=kindkes -e POSTGRES_PASSWORD=kindkes -e POSTGRES_DB=kindkes postgres:16-alpine

npm run db:migrate
npm run db:seed -- --demo

npm run dev:api     # http://localhost:3000
npm run dev:web     # http://localhost:5173 (leitet /api an die API weiter)
```

Demo-Konten: `marielena@kindkesmoeoen.test`, `johanna@kindkesmoeoen.test`, `lorina@kindkesmoeoen.test`, Passwort `kindkes-demo-2026`.

## Prüfen

```bash
npm run typecheck
npm test            # API-Tests brauchen eine Testdatenbank: TEST_DATABASE_URL (Standard postgres://kindkes:kindkes@localhost:5432/kindkes_test)

# Browser-Rundgang (iPad quer und Handy) gegen eine laufende Instanz mit Demo-Daten
npm run build && WEB_DIST=$PWD/apps/web/dist node apps/api/dist/server.js &
cd apps/web && npx playwright test
```

## Datenbank-Änderungen

Schema in `apps/api/src/db/schema.ts` ändern, dann `npm run db:generate -w @kindkesmoeoen/api` (erzeugt eine SQL-Migration in `apps/api/drizzle/`). Migrationen laufen beim Start der App automatisch.

## Regelwerk neu erzeugen

`python3 regelwerk/tools/build_hhv.py` und anschließend `npm run db:seed` (ersetzt nur Regelwerke im Status „Entwurf“).
