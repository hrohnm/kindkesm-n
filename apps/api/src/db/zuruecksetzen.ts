/**
 * Test-/Demo-Datenbank leeren und mit frischen Demo-Daten füllen (Codespace, lokale Entwicklung).
 *
 *   npm run db:reset:demo
 *
 * Löscht ALLE Daten. Verweigert den Dienst im Produktivbetrieb (NODE_ENV=production).
 */
import postgres from "postgres";
import { config } from "../config";
import { grunddatenAnlegen } from "../seed/seed";
import { verbinden } from "./client";
import { migrieren } from "./migrate";

if (config.produktion) {
  console.error("Abgebrochen: Im Produktivbetrieb (NODE_ENV=production) wird die Datenbank nicht zurückgesetzt.");
  process.exit(1);
}

const roh = postgres(config.databaseUrl, { onnotice: () => {} });
await roh.unsafe("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
await roh.end();
console.log("Datenbank geleert.");
await migrieren();
console.log("Datenbank migriert.");
const { db, sql } = verbinden();
const ergebnis = await grunddatenAnlegen(db, true);
await sql.end();
console.log(`Demo-Daten angelegt (${ergebnis.demoFamilien} Familien). Anmeldung: marielena@ / johanna@ / lorina@kindkesmoeoen.test, Passwort: kindkes-demo-2026`);
console.log("Bitte im Browser neu anmelden (alte Sitzungen sind gelöscht).");
