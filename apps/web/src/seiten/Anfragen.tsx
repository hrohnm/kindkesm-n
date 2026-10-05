import { ANFRAGE_LEISTUNGEN, ANFRAGE_STATUS, sswAusEt, type AnfrageLeistung, type AnfrageStatus } from "@kindkesmoeoen/shared";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Feld, Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { IconKalender, IconPlus } from "../komponenten/Icons";
import { api } from "../lib/api";
import { datum } from "../lib/format";
import { useDaten } from "../lib/useDaten";
import { useFormular } from "../lib/useFormular";

export type Anfrage = {
  id: string;
  quelle: "website" | "telefon" | "manuell";
  status: AnfrageStatus;
  vorname: string;
  nachname: string;
  email: string | null;
  telefon: string | null;
  et: string;
  strasse: string | null;
  plz: string | null;
  ort: string;
  erstesKind: boolean | null;
  leistungen: AnfrageLeistung[];
  nachricht: string | null;
  notiz: string | null;
  einwilligungAm: string | null;
  klientinId: string | null;
  hebamme: { id: string; name: string; kuerzel: string } | null;
  erstelltAm: string;
};

export const STATUS_STIL: Record<AnfrageStatus, string> = {
  neu: "bg-tulpe-100 text-tulpe-500",
  in_pruefung: "bg-amber-100 text-amber-800",
  warteliste: "bg-sand-200 text-slate-700",
  zugesagt: "bg-salbei-100 text-salbei-700",
  abgesagt: "bg-sand-200 text-slate-500",
  weitergeleitet: "bg-sand-200 text-slate-500",
};
const QUELLE = { website: "Website", telefon: "Telefon", manuell: "erfasst" };
const heute = () => new Date().toISOString().slice(0, 10);

const GRUPPEN: Array<[string, string, AnfrageStatus[]]> = [
  ["offen", "Offen", ["neu", "in_pruefung"]],
  ["warteliste", "Warteliste", ["warteliste"]],
  ["erledigt", "Erledigt", ["zugesagt", "abgesagt", "weitergeleitet"]],
];

/** M11: Betreuungsanfragen (Website, Telefon) – prüfen, zusagen, absagen. */
export function Anfragen() {
  const liste = useDaten<Anfrage[]>("/api/anfragen");
  const [gruppe, setGruppe] = useState("offen");
  const [neu, setNeu] = useState(false);
  const status = GRUPPEN.find((g) => g[0] === gruppe)![2];
  const gezeigt = (liste.daten ?? []).filter((a) => status.includes(a.status)).sort((a, b) => (gruppe === "erledigt" ? b.erstelltAm.localeCompare(a.erstelltAm) : a.et.localeCompare(b.et)));

  return (
    <>
      <Seitenkopf
        titel="Anfragen"
        untertitel="Betreuungsanfragen von der Website und am Telefon"
        aktion={
          <div className="flex flex-wrap gap-2">
            <Link to="/belegung" className="knopf-sekundaer"><IconKalender className="size-5" /> Belegungsplan</Link>
            <button type="button" className="knopf-primaer" onClick={() => setNeu(true)}><IconPlus className="size-5" /> Anfrage erfassen</button>
          </div>
        }
      />
      {neu && <AnfrageFormular abbrechen={() => setNeu(false)} />}

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Status">
        {GRUPPEN.map(([id, text, st]) => {
          const anzahl = (liste.daten ?? []).filter((a) => st.includes(a.status)).length;
          return (
            <button key={id} type="button" aria-pressed={gruppe === id} onClick={() => setGruppe(id)} className={`min-h-10 rounded-full px-4 text-sm font-medium ${gruppe === id ? "bg-salbei-600 text-white" : "bg-white text-slate-600 dark:bg-salbei-900/50 dark:text-slate-300"}`}>
              {text} ({anzahl})
            </button>
          );
        })}
      </div>

      {!liste.daten ? (
        <Laden />
      ) : gezeigt.length === 0 ? (
        <p className="text-slate-500">Keine Anfragen.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {gezeigt.map((a) => (
            <li key={a.id}>
              <Link to={`/anfragen/${a.id}`} className="karte flex flex-col gap-1 transition hover:border-salbei-300" data-testid="anfrage">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{a.vorname} {a.nachname}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STIL[a.status]}`}>{ANFRAGE_STATUS[a.status]}</span>
                  <span className="ml-auto text-xs text-slate-500">{QUELLE[a.quelle]} · {datum(a.erstelltAm.slice(0, 10))}</span>
                </div>
                <div className="text-sm">
                  ET <strong>{datum(a.et)}</strong>{a.et >= heute() ? ` · heute SSW ${sswAusEt(a.et, heute()).text}` : ""} · {[a.plz, a.ort].filter(Boolean).join(" ")}
                  {a.erstesKind ? " · erstes Kind" : ""}
                </div>
                <div className="truncate text-sm text-slate-500">
                  {a.leistungen.map((l) => ANFRAGE_LEISTUNGEN[l]).join(", ") || "ohne Leistungswunsch"}
                  {a.hebamme ? ` · ${a.hebamme.name}` : ""}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Anfrage erfassen, z. B. nach einem Anruf */
function AnfrageFormular({ abbrechen }: { abbrechen: () => void }) {
  const navigate = useNavigate();
  const f = useFormular({ vorname: "", nachname: "", telefon: "", email: "", et: "", strasse: "", plz: "", ort: "", erstesKind: null as boolean | null, leistungen: [] as AnfrageLeistung[], nachricht: "", quelle: "telefon" as const });
  return (
    <form
      className="karte mb-6 space-y-4 border-salbei-300"
      onSubmit={async (e) => {
        e.preventDefault();
        let id = "";
        if (await f.speichern(async (w) => (id = (await api<{ id: string }>("/api/anfragen", { method: "POST", body: w })).id))) navigate(`/anfragen/${id}`);
      }}
    >
      <h2 className="text-lg font-semibold">Anfrage erfassen</h2>
      {f.meldung?.art === "fehler" && <Meldung art="fehler">{f.meldung.text}</Meldung>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Feld label="Vorname" fehler={f.felder.vorname}><input className="feld" value={f.werte.vorname} onChange={(e) => f.setze("vorname", e.target.value)} autoFocus /></Feld>
        <Feld label="Nachname" fehler={f.felder.nachname}><input className="feld" value={f.werte.nachname} onChange={(e) => f.setze("nachname", e.target.value)} /></Feld>
        <Feld label="Errechneter Termin" fehler={f.felder.et}><input className="feld" type="date" value={f.werte.et} onChange={(e) => f.setze("et", e.target.value)} /></Feld>
        <Feld label="Telefon" fehler={f.felder.telefon}><input className="feld" inputMode="tel" value={f.werte.telefon} onChange={(e) => f.setze("telefon", e.target.value)} /></Feld>
        <Feld label="E-Mail" fehler={f.felder.email}><input className="feld" type="email" value={f.werte.email} onChange={(e) => f.setze("email", e.target.value)} /></Feld>
        <Feld label="Straße und Hausnummer (optional)" fehler={f.felder.strasse}><input className="feld" value={f.werte.strasse} onChange={(e) => f.setze("strasse", e.target.value)} /></Feld>
        <div className="grid grid-cols-[7rem_1fr] gap-3">
          <Feld label="PLZ" fehler={f.felder.plz}><input className="feld" inputMode="numeric" maxLength={5} value={f.werte.plz} onChange={(e) => f.setze("plz", e.target.value)} /></Feld>
          <Feld label="Wohnort" fehler={f.felder.ort}><input className="feld" value={f.werte.ort} onChange={(e) => f.setze("ort", e.target.value)} /></Feld>
        </div>
        <fieldset>
          <legend className="etikett">Erstes Kind?</legend>
          <div className="flex gap-2">
            {([[true, "ja"], [false, "nein"], [null, "keine Angabe"]] as const).map(([w, t]) => (
              <button key={t} type="button" aria-pressed={f.werte.erstesKind === w} onClick={() => f.setze("erstesKind", w)} className={`min-h-11 rounded-full px-4 text-sm font-medium ${f.werte.erstesKind === w ? "bg-salbei-600 text-white" : "border border-sand-200 bg-white"}`}>{t}</button>
            ))}
          </div>
        </fieldset>
      </div>
      <fieldset>
        <legend className="etikett">Gewünschte Leistungen</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ANFRAGE_LEISTUNGEN) as AnfrageLeistung[]).map((l) => {
            const an = f.werte.leistungen.includes(l);
            return <button key={l} type="button" aria-pressed={an} onClick={() => f.setze("leistungen", an ? f.werte.leistungen.filter((x) => x !== l) : [...f.werte.leistungen, l])} className={`min-h-11 rounded-full px-4 text-sm font-medium ${an ? "bg-salbei-600 text-white" : "border border-sand-200 bg-white"}`}>{ANFRAGE_LEISTUNGEN[l]}</button>;
          })}
        </div>
      </fieldset>
      <Feld label="Notiz zum Gespräch" fehler={f.felder.nachricht}><textarea className="feld min-h-20" value={f.werte.nachricht} onChange={(e) => f.setze("nachricht", e.target.value)} /></Feld>
      <div className="flex gap-2">
        <button className="knopf-primaer" disabled={f.speichert}>Anfrage speichern</button>
        <button type="button" className="knopf-sekundaer" onClick={abbrechen}>Abbrechen</button>
      </div>
    </form>
  );
}
