import { RUECKRUF_ANLIEGEN, RUECKRUF_ZEITFENSTER, imZeitfenster, type RueckrufAnliegen, type RueckrufZeitfenster } from "@kindkesmoeoen/shared";
import { useState } from "react";
import { Meldung } from "../komponenten/Formular";
import { IconTelefon } from "../komponenten/Icons";
import { api } from "../lib/api";
import { datum } from "../lib/format";
import { useDaten } from "../lib/useDaten";

export type Rueckruf = {
  id: string;
  status: "offen" | "erledigt";
  name: string;
  telefon: string;
  anliegen: RueckrufAnliegen;
  zeitfenster: RueckrufZeitfenster;
  nachricht: string | null;
  notiz: string | null;
  versuche: number;
  letzterVersuchAm: string | null;
  erledigtAm: string | null;
  erledigtVonName: string | null;
  hebamme: { id: string; name: string; kuerzel: string } | null;
  erstelltAm: string;
};

const zeit = (iso: string) => new Date(iso).toLocaleString("de-DE", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
const telLink = (t: string) => `tel:${t.replace(/[^\d+]/g, "")}`;

/** Rückrufwünsche von der Website: anrufen, Versuch vermerken, erledigen – oder als Betreuungsanfrage übernehmen. */
export function Rueckrufe({ alsAnfrage }: { alsAnfrage: (r: Rueckruf) => void }) {
  const liste = useDaten<Rueckruf[]>("/api/rueckrufe");
  const [erledigteZeigen, setErledigteZeigen] = useState(false);
  const offen = (liste.daten ?? []).filter((r) => r.status === "offen").sort((a, b) => a.erstelltAm.localeCompare(b.erstelltAm));
  const erledigt = (liste.daten ?? []).filter((r) => r.status === "erledigt");
  if (!liste.daten || (!offen.length && !erledigt.length)) return null;

  return (
    <section id="rueckrufe" className="mb-8 scroll-mt-20" aria-labelledby="rueckrufe-titel">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="rueckrufe-titel" className="text-lg font-semibold">Rückrufwünsche {offen.length > 0 && <span className="ml-1 rounded-full bg-tulpe-100 px-2.5 py-0.5 text-sm text-tulpe-500">{offen.length}</span>}</h2>
        {erledigt.length > 0 && (
          <button type="button" className="text-sm font-medium text-salbei-600 underline" onClick={() => setErledigteZeigen(!erledigteZeigen)}>
            {erledigteZeigen ? "Erledigte ausblenden" : `Erledigte (${erledigt.length})`}
          </button>
        )}
      </div>
      {offen.length === 0 && <p className="text-slate-500">Keine offenen Rückrufwünsche.</p>}
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {offen.map((r) => <Karte key={r.id} r={r} neuLaden={liste.laden} alsAnfrage={alsAnfrage} />)}
        {erledigteZeigen && erledigt.map((r) => <Karte key={r.id} r={r} neuLaden={liste.laden} alsAnfrage={alsAnfrage} />)}
      </ul>
    </section>
  );
}

function Karte({ r, neuLaden, alsAnfrage }: { r: Rueckruf; neuLaden: () => Promise<void>; alsAnfrage: (r: Rueckruf) => void }) {
  const [notiz, setNotiz] = useState("");
  const [fehler, setFehler] = useState<string>();
  const [sendet, setSendet] = useState(false);
  const passt = r.status === "offen" && imZeitfenster(r.zeitfenster, new Date());

  async function aktion(a: "erreicht" | "nicht_erreicht" | "wieder_oeffnen") {
    setSendet(true);
    setFehler(undefined);
    try {
      await api(`/api/rueckrufe/${r.id}/aktion`, { method: "POST", body: a === "wieder_oeffnen" ? { aktion: a } : { aktion: a, notiz: notiz || null } });
      setNotiz("");
      await neuLaden();
    } catch (e) {
      setFehler((e as Error).message);
    } finally {
      setSendet(false);
    }
  }

  return (
    <li className={`karte flex flex-col gap-2 ${r.status === "erledigt" ? "opacity-70" : ""}`} data-testid="rueckruf">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{r.name}</span>
        <span className="rounded-full bg-sand-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{RUECKRUF_ANLIEGEN[r.anliegen]}</span>
        {r.status === "erledigt" && <span className="rounded-full bg-salbei-100 px-2.5 py-0.5 text-xs font-medium text-salbei-700">erledigt</span>}
        <span className="ml-auto text-xs text-slate-500">Website · {zeit(r.erstelltAm)}</span>
      </div>
      <a href={telLink(r.telefon)} className="flex w-fit items-center gap-2 text-lg font-semibold text-salbei-700 underline-offset-4 hover:underline dark:text-salbei-200">
        <IconTelefon className="size-5" /> {r.telefon}
      </a>
      <p className="text-sm">
        Erreichbar <strong>{RUECKRUF_ZEITFENSTER[r.zeitfenster]}</strong>
        {passt && <span className="ml-2 rounded-full bg-salbei-100 px-2 py-0.5 text-xs font-medium text-salbei-700">passt jetzt</span>}
        {r.hebamme && <> · Wunsch: <strong>{r.hebamme.name}</strong></>}
      </p>
      {r.nachricht && <p className="rounded-xl bg-sand-50 px-3 py-2 text-sm dark:bg-salbei-900/40">„{r.nachricht}“</p>}
      {(r.versuche > 0 || r.notiz) && (
        <p className="text-sm text-slate-500">
          {r.versuche > 0 && `${r.versuche}× nicht erreicht${r.letzterVersuchAm ? ` (zuletzt ${zeit(r.letzterVersuchAm)})` : ""}`}
          {r.versuche > 0 && r.notiz && " · "}
          {r.notiz && <span className="whitespace-pre-line">{r.notiz}</span>}
        </p>
      )}
      {r.status === "erledigt" ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          Erledigt {r.erledigtAm ? `am ${datum(r.erledigtAm.slice(0, 10))}` : ""}{r.erledigtVonName ? ` von ${r.erledigtVonName}` : ""}
          <button type="button" className="knopf-sekundaer min-h-9 px-3 text-sm" disabled={sendet} onClick={() => aktion("wieder_oeffnen")}>Wieder öffnen</button>
        </div>
      ) : (
        <>
          <input className="feld" placeholder="Notiz zum Anruf (optional)" aria-label={`Notiz zum Anruf bei ${r.name}`} value={notiz} maxLength={1000} onChange={(e) => setNotiz(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="knopf-primaer" disabled={sendet} onClick={() => aktion("erreicht")}>Erreicht – erledigt</button>
            <button type="button" className="knopf-sekundaer" disabled={sendet} onClick={() => aktion("nicht_erreicht")}>Nicht erreicht</button>
            {r.anliegen === "betreuung" && <button type="button" className="knopf-sekundaer" disabled={sendet} onClick={() => alsAnfrage(r)}>Als Betreuungsanfrage erfassen</button>}
          </div>
        </>
      )}
      {fehler && <Meldung art="fehler">{fehler}</Meldung>}
    </li>
  );
}
