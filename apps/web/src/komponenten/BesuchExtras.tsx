import { BERATUNGSTHEMEN, EPDS_THEMEN, epdsAuswerten, epdsLesen, epdsSchreiben } from "@kindkesmoeoen/shared";
import { useState } from "react";
import { datum } from "../lib/format";
import { useDaten } from "../lib/useDaten";

/**
 * EPDS-Auswertung (M3): Punkte je Frage (0–3) vom ausgefüllten Papierbogen übernehmen; Summe und Hinweise.
 * Nur Themen-Stichworte – der Wortlaut steht auf dem validierten Fragebogen.
 */
export function EpdsFeld({ wert, setze, gesperrt }: { wert: string; setze: (v: string) => void; gesperrt?: boolean }) {
  const werte = epdsLesen(wert);
  const [offen, setOffen] = useState(Boolean(wert));
  const ergebnis = epdsAuswerten(werte);
  const aendern = (i: number, v: number | null) => setze(epdsSchreiben(werte.map((alt, j) => (j === i ? v : alt))));
  return (
    <section className="karte" aria-labelledby="epds-titel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="epds-titel" className="text-lg font-semibold">EPDS (Stimmung nach der Geburt)</h2>
        {!offen && <button type="button" className="knopf-sekundaer min-h-10 px-3 text-sm" onClick={() => setOffen(true)} disabled={gesperrt}>Auswertung eintragen</button>}
      </div>
      {ergebnis && <EpdsErgebnisAnzeige ergebnis={ergebnis} />}
      {offen && (
        <fieldset disabled={gesperrt} className="mt-3 space-y-2">
          <p className="text-sm text-slate-500">Punkte je Frage vom ausgefüllten EPDS-Bogen (0–3). Die App rechnet die Summe – keine Diagnose.</p>
          <ol className="grid gap-2 lg:grid-cols-2">
            {EPDS_THEMEN.map((thema, i) => (
              <li key={thema} className="flex items-center justify-between gap-2 rounded-xl bg-sand-50 px-3 py-2 dark:bg-salbei-900/40">
                <span className="text-sm"><span className="font-semibold">{i + 1}.</span> {thema}</span>
                <span className="flex shrink-0 gap-1" role="group" aria-label={`Frage ${i + 1}: ${thema}`}>
                  {[0, 1, 2, 3].map((p) => (
                    <button key={p} type="button" aria-pressed={werte[i] === p} onClick={() => aendern(i, werte[i] === p ? null : p)} className={`size-10 rounded-lg text-sm font-semibold ${werte[i] === p ? (i === 9 && p > 0 ? "bg-tulpe-500 text-white" : "bg-salbei-600 text-white") : "border border-sand-200 bg-white dark:border-salbei-700 dark:bg-salbei-900"}`}>
                      {p}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ol>
        </fieldset>
      )}
    </section>
  );
}

function EpdsErgebnisAnzeige({ ergebnis }: { ergebnis: NonNullable<ReturnType<typeof epdsAuswerten>> }) {
  const farbe = ergebnis.selbstverletzung || ergebnis.stufe === "auffaellig" ? "border-tulpe-500/40 bg-tulpe-100 text-tulpe-500" : ergebnis.stufe === "erhoeht" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-salbei-300 bg-salbei-50 text-salbei-800";
  return (
    <div className={`mt-3 rounded-xl border px-4 py-3 ${farbe}`} role="status" data-testid="epds-ergebnis">
      <div className="font-semibold">Summe {ergebnis.summe} von 30{ergebnis.vollstaendig ? "" : " (noch nicht alle Fragen)"}</div>
      <div className="text-sm">
        {ergebnis.stufe === "auffaellig" ? "Ab 13 Punkten: wahrscheinlich behandlungsbedürftig – ärztliche Abklärung anbahnen." : ergebnis.stufe === "erhoeht" ? "Ab 10 Punkten: genauer hinsehen, Gespräch anbieten, Verlauf wiederholen." : "Unauffällig."}
        {ergebnis.selbstverletzung && <strong className="block">Frage 10 positiv: Gedanken an Selbstverletzung sofort ansprechen und Hilfe organisieren.</strong>}
      </div>
    </div>
  );
}

/** Checkliste Beratungsthemen mit „schon besprochen am …“ aus früheren Besuchen */
export function Beratungsthemen({ gewaehlt, aendern, nachGeburt, frueher, gesperrt }: { gewaehlt: string[]; aendern: (v: string[]) => void; nachGeburt: boolean; frueher: Array<{ datum: string; beratung?: string[] }>; gesperrt?: boolean }) {
  const themen = nachGeburt ? BERATUNGSTHEMEN.wochenbett : BERATUNGSTHEMEN.schwangerschaft;
  const zuletzt = (t: string) => frueher.find((b) => b.beratung?.includes(t))?.datum;
  return (
    <section className="karte" aria-labelledby="beratung-titel">
      <h2 id="beratung-titel" className="mb-3 text-lg font-semibold">Beratungsthemen</h2>
      <fieldset disabled={gesperrt} className="flex flex-wrap gap-2">
        {themen.map((t) => {
          const an = gewaehlt.includes(t);
          const vor = zuletzt(t);
          return (
            <button key={t} type="button" aria-pressed={an} onClick={() => aendern(an ? gewaehlt.filter((x) => x !== t) : [...gewaehlt, t])} className={`min-h-11 rounded-full px-4 text-left text-sm font-medium ${an ? "bg-salbei-600 text-white" : vor ? "border border-salbei-300 bg-salbei-50 text-salbei-800 dark:bg-salbei-900/40" : "border border-sand-200 bg-white dark:border-salbei-700 dark:bg-salbei-900/40"}`}>
              {t}
              {!an && vor && <span className="ml-1 text-xs font-normal">(besprochen {datum(vor)})</span>}
            </button>
          );
        })}
      </fieldset>
    </section>
  );
}

type Textbaustein = { id: string; titel: string; text: string; praxis: boolean };

/** Textbaustein an der Notiz anhängen */
export function TextbausteinWahl({ einfuegen }: { einfuegen: (text: string) => void }) {
  const liste = useDaten<Textbaustein[]>("/api/textbausteine");
  if (!liste.daten?.length) return null;
  return (
    <select
      className="feld w-auto text-sm"
      aria-label="Textbaustein einfügen"
      value=""
      onChange={(e) => {
        const b = liste.daten?.find((x) => x.id === e.target.value);
        if (b) einfuegen(b.text);
      }}
    >
      <option value="">Textbaustein einfügen …</option>
      {liste.daten.map((b) => <option key={b.id} value={b.id}>{b.titel}{b.praxis ? " (Praxis)" : ""}</option>)}
    </select>
  );
}
