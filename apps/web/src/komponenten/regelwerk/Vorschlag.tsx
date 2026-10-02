import { operationBeschreiben, type Operation } from "@kindkesmoeoen/shared";
import { useState } from "react";
import { ApiFehler, api } from "../../lib/api";
import { Feld, Meldung } from "../Formular";

/**
 * Abschluss jeder Bearbeitung im Regelwerk: Die Änderung wird nicht sofort wirksam,
 * sondern als Vorschlag gespeichert, den eine andere Hebamme freigibt.
 */
export function Vorschlag({
  regelwerkId,
  operationen,
  vorher,
  titelVorschlag,
  abbrechen,
  fertig,
}: {
  regelwerkId: string | null;
  operationen: Operation[];
  vorher: Array<Record<string, unknown>>;
  titelVorschlag: string;
  abbrechen: () => void;
  fertig: () => void;
}) {
  const [titel, setTitel] = useState(titelVorschlag);
  const [begruendung, setBegruendung] = useState("");
  const [fehler, setFehler] = useState<{ text: string; felder: Record<string, string> }>();
  const zeilen = operationen.flatMap((op, i) => operationBeschreiben(op, vorher[i] ?? {}));

  if (!operationen.length) {
    return (
      <div className="space-y-3">
        <Meldung art="hinweis">Es wurde nichts geändert.</Meldung>
        <button type="button" className="knopf-sekundaer" onClick={abbrechen}>Zurück</button>
      </div>
    );
  }
  return (
    <div className="space-y-4 rounded-2xl border border-salbei-200 bg-salbei-50 p-4 dark:border-salbei-700 dark:bg-salbei-700/20">
      <div>
        <div className="font-semibold">Änderung vorschlagen</div>
        <ul className="mt-1 list-disc pl-5 text-sm">
          {zeilen.map((z) => <li key={z}>{z}</li>)}
        </ul>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Wirksam erst nach Freigabe durch eine andere Hebamme (Vier-Augen-Prinzip).</p>
      </div>
      {fehler && <Meldung art="fehler">{fehler.text}</Meldung>}
      <Feld label="Kurzbeschreibung" fehler={fehler?.felder.titel}>
        <input className="feld" value={titel} onChange={(e) => setTitel(e.target.value)} />
      </Feld>
      <Feld label="Begründung / Quelle" fehler={fehler?.felder.begruendung} hilfe="z. B. Vertragsstelle, Rundschreiben, Kalkulation">
        <textarea className="feld min-h-20" value={begruendung} onChange={(e) => setBegruendung(e.target.value)} />
      </Feld>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="knopf-primaer"
          onClick={async () => {
            try {
              await api("/api/aenderungen", { method: "POST", body: { regelwerkId, titel, begruendung, operationen } });
              fertig();
            } catch (e) {
              setFehler({ text: (e as Error).message, felder: e instanceof ApiFehler ? e.felder : {} });
            }
          }}
        >
          Zur Freigabe vorschlagen
        </button>
        <button type="button" className="knopf-sekundaer" onClick={abbrechen}>Abbrechen</button>
      </div>
    </div>
  );
}

/** Nur die geänderten Felder (Zahlen-/Textvergleich) */
export function geaendert<T extends Record<string, unknown>>(alt: Record<string, unknown>, neu: T): Partial<T> {
  return Object.fromEntries(Object.entries(neu).filter(([k, v]) => JSON.stringify(v ?? null) !== JSON.stringify(alt[k] ?? null))) as Partial<T>;
}

/** "6,19" → 6.19; leer → null */
export const zahlAus = (s: string): number | null => (s.trim() === "" ? null : Number(s.replace(",", ".")));
export const zahlText = (n: unknown) => (n === null || n === undefined || n === "" ? "" : String(n).replace(".", ","));
