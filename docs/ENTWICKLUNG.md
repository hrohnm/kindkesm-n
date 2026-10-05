# Entwicklung

## Aufbau

| Ordner | Inhalt |
|---|---|
| `apps/web` | Web-App (React, TypeScript, Vite, Tailwind CSS, PWA), optimiert für iPad und Handy |
| `apps/api` | API (Node.js, Fastify, Drizzle ORM, PostgreSQL); liefert im Betrieb auch das Frontend aus |
| `packages/shared` | Gemeinsame Regeln: Einstellungen, Validierung (zod), Fristen, Abrechnungslogik (`plausi.ts`) |
| `regelwerk` | Regelwerk aus dem Hebammenhilfevertrag (JSON/CSV) und Generator |
| `konfiguration` | Beispielkonfiguration und Selbstzahler-Preisliste (Dummydaten) |
| `deploy`, `Dockerfile`, `docker-compose.yml` | Betrieb (siehe [BETRIEB.md](BETRIEB.md)) |

## Im GitHub Codespace ansehen

Auf GitHub: **Code → Codespaces → Create codespace on main**. Der Codespace richtet sich selbst ein (Node 22, PostgreSQL, Abhängigkeiten, Demo-Daten; beim ersten Mal einige Minuten) und startet API, Web-App und Website. Die Web-App öffnet sich über den Tab **Ports** (Port 5173), die Website über Port 4321 – mit Kursen, Anfrageformular und Kapazitätsampel live aus der App. Anmeldung: `johanna@kindkesmoeoen.test` / `kindkes-demo-2026`.

Nützliche Befehle im Terminal des Codespaces:

| Befehl | Wirkung |
|---|---|
| `npm run db:reset:demo` | Datenbank leeren und frische Demo-Daten einspielen (danach neu anmelden) |
| `npm run dev:neustart` | API, Web-App und Website neu starten (z. B. nach `git pull`) |
| `tail -f /tmp/kindkes-api.log /tmp/kindkes-web.log /tmp/kindkes-website.log` | Logs ansehen |

Meldet der Browser **401**, ist der Port privat: im Tab **Ports** über das Globus-Symbol öffnen oder Port 5173 per Rechtsklick auf **Public** stellen (nur mit Demo-Daten!).

Im Codespace läuft kein Routing-Server: Strecken werden aus der Luftlinie geschätzt. Die Demo-Familien und -Orte haben Positionen aus einem kleinen Demo-Adressverzeichnis (`konfiguration/demo-adressen.csv`).

## Lokal starten

Voraussetzungen: Node.js 22, PostgreSQL 16 (lokal oder per Docker).

```bash
npm install

# Datenbank (Beispiel mit Docker)
docker run -d --name kindkes-db -p 5432:5432 -e POSTGRES_USER=kindkes -e POSTGRES_PASSWORD=kindkes -e POSTGRES_DB=kindkes postgres:16-alpine

npm run db:migrate
npm run db:seed:demo

npm run dev:api     # http://localhost:3000
npm run dev:web     # http://localhost:5173 (leitet /api an die API weiter)
```

Demo-Konten: `marielena@kindkesmoeoen.test`, `johanna@kindkesmoeoen.test`, `lorina@kindkesmoeoen.test`, Passwort `kindkes-demo-2026`. Dazu neun fiktive Familien (Schwangerschaften, frühes und spätes Wochenbett mit Gewichtsverläufen, Zwillinge, eine frische Geburt, eine Anfrage) und volle Touren für heute; alle Daten werden relativ zum heutigen Tag angelegt. Die automatischen Tests nutzen nur die ersten vier Familien.

Die Abrechnungslogik (`packages/shared/src/plausi.ts`) liest alle Beträge, Kontingente, Zuschlagszeiten und Feiertage aus dem Regelwerk; nur die Logik ist im Code. Änderungen daran immer mit Tests in `plausi.test.ts` absichern.

## Prüfen

```bash
npm run typecheck
npm test            # API-Tests brauchen eine Testdatenbank: TEST_DATABASE_URL (Standard postgres://kindkes:kindkes@localhost:5432/kindkes_test)

# OSRM-Anbindung (optional, gegen einen laufenden OSRM-Server)
(cd apps/api && OSRM_TEST_URL=http://localhost:5000 npx vitest run test/osrm.test.ts)

# Browser-Rundgang (iPad quer und Handy) gegen eine laufende Instanz mit Demo-Daten
npm run build && ANMELDUNG_MAX=1000 WEB_DIST=$PWD/apps/web/dist node apps/api/dist/server.js &
cd apps/web && npx playwright test

# Alle User-Walkthroughs (docs/WALKTHROUGHS.md) mit Screenshots; Demo-Daten vorher zurücksetzen
npm run db:reset:demo && (cd apps/web && npm run walkthrough)
```

Ergebnis und Ablauf des Walkthrough-Durchlaufs: [walkthrough-protokoll/README.md](walkthrough-protokoll/README.md).

## Datenbank-Änderungen

Schema in `apps/api/src/db/schema.ts` ändern, dann `npm run db:generate -w @kindkesmoeoen/api` (erzeugt eine SQL-Migration in `apps/api/drizzle/`). Migrationen laufen beim Start der App automatisch.

## Regelwerk neu erzeugen

`python3 regelwerk/tools/build_hhv.py` und anschließend `npm run db:seed` (ersetzt nur Regelwerke im Status „Entwurf“).

## Logo und Icons

Das Praxislogo liegt als `apps/web/public/logo.png`. Favicon und PWA-Icons daraus erzeugen: `python3 scripts/icons_erzeugen.py` (benötigt Pillow).

## Touren und Wegegeld

- Optimierer, Wegegeld-Aufteilung und Fahrtenbuch-Regeln: `packages/shared/src/tour.ts` (Tests in `tour.test.ts`)
- Routing (OSRM mit Luftlinien-Ersatz): `apps/api/src/geo/routing.ts`; Adressverzeichnis: `apps/api/src/geo/adressen.ts`
- Wegegeld je Tag: `apps/api/src/wegegeld.ts` (wird nach jedem Speichern eines Besuchs neu berechnet)
- Adressverzeichnis aus einem OSM-Extrakt erzeugen: `python3 scripts/adressen_extrahieren.py region.osm.pbf adressen.csv.gz` (pyosmium), Import mit `gunzip -c adressen.csv.gz | node apps/api/dist/cli.js adressen-importieren`

## Offline-Betrieb

- Gerätespeicher (IndexedDB + AES-GCM): `apps/web/src/lib/offline/speicher.ts`; Lesecache und freigegebene Pfade: `cache.ts`
- Warteschlange und Abgleich: `apps/web/src/lib/offline/ausgang.ts`; Zusammenführen (mit Tests): `packages/shared/src/abgleich.ts`
- Vorladen für heute/morgen: `vorrat.ts`; Start, Takt und Abmelden: `start.ts`; Anzeige: `komponenten/OfflineStatus.tsx`, Seite `seiten/einstellungen/Offline.tsx`
- `api()` (`apps/web/src/lib/api.ts`): GET ohne Verbindung aus dem Cache, POST/PUT mit `offline: {...}` in die Warteschlange; sonst `ApiFehler` mit Status 0
- Server: `besuchSchema` mit optionaler `id` (Gerät) und `stand` (409 mit `konflikt` und `aktuell`), `GET /api/regelwerk-fuer`, `GET /api/betreuungen/:id/abrechnungskontext`
- Browser-Test: `apps/web/e2e/offline.spec.ts` (Playwright `context.setOffline`)

## Kurse (M12)

- Regeln der Kursabrechnung (Kontingent, Selbstlern-Anteil, Zeitraum Rückbildung): `packages/shared/src/kurs.ts` (Tests in `kurs.test.ts`)
- API: `apps/api/src/routes/kurse.ts`; Kurseinheiten werden als Kontakt (`besuch`, Typ `geburtsvorbereitung`/`rueckbildung`, Art = Format 2/3/6) mit Leistungen gespeichert und nur über die Anwesenheit geändert
- Formular 3.4: gleiche Tabelle wie 3.1/3.3, abweichende Unterschriftsspalte in `regelwerk/formulare/anlage6-2026-04-01.layout.json` (`abweichungen`)
- Öffentliche Schnittstellen ohne Anmeldung: alles unter `/api/oeffentlich/` (Kursliste, Anmeldung)

## Kinderurkunde

- Gestaltungen Ostsee/Leuchtturm/Schlicht: `apps/api/src/pdf/urkunde.ts`; Praxis-Design „Kindkesmöön“: `apps/api/src/pdf/urkunde-kindkesmoeoen.ts`
- Schreibschrift: `apps/api/assets/fonts/DancingScript.ttf` (SIL Open Font License, siehe `OFL-DancingScript.txt`), eingebettet als Teilmenge über `@pdf-lib/fontkit`; das Docker-Image kopiert `apps/api/assets` mit
