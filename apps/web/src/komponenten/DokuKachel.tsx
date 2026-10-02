import { mehrfachText, mehrfachWerte, type DokuFeld, type FeldEinstellung } from "@kindkesmoeoen/shared";
import { useState, type ReactNode } from "react";
import { datum as datumFormat } from "../lib/format";
import { Feld } from "./Formular";

export type FruehererWert = { datum: string; werte: Record<string, unknown> };

const leer = (v: unknown) => v === undefined || v === null || String(v).trim() === "";
const zahl = (v: unknown) => Number(String(v ?? "").replace(",", "."));
const anzeige = (f: DokuFeld, v: unknown) => `${String(v).replace(".", ",")}${f.einheit ? ` ${f.einheit}` : ""}`;

/**
 * Aufklappbare Kachel der Besuchsdokumentation (Mutter oder ein Kind).
 * Sichtbar sind die Felder laut persönlicher Ansicht, außerdem alle Felder mit Wert;
 * ausgeblendete Felder lassen sich mit „Weitere Felder“ einblenden.
 */
export function DokuKachel({
  titel,
  felder,
  werte,
  setze,
  einstellungen,
  frueher,
  offenStandard,
  kopfZusatz,
  feldHilfe,
  gesperrt,
}: {
  titel: string;
  felder: DokuFeld[];
  werte: Record<string, string>;
  setze: (id: string, v: string) => void;
  einstellungen: Record<string, FeldEinstellung>;
  /** frühere Besuche, neueste zuerst */
  frueher: FruehererWert[];
  offenStandard: boolean;
  kopfZusatz?: ReactNode;
  feldHilfe?: (f: DokuFeld, wert: string) => ReactNode;
  gesperrt?: boolean;
}) {
  const [offen, setOffen] = useState(offenStandard);
  const [alle, setAlle] = useState(false);
  const sichtbar = (f: DokuFeld) => alle || einstellungen[f.id]?.sichtbar !== false || !leer(werte[f.id]);
  const ausgeblendet = felder.filter((f) => einstellungen[f.id]?.sichtbar === false && leer(werte[f.id]));
  const zusammenfassung = felder
    .filter((f) => !leer(werte[f.id]))
    .map((f) => `${f.label} ${anzeige(f, werte[f.id])}`)
    .join(" · ");

  /** Wert des letzten Besuchs, an dem das Feld ausgefüllt war */
  const vergleich = (f: DokuFeld): ReactNode => {
    if (!einstellungen[f.id]?.vergleich) return null;
    const vor = frueher.find((b) => !leer(b.werte[f.id]));
    if (!vor) return null;
    const alt = vor.werte[f.id];
    let diff = "";
    if (f.art === "zahl" && !leer(werte[f.id]) && Number.isFinite(zahl(werte[f.id])) && Number.isFinite(zahl(alt))) {
      const d = zahl(werte[f.id]) - zahl(alt);
      diff = ` (${d > 0 ? "+" : d < 0 ? "−" : "±"}${Math.abs(Math.round(d * 10) / 10).toLocaleString("de-DE")}${f.einheit ? ` ${f.einheit}` : ""})`;
    }
    return (
      <span className="block text-slate-500">
        Zuletzt {datumFormat(vor.datum)}: {anzeige(f, alt)}
        {diff}
      </span>
    );
  };

  const hilfe = (f: DokuFeld) => {
    const a = feldHilfe?.(f, werte[f.id] ?? "");
    const b = vergleich(f);
    return a || b ? (
      <>
        {a}
        {b}
      </>
    ) : undefined;
  };

  const zahlen = felder.filter((f) => f.art === "zahl" && sichtbar(f));
  const andere = felder.filter((f) => f.art !== "zahl" && sichtbar(f));

  return (
    <section className="karte p-0">
      <div className="flex items-center gap-2 px-5 py-3">
        <button type="button" aria-expanded={offen} onClick={() => setOffen((x) => !x)} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left">
          <span className={`inline-block text-salbei-600 transition-transform ${offen ? "rotate-90" : ""}`} aria-hidden="true">▶</span>
          <span className="min-w-0">
            <span className="block text-lg font-semibold">{titel}</span>
            {!offen && <span className="block truncate text-sm text-slate-500">{zusammenfassung || "noch nichts eingetragen"}</span>}
          </span>
        </button>
        {kopfZusatz}
      </div>
      {offen && (
        <fieldset disabled={gesperrt} className="space-y-4 border-t border-sand-200 px-5 pt-4 pb-5 dark:border-salbei-700">
          {zahlen.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {zahlen.map((f) => (
                <Feld key={f.id} label={`${f.label}${f.einheit ? ` (${f.einheit})` : ""}`} hilfe={hilfe(f)}>
                  <input className="feld" inputMode={f.inputMode} value={werte[f.id] ?? ""} onChange={(e) => setze(f.id, e.target.value)} />
                </Feld>
              ))}
            </div>
          )}
          {andere.map((f) =>
            f.art === "auswahl" ? (
              <Chips key={f.id} label={f.label} werte={f.auswahl ?? []} wert={werte[f.id] ?? ""} aendern={(v) => setze(f.id, v)} hilfe={hilfe(f)} mehrfach={f.mehrfach} />
            ) : (
              <Feld key={f.id} label={f.label} hilfe={hilfe(f)}>
                <input className="feld" value={werte[f.id] ?? ""} onChange={(e) => setze(f.id, e.target.value)} />
              </Feld>
            ),
          )}
          {(ausgeblendet.length > 0 || alle) && (
            <button type="button" className="min-h-11 text-sm font-medium text-salbei-600" onClick={() => setAlle((x) => !x)}>
              {alle ? "Ausgeblendete Felder wieder verbergen" : `Weitere Felder einblenden (${ausgeblendet.map((f) => f.label).join(", ")})`}
            </button>
          )}
        </fieldset>
      )}
    </section>
  );
}

/** Schnellauswahl per Antippen (bei `mehrfach` mehrere Werte, gespeichert durch Komma getrennt). */
export function Chips({ label, werte, wert, aendern, hilfe, mehrfach }: { label: string; werte: readonly string[]; wert: string; aendern: (v: string) => void; hilfe?: ReactNode; mehrfach?: boolean }) {
  const gewaehlt = mehrfach ? mehrfachWerte(wert) : wert ? [wert] : [];
  const umschalten = (v: string) => {
    if (!mehrfach) return aendern(wert === v ? "" : v);
    // Reihenfolge wie in der Auswahl, eigene Werte (z. B. aus älteren Besuchen) hinten
    const neu = gewaehlt.includes(v) ? gewaehlt.filter((x) => x !== v) : [...gewaehlt, v];
    aendern(mehrfachText([...werte.filter((x) => neu.includes(x)), ...neu.filter((x) => !werte.includes(x))]));
  };
  const eigene = gewaehlt.filter((x) => !werte.includes(x));
  return (
    <div role="group" aria-label={label}>
      <span className="etikett">{label}{mehrfach ? <span className="ml-1 font-normal text-slate-500">(mehrere möglich)</span> : null}</span>
      <div className="flex flex-wrap gap-2">
        {[...werte, ...eigene].map((v) => {
          const an = gewaehlt.includes(v);
          return (
            <button key={v} type="button" aria-pressed={an} onClick={() => umschalten(v)} className={`min-h-11 rounded-full px-4 text-sm font-medium ${an ? "bg-salbei-600 text-white" : "border border-sand-200 bg-white dark:border-salbei-700 dark:bg-salbei-900/40"}`}>
              {an && mehrfach ? "✓ " : ""}{v}
            </button>
          );
        })}
      </div>
      {hilfe && <span className="mt-1.5 block text-sm">{hilfe}</span>}
    </div>
  );
}
