import { WHO_MAX_TAG, gewichtsverlauf, messverlauf, perzentileFuerWert, wertFuerPerzentile, type Messgroesse } from "@kindkesmoeoen/shared";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { datum as datumDe } from "../lib/format";
import type { Kind } from "../lib/typen";
import { useDaten } from "../lib/useDaten";

type Messung = { datum: string; von: string; wert: number; besuchId: string; status: string; hebamme: string };
export type WachstumDaten = {
  kind: Kind;
  klientin: { id: string; vorname: string; nachname: string };
  betreuungId: string;
  werte: Array<{ datum: string; von: string; gramm: number; besuchId: string; status: string; hebamme: string }>;
  laenge: Messung[];
  kopfumfang: Messung[];
};
/** Im Besuch eingetragene, noch nicht gespeicherte Werte */
export type AktuelleWerte = { datum: string; gewicht?: number; laenge?: number; kopfumfang?: number } | null;

const PERZENTILEN = [3, 15, 50, 85, 97] as const;
const g = (x: number) => Math.round(x).toLocaleString("de-DE");
const cm = (x: number) => `${x.toLocaleString("de-DE", { maximumFractionDigits: 1 })} cm`;
const vorzeichen = (x: number) => (x > 0 ? "+" : x < 0 ? "−" : "±");

/** Darstellung je Messgröße: Einheit, Achsenbeschriftung und Rasterweite der Kurve. */
const GROESSEN: Record<Messgroesse, { titel: string; text: (v: number) => string; achse: (v: number) => string; runden: number; puffer: number; stufe: (spanne: number) => number }> = {
  gewicht: { titel: "Gewicht", text: (v) => `${g(v)} g`, achse: (v) => `${(v / 1000).toLocaleString("de-DE")} kg`, runden: 250, puffer: 100, stufe: (s) => (s > 3000 ? 1000 : 500) },
  laenge: { titel: "Länge", text: cm, achse: (v) => `${v} cm`, runden: 1, puffer: 1, stufe: (s) => (s > 16 ? 5 : 2) },
  kopfumfang: { titel: "Kopfumfang", text: cm, achse: (v) => `${v} cm`, runden: 1, puffer: 0.5, stufe: (s) => (s > 8 ? 2 : 1) },
};
const REIHENFOLGE: Messgroesse[] = ["gewicht", "laenge", "kopfumfang"];
const istGroesse = (x: string | null): x is Messgroesse => x === "gewicht" || x === "laenge" || x === "kopfumfang";

/** Wachstum eines Kindes (Gewicht, Länge, Kopfumfang) als eigene Seite. */
export function Gewicht() {
  const { id } = useParams();
  const [suche, setSuche] = useSearchParams();
  const groesse = istGroesse(suche.get("ansicht")) ? (suche.get("ansicht") as Messgroesse) : "gewicht";
  const daten = useDaten<WachstumDaten>(`/api/kinder/${id}/gewicht`);
  if (!daten.daten) return daten.fehler ? <Meldung art="fehler">{daten.fehler}</Meldung> : <Laden />;
  const { kind, klientin } = daten.daten;
  return (
    <>
      <Link to={`/klientinnen/${klientin.id}`} className="mb-3 inline-flex min-h-11 items-center text-salbei-600">‹ {klientin.vorname} {klientin.nachname}</Link>
      <Seitenkopf titel={`Wachstum ${kind.vorname}`} untertitel={untertitel(kind)} />
      <Reiter groesse={groesse} setzen={(x) => setSuche(x === "gewicht" ? {} : { ansicht: x }, { replace: true })} />
      <WachstumInhalt daten={daten.daten} groesse={groesse} />
    </>
  );
}

const untertitel = (kind: Kind) =>
  `geboren ${datumDe(kind.geburtsdatum)}${kind.geburtsgewicht ? ` mit ${g(kind.geburtsgewicht)} g` : ""}${kind.laenge ? `, ${cm(Number(kind.laenge))}` : ""} · WHO-Perzentilen ${kind.geschlecht === "maennlich" ? "Jungen" : kind.geschlecht === "weiblich" ? "Mädchen" : "Mädchen (Geschlecht nicht erfasst)"}`;

function Reiter({ groesse, setzen }: { groesse: Messgroesse; setzen: (g: Messgroesse) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2" role="tablist">
      {REIHENFOLGE.map((x) => (
        <button key={x} type="button" role="tab" aria-selected={groesse === x} onClick={() => setzen(x)} className={`min-h-11 rounded-full px-5 font-medium ${groesse === x ? "bg-salbei-600 text-white" : "bg-white text-slate-600 dark:bg-salbei-900/50 dark:text-slate-300"}`}>
          {GROESSEN[x].titel}
        </button>
      ))}
    </div>
  );
}

/**
 * Wachstum als großes Fenster über der Besuchsmaske. Die gerade eingetragenen (noch nicht gespeicherten)
 * Werte erscheinen als „dieser Besuch“.
 */
export function GewichtFenster({ kindId, besuchId, aktuell, schliessen }: { kindId: string; besuchId?: string; aktuell?: AktuelleWerte; schliessen: () => void }) {
  const daten = useDaten<WachstumDaten>(`/api/kinder/${kindId}/gewicht`);
  const [groesse, setGroesse] = useState<Messgroesse>("gewicht");
  useEffect(() => {
    const taste = (e: KeyboardEvent) => e.key === "Escape" && schliessen();
    window.addEventListener("keydown", taste);
    const alt = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", taste);
      document.body.style.overflow = alt;
    };
  }, [schliessen]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="Wachstum" onClick={schliessen}>
      <div className="max-h-full w-full max-w-5xl overflow-y-auto rounded-2xl bg-sand-50 p-4 shadow-xl sm:p-6 dark:bg-salbei-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-salbei-700 sm:text-2xl dark:text-salbei-100">Wachstum {daten.daten?.kind.vorname ?? ""}</h2>
            {daten.daten && <p className="text-sm text-slate-600 dark:text-slate-300">{untertitel(daten.daten.kind)}</p>}
          </div>
          <button type="button" className="knopf-sekundaer shrink-0 px-4" onClick={schliessen} autoFocus>Schließen ✕</button>
        </div>
        <Reiter groesse={groesse} setzen={setGroesse} />
        {!daten.daten ? (
          daten.fehler ? <Meldung art="fehler">{daten.fehler}</Meldung> : <Laden />
        ) : (
          <WachstumInhalt daten={daten.daten} groesse={groesse} besuchId={besuchId} aktuell={aktuell} />
        )}
      </div>
    </div>
  );
}

function WachstumInhalt({ daten, groesse, besuchId, aktuell }: { daten: WachstumDaten; groesse: Messgroesse; besuchId?: string; aktuell?: AktuelleWerte }) {
  return groesse === "gewicht" ? <GewichtInhalt daten={daten} besuchId={besuchId} aktuell={aktuell} /> : <MessInhalt daten={daten} groesse={groesse} besuchId={besuchId} aktuell={aktuell} />;
}

function GewichtInhalt({ daten, besuchId, aktuell }: { daten: WachstumDaten; besuchId?: string; aktuell?: AktuelleWerte }) {
  const { kind } = daten;
  const neu = aktuell?.gewicht ? { datum: aktuell.datum, gramm: aktuell.gewicht } : null;
  // Gespeicherten Wert dieses Besuchs durch den aktuell eingetragenen ersetzen
  const werte = neu ? daten.werte.filter((w) => w.besuchId !== besuchId) : daten.werte;
  const verlauf = gewichtsverlauf(kind.geburtsdatum, [
    ...(kind.geburtsgewicht ? [{ datum: kind.geburtsdatum, gramm: kind.geburtsgewicht, quelle: "geburt" as const }] : []),
    ...werte.map((w) => ({ datum: w.datum, gramm: w.gramm, quelle: "besuch" as const, besuchId: w.besuchId })),
    ...(neu ? [{ datum: neu.datum, gramm: neu.gramm, quelle: "besuch" as const, besuchId: "aktuell" }] : []),
  ]).map((v) => ({ ...v, wert: v.gramm, info: werte.find((w) => w.besuchId === v.besuchId), perzentile: v.alterTage <= WHO_MAX_TAG ? perzentileFuerWert("gewicht", v.alterTage, v.gramm, kind.geschlecht) : null }));

  // Tiefster Punkt und Wiedererreichen des Geburtsgewichts
  const tiefst = verlauf.length > 1 ? verlauf.reduce((a, b) => (b.gramm < a.gramm ? b : a)) : null;
  const wieder = kind.geburtsgewicht ? verlauf.find((v) => v.quelle === "besuch" && v.lebenstag > 1 && v.gramm >= kind.geburtsgewicht!) : null;

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kennzahl titel="Aktuell" wert={verlauf.length ? `${g(verlauf.at(-1)!.gramm)} g` : "–"} unten={verlauf.length ? `${verlauf.at(-1)!.lebenstag}. Lebenstag` : ""} />
        <Kennzahl titel="Tiefster Wert" wert={tiefst ? `${g(tiefst.gramm)} g` : "–"} unten={tiefst?.prozentGeburt != null ? `${vorzeichen(tiefst.prozentGeburt)}${Math.abs(tiefst.prozentGeburt).toLocaleString("de-DE", { maximumFractionDigits: 1 })} % am ${tiefst.lebenstag}. LT` : ""} warn={tiefst?.prozentGeburt != null && tiefst.prozentGeburt <= -10} />
        <Kennzahl titel="Geburtsgewicht erreicht" wert={wieder ? `${wieder.lebenstag}. LT` : "noch nicht"} unten={wieder ? datumDe(wieder.datum) : kind.geburtsgewicht ? "" : "Geburtsgewicht fehlt"} />
        <Kennzahl titel="Perzentile aktuell" wert={verlauf.at(-1)?.perzentile != null ? `P${Math.round(verlauf.at(-1)!.perzentile!)}` : "–"} unten="WHO" />
      </div>

      {verlauf.length === 0 ? (
        <div className="karte text-slate-500">Noch keine Gewichtswerte. Das Gewicht wird beim Besuch in der Kachel des Kindes eingetragen.</div>
      ) : (
        <>
          <section className="karte mb-4">
            <h2 className="mb-1 text-lg font-semibold">Perzentilkurve</h2>
            <p className="mb-3 text-sm text-slate-500">Gewicht nach Lebenstag; graue Linien: WHO-Perzentilen P3, P15, P50, P85, P97. Punkte antippen für Details.</p>
            <Kurve punkte={verlauf} groesse="gewicht" geschlecht={kind.geschlecht} />
          </section>

          <section className="karte overflow-x-auto p-0">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="text-left text-slate-500">
                <tr className="border-b border-sand-200 dark:border-salbei-700">
                  <th className="px-4 py-3 font-medium">Datum</th>
                  <th className="px-2 py-3 font-medium">LT</th>
                  <th className="px-2 py-3 text-right font-medium">Gewicht</th>
                  <th className="px-2 py-3 text-right font-medium">zum Vorwert</th>
                  <th className="px-2 py-3 text-right font-medium">g/Tag</th>
                  <th className="px-2 py-3 text-right font-medium">zur Geburt</th>
                  <th className="px-2 py-3 text-right font-medium">Perzentile</th>
                  <th className="px-4 py-3 font-medium">Erfasst</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200 tabular-nums dark:divide-salbei-700">
                {[...verlauf].reverse().map((v) => (
                  <tr key={`${v.datum}-${v.besuchId ?? "geburt"}`}>
                    <td className="px-4 py-2">{datumDe(v.datum)}</td>
                    <td className="px-2 py-2">{v.lebenstag}</td>
                    <td className="px-2 py-2 text-right font-medium">{g(v.gramm)} g</td>
                    <td className="px-2 py-2 text-right">{v.diffVorwert != null ? `${vorzeichen(v.diffVorwert)}${g(Math.abs(v.diffVorwert))} g` : "–"}</td>
                    <td className="px-2 py-2 text-right">{v.grammProTag != null ? `${vorzeichen(v.grammProTag)}${g(Math.abs(v.grammProTag))}` : "–"}</td>
                    <td className={`px-2 py-2 text-right ${v.prozentGeburt != null && v.prozentGeburt <= -10 ? "font-medium text-tulpe-500" : ""}`}>
                      {v.prozentGeburt != null ? `${vorzeichen(v.prozentGeburt)}${Math.abs(v.prozentGeburt).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %` : "–"}
                    </td>
                    <td className="px-2 py-2 text-right">{v.perzentile != null ? `P${Math.round(v.perzentile)}` : "–"}</td>
                    <td className="px-4 py-2"><Herkunft quelle={v.quelle} besuchId={v.besuchId} info={v.info} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <p className="mt-3 text-sm text-slate-500">Physiologisch: Gewichtsabnahme bis etwa 7–10 % in den ersten Tagen, Geburtsgewicht meist bis zum 10.–14. Lebenstag wieder erreicht. Die WHO-Kurven gelten für gestillte, termingeborene Kinder.</p>
        </>
      )}
    </>
  );
}

/** Länge bzw. Kopfumfang: Kurve mit WHO-Perzentilen und Tabelle. */
function MessInhalt({ daten, groesse, besuchId, aktuell }: { daten: WachstumDaten; groesse: "laenge" | "kopfumfang"; besuchId?: string; aktuell?: AktuelleWerte }) {
  const { kind } = daten;
  const k = GROESSEN[groesse];
  const neuWert = aktuell?.[groesse];
  const messungen = neuWert ? daten[groesse].filter((w) => w.besuchId !== besuchId) : daten[groesse];
  const geburt = kind[groesse] ? Number(kind[groesse]) : null;
  const verlauf = messverlauf(kind.geburtsdatum, [
    ...(geburt ? [{ datum: kind.geburtsdatum, wert: geburt, quelle: "geburt" as const }] : []),
    ...messungen.map((w) => ({ datum: w.datum, wert: w.wert, quelle: "besuch" as const, besuchId: w.besuchId })),
    ...(neuWert && aktuell ? [{ datum: aktuell.datum, wert: neuWert, quelle: "besuch" as const, besuchId: "aktuell" }] : []),
  ]).map((v) => ({ ...v, info: messungen.find((w) => w.besuchId === v.besuchId), perzentile: v.alterTage <= WHO_MAX_TAG ? perzentileFuerWert(groesse, v.alterTage, v.wert, kind.geschlecht) : null }));
  const letzter = verlauf.at(-1);

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kennzahl titel="Aktuell" wert={letzter ? k.text(letzter.wert) : "–"} unten={letzter ? `${letzter.lebenstag}. Lebenstag` : ""} />
        <Kennzahl titel="Bei Geburt" wert={geburt ? k.text(geburt) : "–"} unten={geburt ? "" : "nicht erfasst"} />
        <Kennzahl titel="Seit Geburt" wert={letzter?.diffGeburt != null && letzter.quelle !== "geburt" ? `${vorzeichen(letzter.diffGeburt)}${k.text(Math.abs(letzter.diffGeburt))}` : "–"} />
        <Kennzahl titel="Perzentile aktuell" wert={letzter?.perzentile != null ? `P${Math.round(letzter.perzentile)}` : "–"} unten="WHO" />
      </div>
      {verlauf.length === 0 ? (
        <div className="karte text-slate-500">Noch keine Werte. {k.titel} wird beim Besuch in der Kachel des Kindes eingetragen (ggf. über „Weitere Felder“ einblenden).</div>
      ) : (
        <>
          <section className="karte mb-4">
            <h2 className="mb-1 text-lg font-semibold">Perzentilkurve</h2>
            <p className="mb-3 text-sm text-slate-500">{k.titel} nach Lebenstag; graue Linien: WHO-Perzentilen P3, P15, P50, P85, P97.</p>
            <Kurve punkte={verlauf} groesse={groesse} geschlecht={kind.geschlecht} />
          </section>
          <section className="karte overflow-x-auto p-0">
            <table className="w-full min-w-[30rem] text-sm">
              <thead className="text-left text-slate-500">
                <tr className="border-b border-sand-200 dark:border-salbei-700">
                  <th className="px-4 py-3 font-medium">Datum</th>
                  <th className="px-2 py-3 font-medium">LT</th>
                  <th className="px-2 py-3 text-right font-medium">{k.titel}</th>
                  <th className="px-2 py-3 text-right font-medium">zum Vorwert</th>
                  <th className="px-2 py-3 text-right font-medium">seit Geburt</th>
                  <th className="px-2 py-3 text-right font-medium">Perzentile</th>
                  <th className="px-4 py-3 font-medium">Erfasst</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200 tabular-nums dark:divide-salbei-700">
                {[...verlauf].reverse().map((v) => (
                  <tr key={`${v.datum}-${v.besuchId ?? "geburt"}`}>
                    <td className="px-4 py-2">{datumDe(v.datum)}</td>
                    <td className="px-2 py-2">{v.lebenstag}</td>
                    <td className="px-2 py-2 text-right font-medium">{k.text(v.wert)}</td>
                    <td className="px-2 py-2 text-right">{v.diffVorwert != null ? `${vorzeichen(v.diffVorwert)}${k.text(Math.abs(v.diffVorwert))}` : "–"}</td>
                    <td className="px-2 py-2 text-right">{v.diffGeburt != null && v.quelle !== "geburt" ? `${vorzeichen(v.diffGeburt)}${k.text(Math.abs(v.diffGeburt))}` : "–"}</td>
                    <td className="px-2 py-2 text-right">{v.perzentile != null ? `P${Math.round(v.perzentile)}` : "–"}</td>
                    <td className="px-4 py-2"><Herkunft quelle={v.quelle} besuchId={v.besuchId} info={v.info} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <p className="mt-3 text-sm text-slate-500">Nur Anzeige, keine Diagnose. Länge und Kopfumfang schwanken je nach Messung um einige Millimeter.</p>
        </>
      )}
    </>
  );
}

function Herkunft({ quelle, besuchId, info }: { quelle: string; besuchId?: string; info?: { hebamme: string; status: string } }) {
  if (quelle === "geburt") return <>Geburt</>;
  if (besuchId === "aktuell") return <span className="font-medium text-orange-700">dieser Besuch (noch nicht gespeichert)</span>;
  return (
    <Link className="text-salbei-600 underline" to={`/besuche/${besuchId}`}>
      Besuch {info?.hebamme}{info?.status === "entwurf" ? " (Entwurf)" : ""}
    </Link>
  );
}

function Kennzahl({ titel, wert, unten, warn }: { titel: string; wert: string; unten?: string; warn?: boolean }) {
  return (
    <div className="karte p-3 sm:p-4">
      <div className="text-xs text-slate-500 sm:text-sm">{titel}</div>
      <div className={`mt-0.5 text-lg font-semibold sm:text-2xl ${warn ? "text-tulpe-500" : "text-salbei-700 dark:text-salbei-100"}`}>{wert}</div>
      {unten && <div className="text-xs text-slate-500 sm:text-sm">{unten}</div>}
    </div>
  );
}

export type KurvenPunkt = { lebenstag: number; wert: number; datum: string; perzentile: number | null; quelle: string };

/** SVG-Kurve: WHO-Perzentilen als Referenz, Messwerte des Kindes als Linie mit Punkten. */
export function Kurve({ punkte, groesse, geschlecht, ohneDetails }: { punkte: KurvenPunkt[]; groesse: Messgroesse; geschlecht: string | null; ohneDetails?: boolean }) {
  const [aktiv, setAktiv] = useState<number | null>(null);
  const k = GROESSEN[groesse];
  const B = 720, H = 360, L = 56, R = 44, O = 16, U = 40;
  // x-Achse in Lebenstagen (Geburtstag = 1); die WHO-Werte gelten für das Alter in Tagen (= Lebenstag − 1)
  const maxTag = Math.min(WHO_MAX_TAG + 1, Math.max(28, Math.ceil((Math.max(...punkte.map((p) => p.lebenstag)) + 7) / 7) * 7));
  const kurven = useMemo(
    () => PERZENTILEN.map((p) => ({ p, werte: Array.from({ length: maxTag + 1 }, (_, t) => (t === 0 ? Number.NaN : wertFuerPerzentile(groesse, t - 1, p, geschlecht))) })),
    [maxTag, geschlecht, groesse],
  );
  const alle = [...kurven.flatMap((x) => x.werte.slice(1)), ...punkte.map((p) => p.wert)];
  const yMin = Math.floor((Math.min(...alle) - k.puffer) / k.runden) * k.runden;
  const yMax = Math.ceil((Math.max(...alle) + k.puffer) / k.runden) * k.runden;
  const x = (t: number) => L + ((t - 1) / (maxTag - 1)) * (B - L - R);
  const y = (v: number) => O + (1 - (v - yMin) / (yMax - yMin)) * (H - O - U);
  const yStufe = k.stufe(yMax - yMin);
  const xStufe = maxTag <= 42 ? 7 : maxTag <= 120 ? 14 : 28;
  const pfad = (werte: Array<[number, number]>) => werte.map(([t, v], i) => `${i ? "L" : "M"}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const a = aktiv != null ? punkte[aktiv] : null;
  const ersteLinie = Math.ceil(yMin / yStufe) * yStufe;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${B} ${H}`} className="h-auto w-full" role="img" aria-label={`${{ gewicht: "Gewichtskurve", laenge: "Längenkurve", kopfumfang: "Kopfumfangskurve" }[groesse]} mit WHO-Perzentilen`} onPointerLeave={() => setAktiv(null)}>
        {/* Raster und Achsen (zurückhaltend) */}
        {Array.from({ length: Math.floor((yMax - ersteLinie) / yStufe) + 1 }, (_, i) => ersteLinie + i * yStufe).map((v) => (
          <g key={v}>
            <line x1={L} x2={B - R} y1={y(v)} y2={y(v)} className="stroke-sand-200 dark:stroke-salbei-700" strokeWidth={1} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" className="fill-slate-500 text-[12px]">{k.achse(v)}</text>
          </g>
        ))}
        {[1, ...Array.from({ length: Math.floor(maxTag / xStufe) }, (_, i) => (i + 1) * xStufe)].map((t) => (
          <text key={t} x={x(t)} y={H - U + 18} textAnchor="middle" className="fill-slate-500 text-[12px]">{t}</text>
        ))}
        <text x={(L + B - R) / 2} y={H - 6} textAnchor="middle" className="fill-slate-500 text-[12px]">Lebenstag</text>

        {/* WHO-Perzentilen */}
        {kurven.map((kv) => (
          <g key={kv.p}>
            <path d={pfad(kv.werte.map((v, t) => [t, v] as [number, number]).slice(1))} fill="none" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth={kv.p === 50 ? 1.5 : 1} strokeDasharray={kv.p === 50 ? undefined : "4 4"} />
            <text x={B - R + 4} y={y(kv.werte[maxTag]!) + 4} className="fill-slate-500 text-[11px]">P{kv.p}</text>
          </g>
        ))}

        {/* Messwerte des Kindes */}
        <path d={pfad(punkte.map((p) => [p.lebenstag, p.wert]))} fill="none" stroke="#c2410c" strokeWidth={2} strokeLinejoin="round" />
        {punkte.map((p, i) => (
          <g key={i} onPointerEnter={() => !ohneDetails && setAktiv(i)} onClick={() => !ohneDetails && setAktiv(i)} className={ohneDetails ? "" : "cursor-pointer"}>
            <circle cx={x(p.lebenstag)} cy={y(p.wert)} r={14} fill="transparent" />
            <circle cx={x(p.lebenstag)} cy={y(p.wert)} r={aktiv === i ? 6 : 4.5} fill="#c2410c" className="stroke-white dark:stroke-salbei-900" strokeWidth={2} />
          </g>
        ))}
      </svg>
      {a && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm shadow-md dark:border-salbei-700 dark:bg-salbei-900"
          style={{ left: `${(x(a.lebenstag) / B) * 100}%`, top: `${(y(a.wert) / H) * 100}%`, transform: `translate(${x(a.lebenstag) > B * 0.7 ? "-105%" : "8%"}, -110%)` }}
        >
          <div className="font-semibold">{k.text(a.wert)}</div>
          <div className="text-slate-500">{datumDe(a.datum)} · {a.lebenstag}. Lebenstag{a.quelle === "geburt" ? " · Geburt" : ""}</div>
          {a.perzentile != null && <div className="text-slate-500">Perzentile P{Math.round(a.perzentile)}</div>}
        </div>
      )}
    </div>
  );
}
