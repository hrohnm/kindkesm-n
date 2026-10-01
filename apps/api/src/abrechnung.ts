/**
 * Abrechnungsunterlagen: Fälle zusammenstellen, vor dem Versand prüfen und die Versandmappe als PDF erzeugen.
 * Inhalt der Abrechnungsdaten nach Anlage 2 § 2/§ 7, Formulare nach Anlage 6 des Hebammenhilfevertrags.
 */
import { LEISTUNGSART_LABEL, type Leistungsart, type RegelwerkDaten } from "@kindkesmoeoen/shared";
import { and, asc, eq, inArray, isNull, lte } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import type { Datenbank } from "./db/client";
import { abrechnungseinstellung, benutzer, besuch, betreuung, kind, klientin, leistung, praxis, regelwerk, versand } from "./db/schema";
import { formularSeiten, formularSpalte, layoutFuer, type FormularZeile } from "./pdf/formular";
import { Schreiber, datumDe, euro, schriftenLaden } from "./pdf/werkzeug";

type Leistung = typeof leistung.$inferSelect;
type Besuch = typeof besuch.$inferSelect;

export type Fall = {
  betreuungId: string;
  klientin: typeof klientin.$inferSelect;
  et: string | null;
  kinder: Array<typeof kind.$inferSelect>;
  besuche: Array<Besuch & { leistungen: Leistung[] }>;
  summe: number;
  zeitraum: [string, string];
  pruefung: Array<{ stufe: "fehler" | "warnung"; text: string }>;
};

export type Hebamme = { id: string; name: string; kuerzel: string; ik: string | null };

const summe = (ls: Leistung[]) => Math.round(ls.reduce((s, l) => s + Number(l.betrag), 0) * 100) / 100;

/** Lädt die Fälle einer Hebamme: entweder alle noch nicht versendeten Leistungen bis zu einem Datum oder die eines Versands. */
export async function faelleLaden(db: Datenbank, hebammeId: string, auswahl: { bis: string } | { versandId: string }): Promise<Fall[]> {
  const bedingung =
    "versandId" in auswahl
      ? eq(leistung.versandId, auswahl.versandId)
      : and(eq(leistung.hebammeId, hebammeId), isNull(leistung.versandId), lte(leistung.datum, auswahl.bis), eq(besuch.status, "abgeschlossen"));
  const zeilen = await db
    .select({ l: leistung, b: besuch })
    .from(leistung)
    .innerJoin(besuch, eq(besuch.id, leistung.besuchId))
    .where(bedingung)
    .orderBy(asc(besuch.datum), asc(besuch.von), asc(leistung.gpos));
  if (!zeilen.length) return [];

  const betreuungIds = [...new Set(zeilen.map((z) => z.b.betreuungId))];
  const betreuungen = await db.select().from(betreuung).where(inArray(betreuung.id, betreuungIds));
  const klientinnen = await db.select().from(klientin).where(inArray(klientin.id, betreuungen.map((b) => b.klientinId)));
  const kinder = await db.select().from(kind).where(inArray(kind.betreuungId, betreuungIds)).orderBy(asc(kind.geburtsdatum));

  return betreuungen
    .map((bt) => {
      const k = klientinnen.find((x) => x.id === bt.klientinId)!;
      const eigene = zeilen.filter((z) => z.b.betreuungId === bt.id);
      const besuche = [...new Map(eigene.map((z) => [z.b.id, z.b])).values()].map((b) => ({ ...b, leistungen: eigene.filter((z) => z.b.id === b.id).map((z) => z.l) }));
      const alle = besuche.flatMap((b) => b.leistungen);
      const pruefung: Fall["pruefung"] = [];
      if (!k.versichertennummer) pruefung.push({ stufe: "fehler", text: "Versichertennummer fehlt" });
      if (!k.kassenIk) pruefung.push({ stufe: "fehler", text: "Kassen-IK fehlt" });
      if (!k.krankenkasse) pruefung.push({ stufe: "fehler", text: "Krankenkasse fehlt" });
      if (!k.strasse || !k.plz || !k.ort) pruefung.push({ stufe: "fehler", text: "Anschrift unvollständig (Pflichtangabe der Abrechnung)" });
      const mitWarnung = besuche.filter((b) => (b.hinweise as Array<{ stufe: string }>).some((h) => h.stufe === "warnung"));
      if (mitWarnung.length) pruefung.push({ stufe: "warnung", text: `${mitWarnung.length} Besuch(e) mit Hinweis (z. B. Kontingent): ärztliche Anordnung bzw. Begründung beilegen` });
      return {
        betreuungId: bt.id,
        klientin: k,
        et: bt.et,
        kinder: kinder.filter((x) => x.betreuungId === bt.id),
        besuche,
        summe: summe(alle),
        zeitraum: [besuche[0]!.datum, besuche.at(-1)!.datum] as [string, string],
        pruefung,
      };
    })
    .sort((a, b) => a.klientin.nachname.localeCompare(b.klientin.nachname));
}

async function regelwerke(db: Datenbank, ids: string[]): Promise<Map<string, RegelwerkDaten>> {
  const r = ids.length ? await db.select({ id: regelwerk.id, daten: regelwerk.daten }).from(regelwerk).where(inArray(regelwerk.id, ids)) : [];
  return new Map(r.map((x) => [x.id, x.daten as RegelwerkDaten]));
}

type Zeileninfo = { besuch: Besuch; formular: string; zeile: FormularZeile };

/** Ordnet die quittierungspflichtigen Besuche eines Falls den Formularzeilen zu. */
function formularzeilen(fall: Fall, rws: Map<string, RegelwerkDaten>): Zeileninfo[] {
  const ergebnis: Zeileninfo[] = [];
  for (const b of fall.besuche) {
    const rw = rws.get(b.regelwerkId ?? "");
    const haupt = b.leistungen.find((l) => l.quittierungspflichtig && l.formular && !l.gpos.startsWith("6"));
    if (!rw || !haupt || !b.stamm) continue;
    const formular = haupt.formular!;
    const spalte = formularSpalte(rw, formular, b.stamm, b.art);
    if (!spalte) continue;
    const material = b.leistungen
      .filter((l) => l.gpos.startsWith("6") && l.formular === formular)
      .map((l) => formularSpalte(rw, formular, l.gpos)?.index)
      .filter((i): i is number => i !== undefined);
    const u = b.unterschrift as { art: string; bild?: string };
    ergebnis.push({
      besuch: b,
      formular,
      zeile: {
        hebNr: 1,
        datum: b.datum,
        von: b.von,
        bis: b.bis,
        spalte: spalte.index,
        eintrag: spalte.eintrag,
        material,
        vermerk: (b.hinweise as Array<{ stufe: string }>).some((h) => h.stufe === "warnung"),
        unterschriftPng: u.art === "tablet" ? u.bild : undefined,
      },
    });
  }
  return ergebnis;
}

const versichertenName = (k: Fall["klientin"]) => `${k.nachname}, ${k.vorname}`;
const anschrift = (k: Fall["klientin"]) => [k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");

/** Versandmappe: Deckblatt, je Fall Abrechnungsdatenblatt (mit Kontrollliste) und selbst gedruckte Formulare. */
export async function mappeErzeugen(db: Datenbank, versandId: string): Promise<{ pdf: Uint8Array; formularBlaetter: number }> {
  const [v] = await db.select().from(versand).where(eq(versand.id, versandId));
  if (!v) throw new Error("Versand nicht gefunden");
  const [hb] = await db.select().from(benutzer).where(eq(benutzer.id, v.hebammeId));
  const [p] = await db.select().from(praxis).where(eq(praxis.id, 1));
  const faelle = await faelleLaden(db, v.hebammeId, { versandId });
  const rws = await regelwerke(db, [...new Set(faelle.flatMap((f) => f.besuche.map((b) => b.regelwerkId ?? "")))]);

  const doc = await PDFDocument.create();
  doc.setTitle(`Abrechnung ${v.nummer}`);
  doc.setAuthor(hb!.name);
  const s = await schriftenLaden(doc);

  // ---------------------------------------------------------------- Deckblatt
  const d = new Schreiber(doc, s, `Abrechnung ${v.nummer} · ${hb!.name} · IK ${hb!.ik ?? "–"}`);
  d.text(`Abrechnung ${v.nummer}`, { groesse: 18, fett: true, abstand: 6 });
  d.felder([
    ["Absender", `${hb!.name}, Hebamme · ${p?.name ?? ""}, ${p?.anschrift ?? ""}`],
    ["IK der Hebamme", hb!.ik ?? "FEHLT"],
    ["Empfänger", [v.empfaengerName, v.empfaengerAnschrift].filter(Boolean).join(", ") || "Selbstabrechnung"],
    ["Leistungen bis", datumDe(v.bis)],
    ["Erstellt am", datumDe(new Date().toISOString().slice(0, 10))],
  ]);
  d.linie();
  const zeilen = faelle.map((f) => {
    const zi = formularzeilen(f, rws);
    const tablet = zi.filter((z) => z.zeile.unterschriftPng).length;
    const papier = zi.length - tablet;
    return [
      versichertenName(f.klientin),
      `${f.klientin.krankenkasse ?? ""}\n${f.klientin.versichertennummer ?? ""}`,
      `${datumDe(f.zeitraum[0])}–${datumDe(f.zeitraum[1])}`,
      [...new Set(zi.map((z) => z.formular))].join(", ") || "–",
      [tablet ? `${tablet}× Eigendruck` : "", papier ? `${papier}× Original` : ""].filter(Boolean).join("\n") || "–",
      euro(f.summe),
    ];
  });
  d.tabelle(["Versicherte", "Kasse / Vers.-Nr.", "Zeitraum", "Formular", "Belege", "Betrag"], [...zeilen, ["Summe", "", "", "", `${faelle.length} ${faelle.length === 1 ? "Fall" : "Fälle"}`, euro(Number(v.summe))]], [125, 115, 95, 50, 70, 56.28], {
    rechts: [5],
    fettLetzte: true,
  });
  d.text("„Eigendruck“: Versichertenbestätigung mit Unterschrift auf dem Tablet, in dieser Mappe enthalten. „Original“: unterschriebenes Papierformular aus der Mappe der Familie beilegen.", { groesse: 8, farbe: [0.35, 0.37, 0.3] });
  d.text("Wegegeld, nicht quittierungspflichtige Pauschalen und Begründungen stehen auf dem Abrechnungsdatenblatt des jeweiligen Falls (Anlage 2 § 2).", { groesse: 8, farbe: [0.35, 0.37, 0.3] });

  // ---------------------------------------------------------------- je Fall
  let formularBlaetter = 0;
  for (const f of faelle) {
    const zi = formularzeilen(f, rws);
    const w = new Schreiber(doc, s, `Abrechnung ${v.nummer} · Abrechnungsdatenblatt · ${versichertenName(f.klientin)}`);
    w.text("Abrechnungsdatenblatt", { groesse: 15, fett: true, abstand: 4 });
    w.felder([
      ["Versicherte", `${versichertenName(f.klientin)}, geb. ${datumDe(f.klientin.geburtsdatum)}`],
      ["Anschrift", anschrift(f.klientin)],
      ["Krankenkasse", `${f.klientin.krankenkasse ?? ""} · IK ${f.klientin.kassenIk ?? ""}`],
      ["Versichertennummer", f.klientin.versichertennummer ?? ""],
      ["Errechneter Termin", datumDe(f.et)],
      ["Kind(er)", f.kinder.map((k) => `${k.vorname}, geb. ${datumDe(k.geburtsdatum)}${k.geburtszeit ? ` ${k.geburtszeit} Uhr` : ""}`).join("; ") || "–"],
      ["Hebamme", `${hb!.name} · IK ${hb!.ik ?? ""}`],
    ]);
    w.text("Leistungen", { fett: true, groesse: 10.5, abstand: 3 });
    const zeilenL = f.besuche.flatMap((b) => {
      const u = (b.unterschrift as { art: string }).art;
      const beleg = u === "tablet" ? "Eigendruck" : u === "papier" ? "Original" : "keine Quittung nötig";
      return b.leistungen.map((l) => [
        datumDe(l.datum),
        l.einheit === "5min" ? `${b.von}–${b.bis}` : "",
        l.gpos,
        l.txt ? `${l.bezeichnung}\n${l.txt}` : l.bezeichnung,
        l.einheit === "5min" ? `${l.menge} × 5 Min.` : l.einheit === "pauschal" ? "pauschal" : `${String(l.menge).replace(".", ",")} ${l.einheit}`,
        `${LEISTUNGSART_LABEL[b.art as Leistungsart]}\n${l.quittierungspflichtig ? beleg : "nur Datenblatt"}`,
        euro(l.betrag),
      ]);
    });
    w.tabelle(["Datum", "Zeit", "GPOS", "Leistung", "Menge", "Art / Beleg", "Betrag"], [...zeilenL, ["", "", "", "Summe", "", "", euro(f.summe)]], [52, 58, 38, 170, 60, 80, 53.28], { rechts: [6], fettLetzte: true, groesse: 8 });

    const begruendungen = f.besuche.flatMap((b) => (b.hinweise as Array<{ stufe: string; text: string }>).filter((h) => h.stufe === "warnung").map((h) => `${datumDe(b.datum)}: ${h.text}`));
    if (begruendungen.length) {
      w.text("Hinweise und Begründungen", { fett: true, groesse: 10.5, abstand: 2 });
      for (const t of begruendungen) w.text(`• ${t}`, { groesse: 8.5, einzug: 4 });
    }

    const original = zi.filter((z) => !z.zeile.unterschriftPng);
    if (original.length) {
      w.text("Kontrollliste: Original-Formular aus der Mappe beilegen", { fett: true, groesse: 10.5, abstand: 2 });
      w.text("Diese Zeilen müssen auf dem unterschriebenen Papierformular stehen:", { groesse: 8.5 });
      w.tabelle(
        ["Formular", "Datum", "von", "bis", "Spalte / Eintrag", "Material", "Vermerk"],
        original.map((z) => {
          const rw = rws.get(z.besuch.regelwerkId ?? "")!;
          const spalten = (rw.formulare[z.formular] as { spalten: Array<{ label: string }> }).spalten;
          return [z.formular, datumDe(z.zeile.datum), z.zeile.von, z.zeile.bis, `${spalten[z.zeile.spalte]!.label}: ${z.zeile.eintrag}`, z.zeile.material.map((m) => spalten[m]!.label).join(", ") || "–", z.zeile.vermerk ? "X" : ""];
        }),
        [45, 55, 38, 38, 140, 145, 50.28],
        { groesse: 8 },
      );
    }

    // Selbst gedruckte Formulare mit Tablet-Unterschriften
    const tablet = zi.filter((z) => z.zeile.unterschriftPng);
    for (const formular of [...new Set(tablet.map((z) => z.formular))]) {
      const zs = tablet.filter((z) => z.formular === formular);
      const quelle = layoutFuer(zs[0]!.besuch.datum);
      if (!quelle || !quelle.layout.unterstuetzt.includes(formular)) {
        w.text(`Formular ${formular}: Für dieses Datum liegt keine Druckvorlage vor; bitte Formular von Hand ausfüllen.`, { groesse: 8.5, farbe: [0.7, 0.3, 0.25] });
        continue;
      }
      const kopf = {
        krankenkasse: f.klientin.krankenkasse ?? "",
        name: versichertenName(f.klientin),
        anschrift: anschrift(f.klientin),
        geburtsdatum: f.klientin.geburtsdatum,
        kassenIk: f.klientin.kassenIk ?? "",
        versichertennummer: f.klientin.versichertennummer ?? "",
        et: f.et,
        geburtsdatumKind: f.kinder[0]?.geburtsdatum ?? null,
        anzahlKinder: f.kinder.length,
      };
      const vermerke = zs.filter((z) => z.zeile.vermerk).flatMap((z) => (z.besuch.hinweise as Array<{ stufe: string; text: string }>).filter((h) => h.stufe === "warnung").map((h) => `${datumDe(z.besuch.datum)}: ${h.text}`));
      formularBlaetter += await formularSeiten(doc, s, quelle, formular, kopf, [{ name: hb!.name, nr: 1, ik: hb!.ik ?? "" }], zs.map((z) => z.zeile), vermerke);
    }
  }
  return { pdf: await doc.save(), formularBlaetter };
}

/** Leeres Formular mit vorausgefülltem Kopf für die Mappe der Familie (Unterschrift auf Papier). */
export async function kopfFormularErzeugen(db: Datenbank, betreuungId: string, formular: string, hebammeId: string): Promise<Uint8Array | null> {
  const quelle = layoutFuer(new Date().toISOString().slice(0, 10));
  if (!quelle || !quelle.layout.unterstuetzt.includes(formular)) return null;
  const [bt] = await db.select().from(betreuung).where(eq(betreuung.id, betreuungId));
  if (!bt) return null;
  const [k] = await db.select().from(klientin).where(eq(klientin.id, bt.klientinId));
  const kinder = await db.select().from(kind).where(eq(kind.betreuungId, bt.id)).orderBy(asc(kind.geburtsdatum));
  // Hebammentabelle: zuständige Hebamme, ggf. die druckende Hebamme (Vertretung)
  const ids = [...new Set([bt.zustaendigeHebammeId ?? k!.zustaendigeHebammeId, hebammeId])];
  const hebammen = await db.select({ id: benutzer.id, name: benutzer.name, ik: benutzer.ik }).from(benutzer).where(inArray(benutzer.id, ids));
  const doc = await PDFDocument.create();
  doc.setTitle(`Formular ${formular} ${k!.nachname}`);
  const s = await schriftenLaden(doc);
  await formularSeiten(
    doc,
    s,
    quelle,
    formular,
    {
      krankenkasse: k!.krankenkasse ?? "",
      name: versichertenName(k!),
      anschrift: anschrift(k!),
      geburtsdatum: k!.geburtsdatum,
      kassenIk: k!.kassenIk ?? "",
      versichertennummer: k!.versichertennummer ?? "",
      et: bt.et,
      geburtsdatumKind: kinder[0]?.geburtsdatum ?? null,
      anzahlKinder: kinder.length,
    },
    ids.map((id, i) => ({ name: hebammen.find((h) => h.id === id)?.name ?? "", nr: i + 1, ik: hebammen.find((h) => h.id === id)?.ik ?? "" })),
    [],
    [],
  );
  return doc.save();
}

export async function einstellungLaden(db: Datenbank, hebammeId: string) {
  const [e] = await db.select().from(abrechnungseinstellung).where(eq(abrechnungseinstellung.benutzerId, hebammeId));
  return e;
}
