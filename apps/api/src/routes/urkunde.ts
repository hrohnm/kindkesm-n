import { URKUNDE_TEXTE, urkundeSchema, urkundeText, urkundeZeilenVorschlag, type MessungTag, type Urkunde } from "@kindkesmoeoen/shared";
import { and, asc, eq, ne } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { Datenbank } from "../db/client";
import { benutzer, besuch, betreuung, kind, klientin, praxis, urkunde } from "../db/schema";
import { pruefen } from "../fehler";
import { urkundePdf } from "../pdf/urkunde";
import { protokollieren } from "../protokoll";

const zahlOderNull = (v: unknown) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return v != null && v !== "" && Number.isFinite(n) && n > 0 ? n : undefined;
};
const vorname = (name: string) => name.split(/\s+/)[0] ?? name;
const dateiname = (t: string) =>
  t
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ß/g, "ss")
    .replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

/** Kinderurkunde (M10): Vorschlag, Speichern, PDF. */
export async function urkundeRouten(app: FastifyInstance, db: Datenbank) {
  /** Alles, was die Urkunde eines Kindes braucht. */
  async function laden(kindId: string) {
    const [k] = await db.select().from(kind).where(eq(kind.id, kindId));
    if (!k) return undefined;
    const [b] = await db.select().from(betreuung).where(eq(betreuung.id, k.betreuungId));
    const [kl] = await db.select({ id: klientin.id, vorname: klientin.vorname, nachname: klientin.nachname, zustaendig: klientin.zustaendigeHebammeId }).from(klientin).where(eq(klientin.id, b!.klientinId));
    const geschwister = await db.select({ vorname: kind.vorname, geburtsdatum: kind.geburtsdatum }).from(kind).where(and(eq(kind.betreuungId, k.betreuungId), ne(kind.id, k.id)));
    const besuche = await db.select({ datum: besuch.datum, dokumentation: besuch.dokumentation }).from(besuch).where(eq(besuch.betreuungId, k.betreuungId)).orderBy(asc(besuch.datum), asc(besuch.von));
    const messungen: MessungTag[] = besuche.map((x) => {
      const d = (x.dokumentation as { kinder?: Record<string, Record<string, unknown>> }).kinder?.[k.id] ?? {};
      return { datum: x.datum, gewicht: zahlOderNull(d.gewicht), laenge: zahlOderNull(d.laenge), kopfumfang: zahlOderNull(d.kopfumfang) };
    });
    const [gespeichert] = await db.select().from(urkunde).where(eq(urkunde.kindId, k.id));
    const [p] = await db.select().from(praxis).where(eq(praxis.id, 1));
    return { k, b: b!, kl: kl!, geschwister, messungen, letzterBesuch: besuche.at(-1)?.datum ?? null, gespeichert, praxis: p };
  }
  type Geladen = NonNullable<Awaited<ReturnType<typeof laden>>>;

  const geburt = (x: Geladen) => ({ datum: x.k.geburtsdatum, gewicht: x.k.geburtsgewicht, laenge: x.k.laenge ? Number(x.k.laenge) : null, kopfumfang: x.k.kopfumfang ? Number(x.k.kopfumfang) : null });

  async function hebammeName(x: Geladen, ichId: string) {
    const [h] = await db.select({ name: benutzer.name }).from(benutzer).where(eq(benutzer.id, x.b.zustaendigeHebammeId ?? x.kl.zustaendig ?? ichId));
    return h?.name ?? "";
  }

  function vorschlag(x: Geladen, hebamme: string): Urkunde {
    const textVorlage = x.geschwister.some((s) => s.geburtsdatum === x.k.geburtsdatum) ? "mehrlinge" : "warm";
    return {
      design: "ostsee",
      textVorlage,
      titel: `Urkunde für ${x.k.vorname}`,
      text: urkundeText(URKUNDE_TEXTE.find((t) => t.id === textVorlage)!.text, {
        vorname: x.k.vorname,
        geburtsdatum: x.k.geburtsdatum,
        geburtszeit: x.k.geburtszeit,
        ort: x.b.geburtsort,
        geburtsgewicht: x.k.geburtsgewicht,
        hebamme: vorname(hebamme),
        geschwister: x.geschwister.filter((s) => s.geburtsdatum === x.k.geburtsdatum).map((s) => s.vorname),
        geschlecht: x.k.geschlecht,
      }),
      zeilen: urkundeZeilenVorschlag(geburt(x), x.messungen, x.letzterBesuch),
      meilensteine: [],
      optionen: { kurve: true, perzentilen: false, sternzeichen: true, unterschrift: true, kursHinweis: true },
      status: "entwurf",
    };
  }

  async function pdfSenden(x: Geladen, u: Urkunde, ichId: string, reply: FastifyReply) {
    const g = geburt(x);
    const gewichte = [
      ...(g.gewicht ? [{ lebenstag: 1, gramm: g.gewicht }] : []),
      ...x.messungen.filter((m) => m.gewicht && m.datum >= g.datum).map((m) => ({ lebenstag: Math.round((Date.parse(m.datum) - Date.parse(g.datum)) / 86_400_000) + 1, gramm: m.gewicht! })),
    ];
    const pdf = await urkundePdf({
      urkunde: u,
      kind: { ...x.k, laenge: g.laenge, kopfumfang: g.kopfumfang },
      geburtsort: x.b.geburtsort,
      hebamme: await hebammeName(x, ichId),
      praxis: { name: x.praxis?.name ?? "Hebammenpraxis", anschrift: x.praxis?.anschrift ?? "", telefon: x.praxis?.telefon ?? null, email: x.praxis?.email ?? null },
      gewichte,
    });
    return reply.header("Content-Type", "application/pdf").header("Content-Disposition", `inline; filename="${dateiname(u.titel) || "Urkunde"}.pdf"`).send(Buffer.from(pdf));
  }

  app.get<{ Params: { id: string } }>("/api/kinder/:id/urkunde", async (request, reply) => {
    const x = await laden(request.params.id);
    if (!x) return reply.code(404).send({ fehler: "Kind nicht gefunden" });
    const hebamme = await hebammeName(x, request.benutzer!.id);
    const werte = {
      vorname: x.k.vorname,
      geburtsdatum: x.k.geburtsdatum,
      geburtszeit: x.k.geburtszeit,
      ort: x.b.geburtsort,
      geburtsgewicht: x.k.geburtsgewicht,
      hebamme: vorname(hebamme),
      geschwister: x.geschwister.filter((s) => s.geburtsdatum === x.k.geburtsdatum).map((s) => s.vorname),
      geschlecht: x.k.geschlecht,
    };
    return {
      kind: { id: x.k.id, vorname: x.k.vorname, nachname: x.k.nachname, geburtsdatum: x.k.geburtsdatum },
      klientin: { id: x.kl.id, vorname: x.kl.vorname, nachname: x.kl.nachname },
      urkunde: x.gespeichert ? { ...(x.gespeichert.daten as Urkunde), status: x.gespeichert.status, geaendertAm: x.gespeichert.geaendertAm } : null,
      vorschlag: vorschlag(x, hebamme),
      /** Alle Zeilen (zum Auswählen) und die Texte der Vorlagen mit eingesetzten Angaben */
      alleZeilen: urkundeZeilenVorschlag(geburt(x), x.messungen, x.letzterBesuch),
      texte: URKUNDE_TEXTE.map((t) => ({ id: t.id, name: t.name, text: urkundeText(t.text, werte) })),
    };
  });

  app.put<{ Params: { id: string } }>("/api/kinder/:id/urkunde", async (request, reply) => {
    const daten = pruefen(urkundeSchema, request.body, reply);
    if (!daten) return;
    const x = await laden(request.params.id);
    if (!x) return reply.code(404).send({ fehler: "Kind nicht gefunden" });
    const { status, ...inhalt } = daten;
    const [u] = await db
      .insert(urkunde)
      .values({ kindId: x.k.id, hebammeId: request.benutzer!.id, daten: inhalt, status })
      .onConflictDoUpdate({ target: urkunde.kindId, set: { daten: inhalt, status, hebammeId: request.benutzer!.id, geaendertAm: new Date() } })
      .returning();
    await protokollieren(db, request.benutzer!.id, x.gespeichert ? "geaendert" : "angelegt", "urkunde", u!.id, { status });
    return { ...(u!.daten as Urkunde), status: u!.status, geaendertAm: u!.geaendertAm };
  });

  app.delete<{ Params: { id: string } }>("/api/kinder/:id/urkunde", async (request) => {
    await db.delete(urkunde).where(eq(urkunde.kindId, request.params.id));
    return { ok: true };
  });

  /** Vorschau des PDFs aus den aktuellen Eingaben (ohne zu speichern). */
  app.post<{ Params: { id: string } }>("/api/kinder/:id/urkunde/vorschau.pdf", async (request, reply) => {
    const daten = pruefen(urkundeSchema, request.body, reply);
    if (!daten) return;
    const x = await laden(request.params.id);
    if (!x) return reply.code(404).send({ fehler: "Kind nicht gefunden" });
    return pdfSenden(x, daten, request.benutzer!.id, reply);
  });

  app.get<{ Params: { id: string } }>("/api/kinder/:id/urkunde.pdf", async (request, reply) => {
    const x = await laden(request.params.id);
    if (!x) return reply.code(404).send({ fehler: "Kind nicht gefunden" });
    if (!x.gespeichert) return reply.code(404).send({ fehler: "Noch keine Urkunde gespeichert" });
    await protokollieren(db, request.benutzer!.id, "angesehen", "urkunde", x.gespeichert.id);
    return pdfSenden(x, { ...(x.gespeichert.daten as Omit<Urkunde, "status">), status: x.gespeichert.status }, request.benutzer!.id, reply);
  });
}
