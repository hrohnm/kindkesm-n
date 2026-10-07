import { KURS_ARTEN, type KursArt } from "@kindkesmoeoen/shared";
import { useState } from "react";
import { Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { euro } from "../lib/format";
import { useDaten } from "../lib/useDaten";

type Statistik = {
  jahr: number;
  summen: { besuche: number; familien: number; geburten: number; kurse: number };
  monate: Array<{ monat: string; besuche: number; geburten: number; eigeneBesuche: number }>;
  jeHebamme: Array<{ id: string; name: string; kuerzel: string; status: string; besuche: number; familien: number; geburten: number }>;
  orte: Array<{ ort: string; familien: number }>;
  kurse: Array<{ id: string; titel: string; art: KursArt; termine: number; beginn: string; teilnehmerinnen: number; warteliste: number; plaetze: number; auslastung: number }>;
  meins: { monate: Array<{ monat: string; umsatzKasse: number; km: number }>; umsatzKasse: number; km: number; nichtVersendet: number; unbezahlt: number; unbezahltAnzahl: number };
};

const MONAT_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const monatLang = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
const zahl = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });

function Kachel({ titel, wert, hinweis }: { titel: string; wert: string; hinweis?: string }) {
  return (
    <div className="karte" data-testid="kennzahl">
      <div className="text-sm text-slate-500">{titel}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums xl:text-3xl">{wert}</div>
      {hinweis && <div className="mt-1 text-xs text-slate-500">{hinweis}</div>}
    </div>
  );
}

/** Balken je Monat (eine Reihe), Hover/Fokus zeigt den Wert; darunter wahlweise als Tabelle */
function MonatsBalken({ titel, werte, format = zahl }: { titel: string; werte: Array<{ monat: string; wert: number }>; format?: (n: number) => string }) {
  const [aktiv, setAktiv] = useState<number | null>(null);
  const [tabelle, setTabelle] = useState(false);
  const max = Math.max(1, ...werte.map((w) => w.wert));
  const B = 600;
  const H = 180;
  const unten = 22;
  const breite = B / werte.length;
  // ruhige Rasterlinien bei „schönen“ Werten
  const schritt = Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1);
  const linien = Array.from({ length: Math.floor(max / schritt) }, (_, i) => (i + 1) * schritt);
  return (
    <figure className="karte">
      <figcaption className="mb-2 flex items-center justify-between gap-2">
        <span className="font-semibold">{titel}</span>
        <button type="button" className="min-h-9 text-sm font-medium text-salbei-600" onClick={() => setTabelle((x) => !x)}>{tabelle ? "Als Diagramm" : "Als Tabelle"}</button>
      </figcaption>
      {tabelle ? (
        <table className="w-full text-sm">
          <tbody>
            {werte.map((w) => (
              <tr key={w.monat} className="border-b border-sand-100 last:border-0 dark:border-salbei-800">
                <td className="py-1">{monatLang(w.monat)}</td>
                <td className="py-1 text-right tabular-nums">{format(w.wert)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${B} ${H + unten}`} className="w-full" role="img" aria-label={`${titel}: ${werte.map((w, i) => `${MONAT_KURZ[i]} ${format(w.wert)}`).join(", ")}`}>
            {linien.map((l) => (
              <g key={l}>
                <line x1={0} x2={B} y1={H - (l / max) * (H - 12)} y2={H - (l / max) * (H - 12)} className="stroke-sand-200 dark:stroke-salbei-800" strokeWidth={1} />
                <text x={2} y={H - (l / max) * (H - 12) - 3} className="fill-slate-400 text-[10px]">{format(l)}</text>
              </g>
            ))}
            <line x1={0} x2={B} y1={H} y2={H} className="stroke-slate-300 dark:stroke-salbei-700" strokeWidth={1} />
            {werte.map((w, i) => {
              const h = (w.wert / max) * (H - 12);
              const x = i * breite + breite * 0.2;
              const bw = breite * 0.6;
              return (
                <g key={w.monat} onMouseEnter={() => setAktiv(i)} onMouseLeave={() => setAktiv(null)} onFocus={() => setAktiv(i)} onBlur={() => setAktiv(null)} tabIndex={0} aria-label={`${monatLang(w.monat)}: ${format(w.wert)}`}>
                  {/* Trefferfläche größer als der Balken */}
                  <rect x={i * breite} y={0} width={breite} height={H} fill="transparent" />
                  {h > 0 && <path d={`M${x},${H} v${-Math.max(0, h - 4)} q0,-4 4,-4 h${bw - 8} q4,0 4,4 v${Math.max(0, h - 4)} z`} className={aktiv === i ? "fill-salbei-700 dark:fill-salbei-200" : "fill-salbei-500 dark:fill-salbei-300"} />}
                  <text x={i * breite + breite / 2} y={H + 15} textAnchor="middle" className="fill-slate-500 text-[11px]">{MONAT_KURZ[i]}</text>
                </g>
              );
            })}
          </svg>
          {aktiv !== null && (
            <div className="pointer-events-none absolute -top-2 rounded-lg bg-slate-800 px-2 py-1 text-xs text-white shadow" style={{ left: `${((aktiv + 0.5) / werte.length) * 100}%`, transform: "translateX(-50%)" }} role="status">
              {monatLang(werte[aktiv]!.monat)}: <strong>{format(werte[aktiv]!.wert)}</strong>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

/** M22: Statistik – Team-Zahlen für alle, Umsatz und Kilometer nur die eigenen */
export function Statistik() {
  const aktuell = new Date().getFullYear();
  const [jahr, setJahr] = useState(aktuell);
  const d = useDaten<Statistik>(`/api/statistik?jahr=${jahr}`);
  const s = d.daten;
  return (
    <>
      <Seitenkopf
        titel="Statistik"
        untertitel="Team-Zahlen für alle; Umsatz und Kilometer siehst du nur für dich."
        aktion={
          <label className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Jahr</span>
            <select className="feld w-auto" value={jahr} onChange={(e) => setJahr(Number(e.target.value))} aria-label="Jahr">
              {[aktuell, aktuell - 1, aktuell - 2].map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </label>
        }
      />
      {d.fehler && <Meldung art="fehler">{d.fehler}</Meldung>}
      {!s ? (
        <Laden />
      ) : (
        <div className="space-y-6">
          <section aria-label="Team" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kachel titel="Besuche (Team)" wert={zahl(s.summen.besuche)} hinweis="abgeschlossen" />
            <Kachel titel="Betreute Familien" wert={zahl(s.summen.familien)} hinweis="mit mindestens einem Besuch" />
            <Kachel titel="Geburten" wert={zahl(s.summen.geburten)} hinweis="Kinder in der Akte" />
            <Kachel titel="Kurse" wert={zahl(s.summen.kurse)} hinweis="mit Terminen im Jahr" />
          </section>

          <MonatsBalken titel="Besuche je Monat (Team)" werte={s.monate.map((m) => ({ monat: m.monat, wert: m.besuche }))} />

          <section className="karte overflow-x-auto">
            <h2 className="mb-3 text-lg font-semibold">Je Hebamme</h2>
            <table className="w-full min-w-96 text-sm" data-testid="je-hebamme">
              <thead className="text-left text-slate-500">
                <tr><th className="py-1 font-medium">Hebamme</th><th className="py-1 text-right font-medium">Besuche</th><th className="py-1 text-right font-medium">Familien</th><th className="py-1 text-right font-medium">Geburten</th></tr>
              </thead>
              <tbody>
                {s.jeHebamme.map((h) => (
                  <tr key={h.id} className="border-t border-sand-100 dark:border-salbei-800">
                    <td className="py-2">{h.name}{h.status === "babypause" && <span className="ml-1 text-xs text-slate-500">(Babypause)</span>}</td>
                    <td className="py-2 text-right tabular-nums">{zahl(h.besuche)}</td>
                    <td className="py-2 text-right tabular-nums">{zahl(h.familien)}</td>
                    <td className="py-2 text-right tabular-nums">{zahl(h.geburten)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-labelledby="meins-titel" className="space-y-3">
            <h2 id="meins-titel" className="text-lg font-semibold">Meine Abrechnung (Kasse)</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kachel titel="Umsatz Kasse" wert={euro(s.meins.umsatzKasse)} hinweis="Leistungen abgeschlossener Besuche" />
              <Kachel titel="Noch nicht versendet" wert={euro(s.meins.nichtVersendet)} hinweis="alle Jahre" />
              <Kachel titel="Versendet, noch nicht bezahlt" wert={euro(s.meins.unbezahlt)} hinweis={`${s.meins.unbezahltAnzahl} Versand/Versände`} />
              <Kachel titel="Dienstliche Kilometer" wert={`${zahl(s.meins.km)} km`} hinweis="aus dem Fahrtenbuch" />
            </div>
            <MonatsBalken titel="Mein Umsatz Kasse je Monat" werte={s.meins.monate.map((m) => ({ monat: m.monat, wert: m.umsatzKasse }))} format={(n) => euro(n)} />
            <p className="text-xs text-slate-500">Selbstzahler-Umsatz (Kurse, Babymassage …) folgt mit den Selbstzahler-Rechnungen (M13).</p>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="karte">
              <h2 className="mb-3 text-lg font-semibold">Wohnorte der Familien</h2>
              {s.orte.length === 0 ? <p className="text-sm text-slate-500">Keine Besuche im Jahr.</p> : (
                <ul className="space-y-2" data-testid="orte">
                  {s.orte.map((o) => (
                    <li key={o.ort} className="text-sm">
                      <div className="flex justify-between"><span>{o.ort}</span><span className="tabular-nums">{o.familien}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-sand-100 dark:bg-salbei-800"><div className="h-2 rounded-full bg-salbei-500 dark:bg-salbei-300" style={{ width: `${(o.familien / s.orte[0]!.familien) * 100}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="karte">
              <h2 className="mb-3 text-lg font-semibold">Kursauslastung</h2>
              {s.kurse.length === 0 ? <p className="text-sm text-slate-500">Keine Kurse im Jahr.</p> : (
                <ul className="space-y-3" data-testid="kursauslastung">
                  {s.kurse.map((k) => (
                    <li key={k.id} className="text-sm">
                      <div className="flex justify-between gap-2"><span className="font-medium">{k.titel}</span><span className="tabular-nums">{k.teilnehmerinnen} / {k.plaetze}{k.warteliste ? ` · ${k.warteliste} Warteliste` : ""}</span></div>
                      <div className="text-xs text-slate-500">{KURS_ARTEN[k.art]} · {k.termine} Termine</div>
                      <div className="mt-1 h-2 rounded-full bg-sand-100 dark:bg-salbei-800" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, k.auslastung)} aria-label={`Auslastung ${k.titel}`}><div className="h-2 rounded-full bg-salbei-500 dark:bg-salbei-300" style={{ width: `${Math.min(100, k.auslastung)}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
