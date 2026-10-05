# Hinweise für die Arbeit an diesem Repo

Praxis-App und Website der Hebammenpraxis Kindkesmöön (Bad Doberan). Hebammen: Marielena Pontus, Johanna Mede, Lorina Gosemann (Babypause).

## Zusammenarbeit

- Mit der Auftraggeberin **auf Deutsch** kommunizieren; auch Code-Bezeichner, Texte und Doku sind deutsch.
- Arbeit auf dem vorgegebenen Feature-Branch, dann PR nach `main`; nach grüner CI („pruefen“) selbst mergen und den Branch auf `origin/main` zurücksetzen.
- **Bei jeder neuen Funktion an Bausteine für die Website denken** (`apps/website`): Was davon kann Familien öffentlich helfen (z. B. Termine, freie Plätze, Kapazität, Team-Status, Anfrage)? Solche Bausteine immer mit einplanen – als öffentliche Schnittstelle unter `/api/oeffentlich/…` **ohne Personendaten** (Schreibzugriffe nur mit Einwilligung, Honigtopf und Begrenzung je IP, CORS nur für `WEBSITE_URL`) plus Komponente auf der Website – oder ausdrücklich als nächsten Schritt vorschlagen.

## Aufbau

- `apps/api` – Fastify, Drizzle, PostgreSQL; Migrationen mit `drizzle-kit generate`
- `apps/web` – Praxis-App (React, Vite, PWA, offlinefähig)
- `apps/website` – öffentliche Website (Astro, statisch, ohne Cookies/Tracking); Inhalte in `src/inhalte/praxis.ts`
- `packages/shared` – gemeinsame Logik und Schemas (zod), mit Unit-Tests
- Doku in `docs/` (Konzept, Betrieb, Entwicklung, Walkthroughs)

## Prüfen vor dem Push

`npm run typecheck`, `npm test` (API-Tests brauchen PostgreSQL), `npm run build`, `npm run build:website`; bei Oberflächenänderungen die Browser-Tests bzw. Walkthroughs (`docs/WALKTHROUGHS.md`) ergänzen.

## Sicherheit und Datenschutz

- Repo ist öffentlich: keine Geheimnisse, keine echten Gesundheitsdaten; Passwörter nur in `.env` auf dem Server.
- Demo-Konten und `kindkes-demo-2026` nur in Test-Umgebungen; `DEMO_MODUS=nein` in Produktion.
