import {
  ABRECHNUNGSWEG_LABEL,
  BELEGART_LABEL,
  UNTERSCHRIFT_LABEL,
  VERSANDRHYTHMUS_LABEL,
  isoDatum,
  naechsterVersandtermin,
  type Abrechnungsweg,
  type Belegart,
  type Unterschriftsverfahren,
  type Versandrhythmus,
} from "@kindkesmoeoen/shared";
import { useState } from "react";
import { Link } from "react-router";
import { Feld, Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { ApiFehler, api } from "../lib/api";
import { datum, euro } from "../lib/format";
import { useDaten } from "../lib/useDaten";

type Pruefung = { stufe: "fehler" | "warnung"; text: string };
type FallKurz = {
  betreuungId: string;
  klientinId: string;
  name: string;
  krankenkasse: string | null;
  zeitraum: [string, string];
  anzahlBesuche: number;
  anzahlLeistungen: number;
  summe: number;
  belege: { tablet: number; papier: number };
  pruefung: Pruefung[];
};
type Offen = {
  bis: string;
  einstellung: { weg: Abrechnungsweg; belegart: Belegart; unterschrift: Unterschriftsverfahren; versandRhythmus: Versandrhythmus; versandTag: number; abrechnungsstelleName: string | null } | null;
  faelle: FallKurz[];
  hinweise: Array<{ stufe: "fehler" | "warnung" | "info"; text: string }>;
  summe: number;
};
type Versand = {
  id: string;
  nummer: string;
  status: "vorbereitet" | "versendet" | "bezahlt";
  bis: string;
  empfaengerName: string | null;
  anzahlFaelle: number;
  anzahlLeistungen: number;
  summe: string;
  versendetAm: string | null;
  einschreibenNr: string | null;
  bezahltAm: string | null;
  ausgezahlt: string | null;
  erstelltAm: string;
  offenSeitTagen: number | null;
};
type VersandDetail = Versand & {
  faelle: Array<FallKurz & { leistungen: Array<{ id: string; datum: string; gpos: string; bezeichnung: string; menge: number; betrag: string; status: string; kuerzungBetrag: string | null; kuerzungGrund: string | null }> }>;
};

const heute = () => isoDatum(new Date());
const STATUS: Record<Versand["status"], { text: string; stil: string }> = {
  vorbereitet: { text: "Vorbereitet", stil: "bg-amber-100 text-amber-800" },
  versendet: { text: "Versendet", stil: "bg-salbei-100 text-salbei-700" },
  bezahlt: { text: "Bezahlt", stil: "bg-salbei-600 text-white" },
};

export function AbrechnungSeite() {
  const [bis, setBis] = useState(heute());
  const offen = useDaten<Offen>(`/api/abrechnung/offen?bis=${bis}`);
  const versaende = useDaten<Versand[]>("/api/abrechnung/versaende");
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler" | "hinweis"; text: string }>();
  const [laeuft, setLaeuft] = useState(false);

  const neuLaden = async () => {
    await Promise.all([offen.laden(), versaende.laden()]);
  };

  async function vorbereiten() {
    setLaeuft(true);
    setMeldung(undefined);
    try {
      const r = await api<{ versand: Versand; ausgelassen: FallKurz[] }>("/api/abrechnung/versaende", { method: "POST", body: { bis } });
      setMeldung({
        art: r.ausgelassen.length ? "hinweis" : "ok",
        text: `Versand ${r.versand.nummer} vorbereitet (${r.versand.anzahlFaelle} Fälle, ${euro(r.versand.summe)}).${r.ausgelassen.length ? ` Nicht enthalten wegen fehlender Angaben: ${r.ausgelassen.map((f) => f.name).join(", ")}.` : ""} Jetzt die Versandmappe drucken.`,
      });
      await neuLaden();
    } catch (e) {
      setMeldung({ art: "fehler", text: (e as Error).message });
    } finally {
      setLaeuft(false);
    }
  }

  const e = offen.daten?.einstellung;
  const bereit = offen.daten?.faelle.filter((f) => !f.pruefung.some((p) => p.stufe === "fehler")) ?? [];

  return (
    <>
      <Seitenkopf titel="Abrechnung" untertitel="Belege erzeugen, Versandmappe drucken und Zahlungen nachhalten." />

      {e && (
        <div className="karte mb-6 flex flex-wrap items-center justify-between gap-4">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <div><dt className="inline text-slate-500">Abrechnung: </dt><dd className="inline">{e.weg === "andere_abrechnungsstelle" ? e.abrechnungsstelleName : ABRECHNUNGSWEG_LABEL[e.weg]}</dd></div>
            <div><dt className="inline text-slate-500">Belege: </dt><dd className="inline">{BELEGART_LABEL[e.belegart]}</dd></div>
            <div><dt className="inline text-slate-500">Unterschrift: </dt><dd className="inline">{UNTERSCHRIFT_LABEL[e.unterschrift]}</dd></div>
            <div><dt className="inline text-slate-500">Versand: </dt><dd className="inline">{VERSANDRHYTHMUS_LABEL[e.versandRhythmus].replace(/ \(.*\)/, "")}, nächster am {datum(isoDatum(naechsterVersandtermin(new Date(), e.versandRhythmus, e.versandTag)))}</dd></div>
          </dl>
          <Link to="/einstellungen/abrechnung" className="knopf-sekundaer">Einstellungen</Link>
        </div>
      )}

      {meldung && <div className="mb-4"><Meldung art={meldung.art}>{meldung.text}</Meldung></div>}

      {/* ---------------------------------------------------- offene Leistungen */}
      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Noch nicht abgerechnet</h2>
          <label className="flex items-center gap-2 text-sm">
            Leistungen bis
            <input type="date" className="feld w-auto" value={bis} max={heute()} onChange={(ev) => setBis(ev.target.value)} />
          </label>
        </div>
        {!offen.daten ? (
          <Laden />
        ) : (
          <>
            {offen.daten.hinweise.map((h) => (
              <div key={h.text} className="mb-3"><Meldung art={h.stufe === "fehler" ? "fehler" : h.stufe === "warnung" ? "hinweis" : "ok"}>{h.text}</Meldung></div>
            ))}
            {offen.daten.faelle.length === 0 ? (
              <p className="text-slate-500">Keine offenen Leistungen bis {datum(bis)}.</p>
            ) : (
              <div className="karte divide-y divide-sand-200 p-0 dark:divide-salbei-700">
                {offen.daten.faelle.map((f) => (
                  <div key={f.betreuungId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <Link to={`/klientinnen/${f.klientinId}`} className="font-semibold text-salbei-700 hover:underline dark:text-salbei-100">{f.name}</Link>
                      <div className="text-sm text-slate-500">
                        {f.krankenkasse ?? "Kasse fehlt"} · {datum(f.zeitraum[0])}–{datum(f.zeitraum[1])} · {f.anzahlBesuche} Besuch(e)
                        {f.belege.tablet ? ` · ${f.belege.tablet}× Tablet` : ""}
                        {f.belege.papier ? ` · ${f.belege.papier}× Papier` : ""}
                      </div>
                      {f.pruefung.map((p) => (
                        <div key={p.text} className={`mt-1 text-sm ${p.stufe === "fehler" ? "text-tulpe-500" : "text-amber-700"}`}>{p.stufe === "fehler" ? "✗" : "!"} {p.text}</div>
                      ))}
                    </div>
                    <div className="text-right font-semibold">{euro(f.summe)}</div>
                  </div>
                ))}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <div className="font-semibold">Summe {euro(offen.daten.summe)}</div>
                    <div className="text-sm text-slate-500">{bereit.length} von {offen.daten.faelle.length} Fällen abrechnungsbereit</div>
                  </div>
                  <button type="button" className="knopf-primaer" disabled={laeuft || bereit.length === 0} onClick={vorbereiten}>
                    Versand vorbereiten
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ---------------------------------------------------- Versände */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Versände</h2>
        {!versaende.daten ? (
          <Laden />
        ) : versaende.daten.length === 0 ? (
          <p className="text-slate-500">Noch keine Versände.</p>
        ) : (
          <div className="space-y-3">
            {versaende.daten.map((v) => (
              <VersandKarte key={v.id} versand={v} geaendert={neuLaden} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function VersandKarte({ versand: v, geaendert }: { versand: Versand; geaendert: () => Promise<void> }) {
  const [modus, setModus] = useState<"versendet" | "bezahlt" | null>(null);
  const [fehler, setFehler] = useState<string>();
  const aktion = async (pfad: string, body?: unknown) => {
    setFehler(undefined);
    try {
      await api(`/api/abrechnung/versaende/${v.id}/${pfad}`, { method: "POST", body });
      setModus(null);
      await geaendert();
    } catch (e) {
      setFehler(e instanceof ApiFehler ? e.message : String(e));
    }
  };
  return (
    <div className="karte">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{v.nummer}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[v.status].stil}`}>{STATUS[v.status].text}</span>
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {v.anzahlFaelle} Fälle · {v.anzahlLeistungen} Leistungen · bis {datum(v.bis)} · an {v.empfaengerName ?? "Selbstabrechnung"}
          </div>
          <div className="text-sm text-slate-500">
            {v.versendetAm ? `versendet ${datum(v.versendetAm)}${v.einschreibenNr ? ` (Einschreiben ${v.einschreibenNr})` : ""}` : `erstellt ${datum(v.erstelltAm)}`}
            {v.bezahltAm ? ` · bezahlt ${datum(v.bezahltAm)}` : ""}
            {v.offenSeitTagen !== null && v.status === "versendet" ? (v.offenSeitTagen === 0 ? " · heute versendet" : ` · seit ${v.offenSeitTagen} Tagen ohne Zahlung`) : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">{euro(v.summe)}</div>
          {v.ausgezahlt && Number(v.ausgezahlt) !== Number(v.summe) && <div className="text-sm text-tulpe-500">ausgezahlt {euro(v.ausgezahlt)}</div>}
        </div>
      </div>
      {fehler && <div className="mt-3"><Meldung art="fehler">{fehler}</Meldung></div>}
      <div className="mt-4 flex flex-wrap gap-2">
        <a className="knopf-primaer" href={`/api/abrechnung/versaende/${v.id}/mappe.pdf`} target="_blank" rel="noreferrer">Versandmappe (PDF)</a>
        {v.status === "vorbereitet" && (
          <>
            <button type="button" className="knopf-sekundaer" onClick={() => setModus(modus === "versendet" ? null : "versendet")}>Als versendet markieren</button>
            <button type="button" className="knopf-gefahr" onClick={() => confirm("Versand auflösen? Die Leistungen werden wieder freigegeben.") && aktion("aufloesen")}>Auflösen</button>
          </>
        )}
        {v.status === "versendet" && (
          <button type="button" className="knopf-sekundaer" onClick={() => setModus(modus === "bezahlt" ? null : "bezahlt")}>Zahlung erfassen</button>
        )}
      </div>
      {modus === "versendet" && <VersendetFormular abschicken={(daten) => aktion("versendet", daten)} />}
      {modus === "bezahlt" && <ZahlungFormular versandId={v.id} abschicken={(daten) => aktion("bezahlt", daten)} />}
    </div>
  );
}

function VersendetFormular({ abschicken }: { abschicken: (d: { versendetAm: string; einschreibenNr: string }) => void }) {
  const [versendetAm, setDatum] = useState(heute());
  const [einschreibenNr, setNr] = useState("");
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-sand-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end dark:bg-salbei-900/40">
      <Feld label="Versendet am"><input className="feld" type="date" value={versendetAm} onChange={(e) => setDatum(e.target.value)} /></Feld>
      <Feld label="Einschreiben-Nr. (optional)"><input className="feld" value={einschreibenNr} onChange={(e) => setNr(e.target.value)} /></Feld>
      <button type="button" className="knopf-primaer" onClick={() => abschicken({ versendetAm, einschreibenNr })}>Speichern</button>
    </div>
  );
}

function ZahlungFormular({ versandId, abschicken }: { versandId: string; abschicken: (d: { bezahltAm: string; kuerzungen: Array<{ leistungId: string; betrag: number; grund: string }> }) => void }) {
  const detail = useDaten<VersandDetail>(`/api/abrechnung/versaende/${versandId}`);
  const [bezahltAm, setDatum] = useState(heute());
  const [kuerzungen, setKuerzungen] = useState<Record<string, { betrag: string; grund: string }>>({});
  if (!detail.daten) return <Laden />;
  return (
    <div className="mt-4 space-y-3 rounded-xl bg-sand-50 p-4 dark:bg-salbei-900/40">
      <Feld label="Zahlungseingang am"><input className="feld sm:max-w-xs" type="date" value={bezahltAm} onChange={(e) => setDatum(e.target.value)} /></Feld>
      <p className="text-sm text-slate-500">Nur bei Kürzungen: Betrag und Grund bei der betroffenen Leistung eintragen.</p>
      {detail.daten.faelle.map((f) => (
        <div key={f.betreuungId}>
          <div className="font-medium">{f.name}</div>
          {f.leistungen.map((l) => (
            <div key={l.id} className="mt-2 grid grid-cols-1 items-center gap-2 text-sm sm:grid-cols-[1fr_7rem_1fr]">
              <span>{datum(l.datum)} · {l.gpos} · {euro(l.betrag)}</span>
              <input className="feld" inputMode="decimal" placeholder="Kürzung €" value={kuerzungen[l.id]?.betrag ?? ""} onChange={(e) => setKuerzungen((k) => ({ ...k, [l.id]: { betrag: e.target.value, grund: k[l.id]?.grund ?? "" } }))} />
              <input className="feld" placeholder="Grund" value={kuerzungen[l.id]?.grund ?? ""} onChange={(e) => setKuerzungen((k) => ({ ...k, [l.id]: { betrag: k[l.id]?.betrag ?? "", grund: e.target.value } }))} />
            </div>
          ))}
        </div>
      ))}
      <button
        type="button"
        className="knopf-primaer"
        onClick={() =>
          abschicken({
            bezahltAm,
            kuerzungen: Object.entries(kuerzungen)
              .filter(([, k]) => k.betrag.trim())
              .map(([leistungId, k]) => ({ leistungId, betrag: Number(k.betrag.replace(",", ".")), grund: k.grund })),
          })
        }
      >
        Zahlung speichern
      </button>
    </div>
  );
}
