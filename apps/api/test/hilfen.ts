import postgres from "postgres";
import { appBauen } from "../src/app";
import { verbinden } from "../src/db/client";
import { migrieren } from "../src/db/migrate";
import { grunddatenAnlegen, DEMO_PASSWORT } from "../src/seed/seed";

export const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgres://kindkes:kindkes@localhost:5432/kindkes_test";

/** Leert die Testdatenbank, migriert, legt Demo-Daten an und baut die App. */
export async function testAppStarten() {
  const roh = postgres(TEST_DB, { onnotice: () => {} });
  await roh.unsafe("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  await roh.end();
  await migrieren(TEST_DB);
  const { db, sql } = verbinden(TEST_DB);
  await grunddatenAnlegen(db, true);
  const app = await appBauen(db);
  return { app, db, schliessen: async () => { await app.close(); await sql.end(); } };
}

export async function anmelden(app: Awaited<ReturnType<typeof appBauen>>, email: string, passwort = DEMO_PASSWORT) {
  const res = await app.inject({ method: "POST", url: "/api/auth/anmelden", payload: { email, passwort } });
  if (res.statusCode !== 200) throw new Error(`Anmeldung fehlgeschlagen: ${res.body}`);
  const cookie = res.cookies.find((c) => c.name === "kk_sitzung")!;
  return { cookie: `kk_sitzung=${cookie.value}`, daten: res.json() };
}
