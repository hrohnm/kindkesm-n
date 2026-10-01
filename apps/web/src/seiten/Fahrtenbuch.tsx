import { isoDatum } from "@kindkesmoeoen/shared";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Feld, Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { IconMuell, IconPlus, IconStift } from "../komponenten/Icons";
import { ApiFehler, api } from "../lib/api";
import { datum as datumDe } from "../lib/format";
import { useDaten } from "../lib/useDaten";

type Fahrt = {
  id: string;
  datum: string;
  tourId: string | null;
  kmStandBeginn: number | null;
  kmStandEnde: number | null;
  strecke: string;
  zweck: string;
  kmDienstlich: number;
  kmWohnungBetrieb: number;
  kmPrivat: number;
  privatLuecke: number;
  hinweise: string[];
};
type Liste = { eintraege: Fahrt[]; summen: { dienstlich: number; wohnungBetrieb: number; privat: number } };

const zahl = (x: number) => x.toLocaleString("de-DE", { maximumFractionDigits: 1 });
function monatsGrenzen(monat: string) {
  const [j, m] = monat.split("-").map(Number);
  return { von: `${monat}-01`, bis: isoDatum(new Date(j!, m!, 0)) };
}
const monatVerschieben = (monat: string, n: number) => {
  const [j, m] = monat.split("-").map(Number);
  const d = new Date(j!, m! - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Fahrtenbuch: Einträge aus den Touren, Kilometerstände, Privatfahrten, Export für das Finanzamt. */
export function Fahrtenbuch() {
  const [suche, setSuche] = useSearchParams();
  const monat = /^\d{4}-\d{2}$/.test(suche.get("monat") ?? "") ? suche.get("monat")! : isoDatum(new Date()).slice(0, 7);
  const { von, bis } = monatsGrenzen(monat);
  const liste = useDaten<Liste>(`/api/fahrtenbuch?von=${von}&bis=${bis}`);
  const [bearbeiten, setBearbeiten] = useState<Fahrt | "neu" | null>(null);
  const titel = new Date(`${monat}-15T12:00:00`).toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  return (
    <>
      <Seitenkopf
        titel="Fahrtenbuch"
        untertitel={titel}
        aktion={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="knopf-sekundaer px-4" aria-label="Vormonat" onClick={() => setSuche({ monat: monatVerschieben(monat, -1) })}>‹</button>
            <input type="month" className="feld w-auto" value={monat} onChange={(e) => e.target.value && setSuche({ monat: e.target.value })} aria-label="Monat" />
            <button type="button" className="knopf-sekundaer px-4" aria-label="Nächster Monat" onClick={() => setSuche({ monat: monatVerschieben(monat, 1) })}>›</button>
          </div>
        }
      />

      {liste.daten && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Summe titel="dienstlich" km={liste.daten.summen.dienstlich} />
          <Summe titel="Wohnung–Praxis" km={liste.daten.summen.wohnungBetrieb} />
          <Summe titel="privat" km={liste.daten.summen.privat} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="knopf-primaer" onClick={() => setBearbeiten("neu")}><IconPlus className="size-5" /> Fahrt eintragen</button>
        <a className="knopf-sekundaer" href={`/api/fahrtenbuch/export.pdf?von=${von}&bis=${bis}`} target="_blank" rel="noreferrer">PDF</a>
        <a className="knopf-sekundaer" href={`/api/fahrtenbuch/export.csv?von=${von}&bis=${bis}`}>CSV (Excel)</a>
        <a className="knopf-sekundaer" href={`/api/fahrtenbuch/export.pdf?von=${monat.slice(0, 4)}-01-01&bis=${monat.slice(0, 4)}-12-31`} target="_blank" rel="noreferrer">Jahr {monat.slice(0, 4)} (PDF)</a>
      </div>

      {bearbeiten && (
        <FahrtFormular
          fahrt={bearbeiten === "neu" ? undefined : bearbeiten}
          standardDatum={monat === isoDatum(new Date()).slice(0, 7) ? isoDatum(new Date()) : von}
          fertig={async () => {
            setBearbeiten(null);
            await liste.laden();
          }}
          abbrechen={() => setBearbeiten(null)}
        />
      )}

      {!liste.daten ? (
        liste.fehler ? <Meldung art="fehler">{liste.fehler}</Meldung> : <Laden />
      ) : liste.daten.eintraege.length === 0 ? (
        <div className="karte text-slate-500">
          Keine Fahrten in diesem Monat. Einträge entstehen auf der <Link className="underline" to="/tour">Tour</Link>-Seite mit „Ins Fahrtenbuch“ oder hier von Hand.
        </div>
      ) : (
        <ul className="space-y-3">
          {liste.daten.eintraege.map((f) => (
            <li key={f.id}>
              {f.privatLuecke > 0 && (
                <div className="mb-3 rounded-2xl border border-dashed border-sand-300 px-4 py-2 text-sm text-slate-500 dark:border-salbei-700">
                  Privatfahrten dazwischen: {zahl(f.privatLuecke)} km (Lücke im Kilometerstand)
                </div>
              )}
              <div className="karte p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{datumDe(f.datum)} · {f.zweck}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">{f.strecke}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      km-Stand {f.kmStandBeginn ?? "–"} → {f.kmStandEnde ?? "–"}
                      {f.kmStandBeginn == null || f.kmStandEnde == null ? " · bitte nachtragen" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm tabular-nums">
                      <div>{zahl(f.kmDienstlich)} km dienstlich</div>
                      {f.kmWohnungBetrieb > 0 && <div>{zahl(f.kmWohnungBetrieb)} km Wohnung–Praxis</div>}
                      {f.kmPrivat > 0 && <div>{zahl(f.kmPrivat)} km privat</div>}
                    </div>
                    <button type="button" className="knopf-sekundaer px-3" aria-label="Bearbeiten" onClick={() => setBearbeiten(f)}><IconStift className="size-5" /></button>
                  </div>
                </div>
                {f.hinweise.map((h) => <p key={h} className="mt-2 text-sm text-amber-800 dark:text-amber-200">{h}</p>)}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-sm text-slate-500">
        Namen der Familien erscheinen wegen der Schweigepflicht nicht im Fahrtenbuch. Änderungen werden protokolliert. Ob das elektronische Fahrtenbuch steuerlich anerkannt wird, bitte mit der Steuerberatung klären.
      </p>
    </>
  );
}

function Summe({ titel, km }: { titel: string; km: number }) {
  return (
    <div className="karte p-3 text-center sm:p-4">
      <div className="text-xs text-slate-500 sm:text-sm">{titel}</div>
      <div className="mt-0.5 text-lg font-semibold text-salbei-700 sm:text-2xl dark:text-salbei-100">{zahl(km)} km</div>
    </div>
  );
}

function FahrtFormular({ fahrt, standardDatum, fertig, abbrechen }: { fahrt?: Fahrt; standardDatum: string; fertig: () => Promise<void>; abbrechen: () => void }) {
  const text = (x: number | null | undefined) => (x == null ? "" : String(x).replace(".", ","));
  const [w, setW] = useState({
    datum: fahrt?.datum ?? standardDatum,
    kmStandBeginn: text(fahrt?.kmStandBeginn),
    kmStandEnde: text(fahrt?.kmStandEnde),
    strecke: fahrt?.strecke ?? "",
    zweck: fahrt?.zweck ?? "",
    kmDienstlich: text(fahrt?.kmDienstlich ?? 0),
    kmWohnungBetrieb: text(fahrt?.kmWohnungBetrieb ?? 0),
    kmPrivat: text(fahrt?.kmPrivat ?? 0),
  });
  const [fehler, setFehler] = useState<{ text: string; felder: Record<string, string> }>();
  const n = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
  const gefahren = n(w.kmStandBeginn) != null && n(w.kmStandEnde) != null ? n(w.kmStandEnde)! - n(w.kmStandBeginn)! : null;

  async function speichern() {
    try {
      const body = {
        datum: w.datum,
        kmStandBeginn: n(w.kmStandBeginn),
        kmStandEnde: n(w.kmStandEnde),
        strecke: w.strecke,
        zweck: w.zweck,
        kmDienstlich: n(w.kmDienstlich) ?? 0,
        kmWohnungBetrieb: n(w.kmWohnungBetrieb) ?? 0,
        kmPrivat: n(w.kmPrivat) ?? 0,
      };
      await api(fahrt ? `/api/fahrtenbuch/${fahrt.id}` : "/api/fahrtenbuch", { method: fahrt ? "PUT" : "POST", body });
      await fertig();
    } catch (e) {
      setFehler({ text: (e as Error).message, felder: e instanceof ApiFehler ? e.felder : {} });
    }
  }

  return (
    <div className="karte mb-6 space-y-4">
      <h2 className="text-lg font-semibold">{fahrt ? "Fahrt bearbeiten" : "Fahrt eintragen"}</h2>
      {fehler && <Meldung art="fehler">{fehler.text}</Meldung>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Feld label="Datum" fehler={fehler?.felder.datum}><input type="date" className="feld" value={w.datum} onChange={(e) => setW({ ...w, datum: e.target.value })} /></Feld>
        <Feld label="km-Stand Beginn" fehler={fehler?.felder.kmStandBeginn}><input className="feld" inputMode="numeric" value={w.kmStandBeginn} onChange={(e) => setW({ ...w, kmStandBeginn: e.target.value })} /></Feld>
        <Feld label="km-Stand Ende" fehler={fehler?.felder.kmStandEnde} hilfe={gefahren != null ? `${gefahren} km gefahren` : undefined}><input className="feld" inputMode="numeric" value={w.kmStandEnde} onChange={(e) => setW({ ...w, kmStandEnde: e.target.value })} /></Feld>
      </div>
      <Feld label="Strecke" fehler={fehler?.felder.strecke}><input className="feld" value={w.strecke} onChange={(e) => setW({ ...w, strecke: e.target.value })} placeholder="Zuhause – Kröpelin – Praxis – Zuhause" /></Feld>
      <Feld label="Zweck" fehler={fehler?.felder.zweck}><input className="feld" value={w.zweck} onChange={(e) => setW({ ...w, zweck: e.target.value })} placeholder="Hausbesuche, Praxistag, Fortbildung …" /></Feld>
      <div className="grid grid-cols-3 gap-4">
        <Feld label="km dienstlich" fehler={fehler?.felder.kmDienstlich}><input className="feld" inputMode="decimal" value={w.kmDienstlich} onChange={(e) => setW({ ...w, kmDienstlich: e.target.value })} /></Feld>
        <Feld label="km Wohnung–Praxis"><input className="feld" inputMode="decimal" value={w.kmWohnungBetrieb} onChange={(e) => setW({ ...w, kmWohnungBetrieb: e.target.value })} /></Feld>
        <Feld label="km privat"><input className="feld" inputMode="decimal" value={w.kmPrivat} onChange={(e) => setW({ ...w, kmPrivat: e.target.value })} /></Feld>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="knopf-primaer" onClick={speichern}>Speichern</button>
        <button type="button" className="knopf-sekundaer" onClick={abbrechen}>Abbrechen</button>
        {fahrt && (
          <button
            type="button"
            className="knopf-gefahr ml-auto"
            onClick={async () => {
              if (!confirm("Fahrt löschen? Die Löschung wird protokolliert.")) return;
              await api(`/api/fahrtenbuch/${fahrt.id}`, { method: "DELETE" });
              await fertig();
            }}
          >
            <IconMuell className="size-5" /> Löschen
          </button>
        )}
      </div>
    </div>
  );
}
