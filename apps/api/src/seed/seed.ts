/**
 * Grunddaten anlegen: Praxis, Regelwerke aus dem Hebammenhilfevertrag, Selbstzahler-Preisliste.
 * Mit --demo zusätzlich drei Demo-Konten mit fiktiven Daten (nie in der Produktivumgebung verwenden).
 *
 *   npm run db:seed              Grunddaten
 *   npm run db:seed -- --demo    Grunddaten + Demo-Konten
 */
import { eq, sql } from "drizzle-orm";
import { passwortHashen } from "../auth";
import { verbinden } from "../db/client";
import { abrechnungseinstellung, benutzer, ort, tourvorlage } from "../db/schema";
import { demoAktenAnlegen } from "./demo-akten";
import { praxisAnlegen, regelwerkImportieren, selbstzahlerImportieren } from "./import";

export const DEMO_PASSWORT = process.env.DEMO_PASSWORT ?? "kindkes-demo-2026";

type DemoHebamme = {
  email: string;
  name: string;
  kuerzel: string;
  ik: string;
  status: "aktiv" | "babypause";
  babypauseBis?: string;
  telefon: string;
  orte: Array<{ key: string; bezeichnung: string; typ: "privat" | "schule" | "kita"; anschrift: string; abholzeit?: string }>;
  touren: Array<{ name: string; wochentage: number[]; start: string; ende: string; endeSpaetestens?: string; wegegeld: string }>;
  abrechnung: Omit<typeof abrechnungseinstellung.$inferInsert, "benutzerId">;
};

// Fiktive Daten: IK-Nummern, Anschriften und Telefonnummern sind ausgedacht.
const DEMO: DemoHebamme[] = [
  {
    email: "marielena@kindkesmoeoen.test",
    name: "Marielena Pontus",
    kuerzel: "MP",
    ik: "459900011",
    status: "aktiv",
    telefon: "0157 00000001",
    orte: [{ key: "privat", bezeichnung: "Zuhause", typ: "privat", anschrift: "Mollistraße 7, 18209 Bad Doberan" }],
    touren: [{ name: "Normaler Tag", wochentage: [1, 2, 3, 4, 5], start: "privat", ende: "privat", wegegeld: "privat" }],
    abrechnung: { weg: "hebset", abrechnungsstelleName: "hebset KG", abrechnungsstelleAnschrift: "Lindauer Straße 38, 86845 Großaitingen", belegart: "eigendruck_amtliches_formular", unterschrift: "tablet", versandRhythmus: "monatlich", versandTag: 1, erinnerungVorlaufTage: 2 },
  },
  {
    email: "johanna@kindkesmoeoen.test",
    name: "Johanna Mede",
    kuerzel: "JM",
    ik: "459900022",
    status: "aktiv",
    telefon: "0157 00000002",
    orte: [
      { key: "privat", bezeichnung: "Zuhause", typ: "privat", anschrift: "Am Markt 3, 18236 Kröpelin" },
      { key: "schule", bezeichnung: "Schule der Tochter", typ: "schule", anschrift: "Schulstraße 10, 18209 Bad Doberan", abholzeit: "15:30" },
      { key: "kita", bezeichnung: "Kita", typ: "kita", anschrift: "Kindergartenweg 2, 18236 Kröpelin", abholzeit: "16:00" },
    ],
    touren: [
      { name: "Schultag", wochentage: [1, 2, 4, 5], start: "privat", ende: "schule", endeSpaetestens: "15:30", wegegeld: "privat" },
      { name: "Praxistag", wochentage: [3], start: "praxis", ende: "kita", endeSpaetestens: "16:00", wegegeld: "privat" },
    ],
    abrechnung: { weg: "hebset", abrechnungsstelleName: "hebset KG", abrechnungsstelleAnschrift: "Lindauer Straße 38, 86845 Großaitingen", belegart: "eigendruck_amtliches_formular", unterschrift: "papier", versandRhythmus: "monatlich", versandTag: 15, erinnerungVorlaufTage: 2 },
  },
  {
    email: "lorina@kindkesmoeoen.test",
    name: "Lorina Gosemann",
    kuerzel: "LG",
    ik: "459900033",
    status: "babypause",
    babypauseBis: "2027-03-01",
    telefon: "0157 00000003",
    orte: [{ key: "privat", bezeichnung: "Zuhause", typ: "privat", anschrift: "Strandstraße 20, 18211 Börgerende-Rethwisch" }],
    touren: [],
    abrechnung: { weg: "hebset", abrechnungsstelleName: "hebset KG", abrechnungsstelleAnschrift: "Lindauer Straße 38, 86845 Großaitingen", belegart: "durchschreibesatz", unterschrift: "papier", versandRhythmus: "quartalsweise", versandTag: 1, erinnerungVorlaufTage: 3 },
  },
];

export async function demoAnlegen(db: ReturnType<typeof verbinden>["db"]) {
  const passwortHash = await passwortHashen(DEMO_PASSWORT);
  const [praxisOrt] = await db.select().from(ort).where(sql`${ort.benutzerId} is null and ${ort.typ} = 'praxis'`);
  for (const h of DEMO) {
    const [vorhanden] = await db.select({ id: benutzer.id }).from(benutzer).where(eq(benutzer.email, h.email));
    if (vorhanden) continue;
    const [b] = await db
      .insert(benutzer)
      .values({ email: h.email, passwortHash, name: h.name, kuerzel: h.kuerzel, ik: h.ik, status: h.status, babypauseBis: h.babypauseBis ?? null, telefon: h.telefon })
      .returning();
    const ids: Record<string, string> = { praxis: praxisOrt!.id };
    for (const o of h.orte) {
      const [neu] = await db.insert(ort).values({ benutzerId: b!.id, bezeichnung: o.bezeichnung, typ: o.typ, anschrift: o.anschrift, abholzeit: o.abholzeit ?? null }).returning();
      ids[o.key] = neu!.id;
    }
    for (const t of h.touren) {
      await db.insert(tourvorlage).values({ benutzerId: b!.id, name: t.name, wochentage: t.wochentage, startOrtId: ids[t.start]!, endeOrtId: ids[t.ende]!, endeSpaetestens: t.endeSpaetestens ?? null, wegegeldAusgangsOrtId: ids[t.wegegeld]! });
    }
    await db.insert(abrechnungseinstellung).values({ ...h.abrechnung, benutzerId: b!.id });
  }
}

export async function grunddatenAnlegen(db: ReturnType<typeof verbinden>["db"], demo: boolean) {
  await praxisAnlegen(db);
  const r1 = await regelwerkImportieren(db, "hhv-2025-11-01");
  const r2 = await regelwerkImportieren(db, "hhv-2026-04-01");
  const s = await selbstzahlerImportieren(db);
  let familien = 0;
  if (demo) {
    await demoAnlegen(db);
    familien = await demoAktenAnlegen(db, DEMO_PASSWORT);
  }
  return { regelwerke: [r1, r2], selbstzahler: s, demoFamilien: familien };
}

// Nur ausführen, wenn diese Datei direkt gestartet wird (nicht, wenn sie in den Server gebündelt ist)
if (/[\\/]seed\.(ts|js)$/.test(process.argv[1] ?? "")) {
  const demo = process.argv.includes("--demo");
  const { db, sql: verbindung } = verbinden();
  const ergebnis = await grunddatenAnlegen(db, demo);
  console.log("Grunddaten angelegt:", JSON.stringify(ergebnis));
  if (demo) console.log(`Demo-Konten: marielena@ / johanna@ / lorina@kindkesmoeoen.test, Passwort: ${DEMO_PASSWORT}`);
  await verbindung.end();
}
