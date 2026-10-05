# Website der Hebammenpraxis Kindkesmöön

Öffentliche Website, gebaut mit [Astro](https://astro.build) als statische Seiten. Getrennt von der Praxis-App: keine Datenbank, keine Cookies, kein Tracking, Schriften lokal.

Vorschau: [Desktop](../../docs/website/vorschau-desktop.jpg) · [Handy](../../docs/website/vorschau-handy.jpg)

## Entwickeln

```bash
npm run dev:website                     # http://localhost:4321
PUBLIC_APP_URL=http://localhost:3000 npm run dev:website   # mit Kursliste aus der lokalen App
npm run build:website                   # prüft (astro check) und baut nach apps/website/dist
```

Die App erlaubt die Kursliste außerhalb der Produktion für `http://localhost:4321`, in Produktion nur für `WEBSITE_URL`.

## Inhalte ändern

| Was | Wo |
|---|---|
| Team, Leistungen, Kurse, Betreuungsgebiet, Fragen, Stimmen, Zeitstrahl, Praxisdaten | `src/inhalte/praxis.ts` |
| Seitenaufbau | `src/pages/*.astro` |
| Farben, Schriften | `src/styles/global.css` (Farben der bisherigen Wix-Seite: Salbei, Mohn, Sand) |
| Bilder | `src/assets/bilder/` (werden beim Bauen automatisch verkleinert und als WebP ausgeliefert); Nachweise in `src/inhalte/bildnachweise.json` |
| Impressum, Datenschutz | `src/pages/impressum.astro`, `src/pages/datenschutz.astro` – **Entwürfe**, vor dem Livegang ergänzen und prüfen |

Platzhalterbilder (Unsplash-Lizenz) nach und nach durch eigene Fotos ersetzen: Datei in `src/assets/bilder/` ablegen, in `praxis.ts` bzw. der Seite importieren und den Eintrag in `bildnachweise.json` anpassen. Personen auf Platzhalterbildern dürfen nicht als Team oder Klientinnen ausgegeben werden.

## Live-Daten aus der App

- **Kurse:** `src/komponenten/KursListe.astro` lädt `GET {PUBLIC_APP_URL}/api/oeffentlich/kurse` (ohne Personendaten) (ohne Personendaten); die Anmeldung läuft direkt auf der Website in einem Dialog und schickt `POST {PUBLIC_APP_URL}/api/oeffentlich/kurse/<id>/anmeldung` (Einwilligung, Honigtopf, Begrenzung je IP; doppelte Anmeldung mit derselben E-Mail legt nichts neu an). Direktlink auf einen Kurs: `/kurse?kurs=<id>`. Auf der Seite „Kurse“ gibt es einen Filter nach Kursart.

  <img src="../../docs/website/kursbuchung-liste.jpg" alt="Kursliste mit Filter auf dem Handy" width="240"> <img src="../../docs/website/kursbuchung-dialog.jpg" alt="Anmeldedialog auf dem Handy" width="240">
- **Betreuungsanfrage (M11):** `src/komponenten/AnfrageFormular.astro` sendet an `POST {PUBLIC_APP_URL}/api/oeffentlich/anfrage` (Einwilligung, Honigtopf, 5 je Stunde und IP); ohne JavaScript erscheint der Weg per E-Mail/Telefon.
- **Kapazitätsampel und Team-Status (M11):** `src/komponenten/Kapazitaet.astro` und `src/skripte/praxis-status.ts` lesen `GET {PUBLIC_APP_URL}/api/oeffentlich/praxis` (nur Stufe je Monat und Babypause-Status, keine Zahlen, keine Familien); Elemente mit `data-team-status="Name"` werden aktualisiert.

## Betrieb

`Dockerfile.website` baut die Seiten und liefert sie mit Caddy aus (`deploy/website.Caddyfile`, inklusive 301-Weiterleitungen der alten Wix-Adressen). Einrichtung: `docs/BETRIEB.md`, Abschnitt 6b.
