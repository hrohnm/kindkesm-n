import { WHO_MAX_TAG, gewichtFuerPerzentile, gewichtsverlauf, perzentileFuerGewicht } from "@kindkesmoeoen/shared";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { datum as datumDe } from "../lib/format";
import type { Kind } from "../lib/typen";
import { useDaten } from "../lib/useDaten";

type Daten = {
  kind: Kind;
  klientin: { id: string; vorname: string; nachname: string };
  betreuungId: string;
  werte: Array<{ datum: string; von: string; gramm: number; besuchId: string; status: string; hebamme: string }>;
};

const PERZENTILEN = [3, 15, 50, 85, 97] as const;
const g = (x: number) => Math.round(x).toLocaleString("de-DE");
const vorzeichen = (x: number) => (x > 0 ? "+" : x < 0 ? "−" : "±");

/** Gewichtsverlauf eines Kindes: WHO-Perzentilkurve nach Lebenstag und Tabelle aller Werte. */
export function Gewicht() {
  const { id } = useParams();
  const daten = useDaten<Daten>(`/api/kinder/${id}/gewicht`);
  if (!daten.daten) return daten.fehler ? <Meldung art="fehler">{daten.fehler}</Meldung> : <Laden />;
  const { kind, klientin, werte } = daten.daten;

  const verlauf = gewichtsverlauf(kind.geburtsdatum, [
    ...(kind.geburtsgewicht ? [{ datum: kind.geburtsdatum, gramm: kind.geburtsgewicht, quelle: "geburt" as const }] : []),
    ...werte.map((w) => ({ datum: w.datum, gramm: w.gramm, quelle: "besuch" as const, besuchId: w.besuchId })),
  ]).map((v) => ({ ...v, info: werte.find((w) => w.besuchId === v.besuchId), perzentile: v.lebenstag <= WHO_MAX_TAG ? perzentileFuerGewicht(v.lebenstag, v.gramm, kind.geschlecht) : null }));

  // Tiefster Punkt und Wiedererreichen des Geburtsgewichts
  const tiefst = verlauf.length > 1 ? verlauf.reduce((a, b) => (b.gramm < a.gramm ? b : a)) : null;
  const wieder = kind.geburtsgewicht ? verlauf.find((v) => v.quelle === "besuch" && v.lebenstag > 0 && v.gramm >= kind.geburtsgewicht!) : null;

  return (
    <>
      <Link to={`/klientinnen/${klientin.id}`} className="mb-3 inline-flex min-h-11 items-center text-salbei-600">‹ {klientin.vorname} {klientin.nachname}</Link>
      <Seitenkopf
        titel={`Gewicht ${kind.vorname}`}
        untertitel={`geboren ${datumDe(kind.geburtsdatum)}${kind.geburtsgewicht ? ` mit ${g(kind.geburtsgewicht)} g` : ""} · WHO-Perzentilen ${kind.geschlecht === "maennlich" ? "Jungen" : kind.geschlecht === "weiblich" ? "Mädchen" : "Mädchen (Geschlecht nicht erfasst)"}`}
      />

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
            <Kurve punkte={verlauf} geschlecht={kind.geschlecht} />
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
                    <td className="px-4 py-2">
                      {v.quelle === "geburt" ? (
                        "Geburt"
                      ) : (
                        <Link className="text-salbei-600 underline" to={`/besuche/${v.besuchId}`}>
                          Besuch {v.info?.hebamme}{v.info?.status === "entwurf" ? " (Entwurf)" : ""}
                        </Link>
                      )}
                    </td>
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

function Kennzahl({ titel, wert, unten, warn }: { titel: string; wert: string; unten?: string; warn?: boolean }) {
  return (
    <div className="karte p-3 sm:p-4">
      <div className="text-xs text-slate-500 sm:text-sm">{titel}</div>
      <div className={`mt-0.5 text-lg font-semibold sm:text-2xl ${warn ? "text-tulpe-500" : "text-salbei-700 dark:text-salbei-100"}`}>{wert}</div>
      {unten && <div className="text-xs text-slate-500 sm:text-sm">{unten}</div>}
    </div>
  );
}

type Punkt = { lebenstag: number; gramm: number; datum: string; perzentile: number | null; quelle: string };

/** SVG-Kurve: WHO-Perzentilen als Referenz, Gewichtswerte des Kindes als Linie mit Punkten. */
function Kurve({ punkte, geschlecht }: { punkte: Punkt[]; geschlecht: string | null }) {
  const [aktiv, setAktiv] = useState<number | null>(null);
  const B = 720, H = 360, L = 56, R = 44, O = 16, U = 40;
  const maxTag = Math.min(WHO_MAX_TAG, Math.max(28, Math.ceil((Math.max(...punkte.map((p) => p.lebenstag)) + 7) / 7) * 7));
  const kurven = useMemo(
    () => PERZENTILEN.map((p) => ({ p, werte: Array.from({ length: maxTag + 1 }, (_, t) => gewichtFuerPerzentile(t, p, geschlecht)) })),
    [maxTag, geschlecht],
  );
  const alle = [...kurven.flatMap((k) => k.werte), ...punkte.map((p) => p.gramm)];
  const yMin = Math.floor((Math.min(...alle) - 100) / 250) * 250;
  const yMax = Math.ceil((Math.max(...alle) + 100) / 250) * 250;
  const x = (t: number) => L + (t / maxTag) * (B - L - R);
  const y = (gr: number) => O + (1 - (gr - yMin) / (yMax - yMin)) * (H - O - U);
  const yStufe = yMax - yMin > 3000 ? 1000 : 500;
  const xStufe = maxTag <= 42 ? 7 : maxTag <= 120 ? 14 : 28;
  const pfad = (werte: Array<[number, number]>) => werte.map(([t, gr], i) => `${i ? "L" : "M"}${x(t).toFixed(1)},${y(gr).toFixed(1)}`).join("");
  const a = aktiv != null ? punkte[aktiv] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${B} ${H}`} className="h-auto w-full" role="img" aria-label="Gewichtskurve mit WHO-Perzentilen" onPointerLeave={() => setAktiv(null)}>
        {/* Raster und Achsen (zurückhaltend) */}
        {Array.from({ length: Math.floor((yMax - Math.ceil(yMin / yStufe) * yStufe) / yStufe) + 1 }, (_, i) => Math.ceil(yMin / yStufe) * yStufe + i * yStufe)
          .map((v) => (
            <g key={v}>
              <line x1={L} x2={B - R} y1={y(v)} y2={y(v)} className="stroke-sand-200 dark:stroke-salbei-700" strokeWidth={1} />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" className="fill-slate-500 text-[12px]">{(v / 1000).toLocaleString("de-DE")} kg</text>
            </g>
          ))}
        {Array.from({ length: Math.floor(maxTag / xStufe) + 1 }, (_, i) => i * xStufe).map((t) => (
          <text key={t} x={x(t)} y={H - U + 18} textAnchor="middle" className="fill-slate-500 text-[12px]">{t}</text>
        ))}
        <text x={(L + B - R) / 2} y={H - 6} textAnchor="middle" className="fill-slate-500 text-[12px]">Lebenstag</text>

        {/* WHO-Perzentilen */}
        {kurven.map((k) => (
          <g key={k.p}>
            <path d={pfad(k.werte.map((v, t) => [t, v]))} fill="none" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth={k.p === 50 ? 1.5 : 1} strokeDasharray={k.p === 50 ? undefined : "4 4"} />
            <text x={B - R + 4} y={y(k.werte[maxTag]!) + 4} className="fill-slate-500 text-[11px]">P{k.p}</text>
          </g>
        ))}

        {/* Gewicht des Kindes */}
        <path d={pfad(punkte.map((p) => [p.lebenstag, p.gramm]))} fill="none" stroke="#c2410c" strokeWidth={2} strokeLinejoin="round" />
        {punkte.map((p, i) => (
          <g key={i} onPointerEnter={() => setAktiv(i)} onClick={() => setAktiv(i)} className="cursor-pointer">
            <circle cx={x(p.lebenstag)} cy={y(p.gramm)} r={14} fill="transparent" />
            <circle cx={x(p.lebenstag)} cy={y(p.gramm)} r={aktiv === i ? 6 : 4.5} fill="#c2410c" className="stroke-white dark:stroke-salbei-900" strokeWidth={2} />
          </g>
        ))}
      </svg>
      {a && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm shadow-md dark:border-salbei-700 dark:bg-salbei-900"
          style={{ left: `${(x(a.lebenstag) / B) * 100}%`, top: `${(y(a.gramm) / H) * 100}%`, transform: `translate(${x(a.lebenstag) > B * 0.7 ? "-105%" : "8%"}, -110%)` }}
        >
          <div className="font-semibold">{g(a.gramm)} g</div>
          <div className="text-slate-500">{datumDe(a.datum)} · {a.lebenstag}. Lebenstag{a.quelle === "geburt" ? " · Geburt" : ""}</div>
          {a.perzentile != null && <div className="text-slate-500">Perzentile P{Math.round(a.perzentile)}</div>}
        </div>
      )}
    </div>
  );
}
