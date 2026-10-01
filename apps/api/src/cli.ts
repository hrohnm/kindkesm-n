/**
 * Verwaltung von Benutzerkonten auf dem Server.
 *
 *   node dist/cli.js benutzer-anlegen --email a@b.de --name "Vorname Nachname" --kuerzel VN
 *   node dist/cli.js passwort-zuruecksetzen --email a@b.de
 *   node dist/cli.js benutzer-sperren --email a@b.de
 *   gunzip -c adressen.csv.gz | node dist/cli.js adressen-importieren
 *   node dist/cli.js geo-aktualisieren
 *
 * Das neue Passwort wird einmalig ausgegeben und sollte nach der ersten Anmeldung geändert werden.
 */
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { eq, sql } from "drizzle-orm";
import { passwortHashen, zufallsPasswort } from "./auth";
import { verbinden } from "./db/client";
import { abrechnungseinstellung, benutzer, sitzung } from "./db/schema";
import { adressenImportieren } from "./geo/adressen";
import { fehlendeKoordinatenErgaenzen } from "./geo/positionen";
import { wegegeldOffeneTage } from "./wegegeld";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { email: { type: "string" }, name: { type: "string" }, kuerzel: { type: "string" }, rolle: { type: "string" } },
});
const befehl = positionals[0];
const { db, sql: verbindung } = verbinden();

/** Nach einem Adress-Import: Positionen und offenes Wegegeld aller Hebammen neu bestimmen. */
async function positionenAktualisieren(alleNeu: boolean) {
  const e = await fehlendeKoordinatenErgaenzen(db, alleNeu);
  console.log(`Positionen geprüft: ${e.klientinnen} Klientinnen, ${e.orte} Orte.`);
  if (e.offen) console.log("Hinweis: Für einige Klientinnen wurde keine Position gefunden. Bitte in der Akte auf der Karte setzen.");
  const hebammen = await db.select({ id: benutzer.id }).from(benutzer).where(eq(benutzer.rolle, "hebamme"));
  let tage = 0;
  for (const h of hebammen) tage += await wegegeldOffeneTage(db, h.id);
  console.log(`Wegegeld neu berechnet: ${tage} Tag(e).`);
}

async function kontoBefehl() {
  if (!values.email) throw new Error("--email fehlt");
  const email = values.email.trim();
  const finden = () => db.select().from(benutzer).where(sql`lower(${benutzer.email}) = lower(${email})`);

  if (befehl === "benutzer-anlegen") {
    if (!values.name || !values.kuerzel) throw new Error("--name und --kuerzel sind erforderlich");
    if ((await finden()).length) throw new Error("Es gibt bereits ein Konto mit dieser E-Mail-Adresse");
    const passwort = zufallsPasswort();
    const rolle = values.rolle === "buero" ? "buero" : "hebamme";
    const [b] = await db
      .insert(benutzer)
      .values({ email, name: values.name, kuerzel: values.kuerzel.toUpperCase(), rolle, passwortHash: await passwortHashen(passwort) })
      .returning();
    if (rolle === "hebamme") await db.insert(abrechnungseinstellung).values({ benutzerId: b!.id });
    console.log(`Konto angelegt: ${email}\nVorläufiges Passwort: ${passwort}`);
  } else if (befehl === "passwort-zuruecksetzen") {
    const [b] = await finden();
    if (!b) throw new Error("Konto nicht gefunden");
    const passwort = zufallsPasswort();
    await db.update(benutzer).set({ passwortHash: await passwortHashen(passwort) }).where(eq(benutzer.id, b.id));
    await db.delete(sitzung).where(eq(sitzung.benutzerId, b.id));
    console.log(`Neues vorläufiges Passwort für ${email}: ${passwort}`);
  } else if (befehl === "benutzer-sperren") {
    const [b] = await finden();
    if (!b) throw new Error("Konto nicht gefunden");
    await db.update(benutzer).set({ aktiv: false }).where(eq(benutzer.id, b.id));
    await db.delete(sitzung).where(eq(sitzung.benutzerId, b.id));
    console.log(`Konto gesperrt: ${email}`);
  } else {
    throw new Error(`Unbekannter Befehl: ${befehl ?? "(keiner)"}`);
  }
}

try {
  if (befehl === "adressen-importieren") {
    const anzahl = await adressenImportieren(db, createInterface({ input: process.stdin, crlfDelay: Infinity }));
    console.log(`${anzahl} Adressen importiert.`);
    await positionenAktualisieren(true);
  } else if (befehl === "geo-aktualisieren") {
    await positionenAktualisieren(false);
  } else {
    await kontoBefehl();
  }
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await verbindung.end();
}
