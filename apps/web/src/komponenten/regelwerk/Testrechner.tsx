import { LEISTUNGSART_LABEL, LEISTUNGSTYPEN, LEISTUNGSTYP_LABEL, type Ergebnis, type Leistungsart, type Leistungstyp } from "@kindkesmoeoen/shared";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { euro } from "../../lib/format";
import { Feld, Meldung } from "../Formular";
import type { AenderungZeile } from "./Aenderungen";
import { useDaten } from "../../lib/useDaten";

/** Erfundenen Besuch abrechnen – mit dem aktuellen Regelwerk und optional mit einer offenen Änderung. */
export function Testrechner({ regelwerkId, aenderungId: start }: { regelwerkId: string; aenderungId: string | null }) {
  const offen = useDaten<AenderungZeile[]>("/api/aenderungen?status=offen");
  const [w, setW] = useState({ datum: new Date().toISOString().slice(0, 10), von: "10:00", bis: "10:45", typ: "wochenbett" as Leistungstyp, art: 1 as Leistungsart, lebenstag: "5", ssw: "30", anzahlKinder: 1, aenderungId: start ?? "" });
  const [ergebnis, setErgebnis] = useState<{ vorher: Ergebnis; nachher: Ergebnis | null }>();
  const [fehler, setFehler] = useState<string>();
  useEffect(() => setW((x) => ({ ...x, aenderungId: start ?? x.aenderungId })), [start]);

  const wochenbett = w.typ === "wochenbett";
  async function rechnen() {
    setFehler(undefined);
    try {
      setErgebnis(
        await api(`/api/regelwerke/${regelwerkId}/testrechnung`, {
          method: "POST",
          body: { datum: w.datum, von: w.von, bis: w.bis, typ: w.typ, art: w.art, lebenstag: wochenbett ? Number(w.lebenstag) : null, ssw: wochenbett ? null : Number(w.ssw), anzahlKinder: w.anzahlKinder, aenderungId: w.aenderungId || null },
        }),
      );
    } catch (e) {
      setFehler((e as Error).message);
    }
  }
  useEffect(() => {
    void rechnen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, regelwerkId]);

  const passende = (offen.daten ?? []).filter((a) => a.regelwerkId === regelwerkId);
  return (
    <div className="space-y-4">
      <div className="karte grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Feld label="Datum"><input type="date" className="feld" value={w.datum} onChange={(e) => setW({ ...w, datum: e.target.value })} /></Feld>
        <Feld label="Beginn"><input type="time" className="feld" value={w.von} onChange={(e) => setW({ ...w, von: e.target.value })} /></Feld>
        <Feld label="Ende"><input type="time" className="feld" value={w.bis} onChange={(e) => setW({ ...w, bis: e.target.value })} /></Feld>
        <Feld label="Art">
          <select className="feld" value={w.art} onChange={(e) => setW({ ...w, art: Number(e.target.value) as Leistungsart })}>
            {([1, 2, 3, 4] as Leistungsart[]).map((a) => <option key={a} value={a}>{LEISTUNGSART_LABEL[a]}</option>)}
          </select>
        </Feld>
        <div className="col-span-2">
          <Feld label="Leistung">
            <select className="feld" value={w.typ} onChange={(e) => setW({ ...w, typ: e.target.value as Leistungstyp })}>
              {LEISTUNGSTYPEN.map((t) => <option key={t} value={t}>{LEISTUNGSTYP_LABEL[t]}</option>)}
            </select>
          </Feld>
        </div>
        {wochenbett ? (
          <Feld label="Lebenstag des Kindes"><input className="feld" inputMode="numeric" value={w.lebenstag} onChange={(e) => setW({ ...w, lebenstag: e.target.value })} /></Feld>
        ) : (
          <Feld label="SSW"><input className="feld" inputMode="numeric" value={w.ssw} onChange={(e) => setW({ ...w, ssw: e.target.value })} /></Feld>
        )}
        <Feld label="Kinder">
          <select className="feld" value={w.anzahlKinder} onChange={(e) => setW({ ...w, anzahlKinder: Number(e.target.value) })}>
            {[1, 2, 3].map((n) => <option key={n} value={n}>{n === 1 ? "1" : `${n} (Mehrlinge)`}</option>)}
          </select>
        </Feld>
        <div className="col-span-2 sm:col-span-4">
          <Feld label="Vergleichen mit offener Änderung">
            <select className="feld" value={w.aenderungId} onChange={(e) => setW({ ...w, aenderungId: e.target.value })}>
              <option value="">– nur aktuelles Regelwerk –</option>
              {passende.map((a) => <option key={a.id} value={a.id}>#{a.nummer} {a.titel} ({a.von})</option>)}
            </select>
          </Feld>
        </div>
      </div>
      <p className="text-sm text-slate-500">Ohne frühere Besuche gerechnet (Kontingente zählen ab null).</p>
      {fehler && <Meldung art="fehler">{fehler}</Meldung>}
      {ergebnis?.nachher && JSON.stringify(ergebnis.nachher.zeilen) === JSON.stringify(ergebnis.vorher.zeilen) && JSON.stringify(ergebnis.nachher.hinweise) === JSON.stringify(ergebnis.vorher.hinweise) && (
        <Meldung art="hinweis">Bei diesen Eingaben ändert sich nichts. Leistung, Art, Uhrzeit (Zuschläge) oder Lebenstag so wählen, dass die geänderte Position bzw. Regel greift.</Meldung>
      )}
      {ergebnis && (
        <div className={`grid grid-cols-1 gap-4 ${ergebnis.nachher ? "lg:grid-cols-2" : ""}`}>
          <ErgebnisKarte titel="Aktuelles Regelwerk" e={ergebnis.vorher} />
          {ergebnis.nachher && <ErgebnisKarte titel="Mit der Änderung" e={ergebnis.nachher} vergleich={ergebnis.vorher} />}
        </div>
      )}
    </div>
  );
}

function ErgebnisKarte({ titel, e, vergleich }: { titel: string; e: Ergebnis; vergleich?: Ergebnis }) {
  const diff = vergleich ? e.summe - vergleich.summe : 0;
  return (
    <section className="karte space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">{titel}</h3>
        <span className="text-lg font-semibold">
          {euro(e.summe)}
          {vergleich && Math.abs(diff) >= 0.005 && <span className={`ml-2 text-sm ${diff > 0 ? "text-salbei-600" : "text-tulpe-500"}`}>({diff > 0 ? "+" : ""}{euro(diff)})</span>}
        </span>
      </div>
      <div className="text-sm text-slate-500">{e.einheiten * 5} Min. · {e.einheitenAbrechenbar * 5} Min. abrechenbar{e.stamm ? ` · GPOS ${e.stamm}XX` : ""}</div>
      <table className="w-full text-sm">
        <tbody>
          {e.zeilen.map((z) => (
            <tr key={z.gpos} className="border-t border-sand-200 dark:border-salbei-700">
              <td className="py-1.5 pr-2 font-mono">{z.gpos}</td>
              <td className="py-1.5 pr-2">{z.einheit === "5min" ? `${z.menge} × ${euro(z.einzelbetrag)}` : z.bezeichnung}{z.zuschlag ? " · Zuschlag" : ""}</td>
              <td className="py-1.5 text-right font-medium">{euro(z.betrag)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {e.hinweise.map((h) => <p key={h.text} className={`text-sm ${h.stufe === "fehler" ? "text-tulpe-500" : h.stufe === "warnung" ? "text-amber-800 dark:text-amber-200" : "text-slate-500"}`}>{h.text}</p>)}
    </section>
  );
}
