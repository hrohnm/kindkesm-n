import { KURS_ARTEN, KURS_FORMATE, type KursFormat } from "@kindkesmoeoen/shared";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Feld, Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { IconMuell, IconPlus, IconStift } from "../komponenten/Icons";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { datum, euro } from "../lib/format";
import type { KlientinListe } from "../lib/typen";
import { useDaten } from "../lib/useDaten";
import { KURS_STATUS, KursFormular, type KursDaten } from "./Kurse";

type Termin = { id: string; datum: string; von: string; bis: string; format: KursFormat; hebammeId: string; hebamme: string; thema: string | null; abgeschlossen: boolean; anwesend: number };
export type Teilnahme = {
  id: string;
  klientinId: string | null;
  name: string;
  email: string | null;
  telefon: string | null;
  stichtag: string | null;
  krankenkasse: string | null;
  partner: boolean;
  status: "angemeldet" | "bestaetigt" | "warteliste" | "storniert";
  quelle: "praxis" | "online";
  bezahlt: boolean;
  nachricht: string | null;
  notiz: string | null;
  klientin: { id: string; vorname: string; nachname: string; versichertennummer: string | null } | null;
};
type Detail = { kurs: KursDaten; kasse: boolean; termine: Termin[]; teilnahmen: Teilnahme[]; leitung: Array<{ id: string; name: string; kuerzel: string }>; belegt: number };

const TN_STATUS: Record<Teilnahme["status"], [string, string]> = {
  angemeldet: ["angemeldet", "bg-amber-100 text-amber-800"],
  bestaetigt: ["bestätigt", "bg-salbei-100 text-salbei-700"],
  warteliste: ["Warteliste", "bg-sand-200 text-slate-600"],
  storniert: ["storniert", "bg-tulpe-100 text-tulpe-500"],
};
const heute = () => new Date().toISOString().slice(0, 10);

/** Kursdetails: Termine, Teilnehmerinnen mit Warteliste, Anwesenheit. */
export function Kurs() {
  const { id } = useParams();
  const navigate = useNavigate();
  const d = useDaten<Detail>(`/api/kurse/${id}`);
  const [bearbeiten, setBearbeiten] = useState(false);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string }>();
  if (!d.daten) return d.fehler ? <Meldung art="fehler">{d.fehler}</Meldung> : <Laden />;
  const { kurs } = d.daten;

  async function aktion(f: () => Promise<unknown>, ok?: string) {
    setMeldung(undefined);
    try {
      await f();
      if (ok) setMeldung({ art: "ok", text: ok });
      await d.laden();
    } catch (e) {
      setMeldung({ art: "fehler", text: (e as Error).message });
    }
  }

  return (
    <>
      <Link to="/kurse" className="mb-3 inline-flex min-h-11 items-center text-salbei-600">‹ Kurse</Link>
      <Seitenkopf
        titel={kurs.titel}
        untertitel={
          <>
            {KURS_ARTEN[kurs.art]}{kurs.einzel ? " (Einzelunterweisung)" : ""} · {d.daten.kasse ? "Krankenkasse, Formular 3.4" : `Selbstzahler${kurs.preis != null ? ` ${euro(kurs.preis)}` : ""}`} · {kurs.ort} · Leitung {d.daten.leitung.map((l) => l.name).join(" & ")}{" "}
            <span className={`ml-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${KURS_STATUS[kurs.status][1]}`}>{KURS_STATUS[kurs.status][0]}</span>
          </>
        }
        aktion={
          <div className="flex gap-2">
            <button type="button" className="knopf-sekundaer" onClick={() => setBearbeiten((x) => !x)}><IconStift className="size-5" /> Bearbeiten</button>
            <button type="button" className="knopf-gefahr px-3" aria-label="Kurs löschen" onClick={() => confirm(`Kurs „${kurs.titel}“ löschen?`) && aktion(async () => { await api(`/api/kurse/${kurs.id}`, { method: "DELETE" }); navigate("/kurse"); })}><IconMuell className="size-5" /></button>
          </div>
        }
      />
      {bearbeiten && <KursFormular kurs={kurs} abbrechen={() => setBearbeiten(false)} fertig={() => { setBearbeiten(false); void d.laden(); }} />}
      {meldung && <div className="mb-4"><Meldung art={meldung.art}>{meldung.text}</Meldung></div>}
      {kurs.beschreibung && <p className="mb-5 text-slate-600 dark:text-slate-300">{kurs.beschreibung}</p>}

      <div className="grid gap-5 xl:grid-cols-2">
        <Termine d={d.daten} aktion={aktion} />
        <Teilnehmerinnen d={d.daten} aktion={aktion} />
      </div>
    </>
  );
}

function Termine({ d, aktion }: { d: Detail; aktion: (f: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const { ich } = useAuth();
  const [neu, setNeu] = useState(false);
  const letzter = d.termine.at(-1);
  const [w, setW] = useState({ datum: heute(), von: letzter?.von ?? "18:00", bis: letzter?.bis ?? "20:00", format: 2 as KursFormat, hebammeId: d.leitung.some((l) => l.id === ich?.id) ? ich!.id : (d.leitung[0]?.id ?? ""), thema: "", wiederholungen: 1, abstandTage: 7 });
  return (
    <section className="karte space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Termine ({d.termine.length})</h2>
        <button type="button" className="knopf-sekundaer min-h-11 px-3" onClick={() => setNeu((x) => !x)}><IconPlus className="size-5" /> Termine</button>
      </div>
      {neu && (
        <div className="space-y-3 rounded-xl bg-sand-50 p-3 dark:bg-salbei-900/40">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Feld label="Erster Termin"><input className="feld" type="date" value={w.datum} onChange={(e) => setW({ ...w, datum: e.target.value })} /></Feld>
            <Feld label="Von"><input className="feld" type="time" value={w.von} onChange={(e) => setW({ ...w, von: e.target.value })} /></Feld>
            <Feld label="Bis"><input className="feld" type="time" value={w.bis} onChange={(e) => setW({ ...w, bis: e.target.value })} /></Feld>
            <Feld label="Format">
              <select className="feld" value={w.format} onChange={(e) => setW({ ...w, format: Number(e.target.value) as KursFormat })}>
                {Object.entries(KURS_FORMATE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Feld>
            <Feld label="Rechnet ab">
              <select className="feld" value={w.hebammeId} onChange={(e) => setW({ ...w, hebammeId: e.target.value })}>
                {d.leitung.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Feld>
            <Feld label="Anzahl"><input className="feld" type="number" min={1} max={20} value={w.wiederholungen} onChange={(e) => setW({ ...w, wiederholungen: Number(e.target.value) })} /></Feld>
            <Feld label="Abstand (Tage)"><input className="feld" type="number" min={1} max={31} value={w.abstandTage} onChange={(e) => setW({ ...w, abstandTage: Number(e.target.value) })} /></Feld>
            <Feld label="Thema"><input className="feld" value={w.thema} onChange={(e) => setW({ ...w, thema: e.target.value })} /></Feld>
          </div>
          <button type="button" className="knopf-primaer" onClick={() => aktion(async () => { await api(`/api/kurse/${d.kurs.id}/termine`, { method: "POST", body: { ...w, thema: w.thema || null } }); setNeu(false); }, "Termine angelegt.")}>Termine anlegen</button>
        </div>
      )}
      {!d.termine.length && <p className="text-sm text-slate-500">Noch keine Termine.</p>}
      <ul className="divide-y divide-sand-200 dark:divide-salbei-700">
        {d.termine.map((t, i) => (
          <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <span className="w-6 text-sm text-slate-500">{i + 1}.</span>
            <span className="w-24 font-medium tabular-nums">{datum(t.datum)}</span>
            <span className="text-sm tabular-nums">{t.format === 6 ? "Video" : `${t.von}–${t.bis}`}</span>
            <span className="text-sm text-slate-500">{t.format !== 2 ? KURS_FORMATE[t.format] : ""} {t.hebamme}</span>
            {t.thema && <span className="min-w-0 truncate text-sm">{t.thema}</span>}
            <span className="ml-auto flex items-center gap-2">
              {t.abgeschlossen ? <span className="text-sm text-salbei-600">✓ {t.anwesend} anwesend</span> : null}
              <Link to={`/kurse/${d.kurs.id}/termine/${t.id}`} className={t.abgeschlossen ? "knopf-sekundaer min-h-10 px-3 text-sm" : "knopf-primaer min-h-10 px-3 text-sm"}>Anwesenheit</Link>
              {!t.abgeschlossen && <button type="button" className="knopf-gefahr min-h-10 px-2" aria-label={`Termin ${datum(t.datum)} löschen`} onClick={() => confirm("Termin löschen?") && aktion(() => api(`/api/kurstermine/${t.id}`, { method: "DELETE" }))}><IconMuell className="size-4" /></button>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const nutzlast = (t: Teilnahme) => ({ klientinId: t.klientinId, name: t.name, email: t.email, telefon: t.telefon, stichtag: t.stichtag, partner: t.partner, status: t.status, bezahlt: t.bezahlt, notiz: t.notiz });

function Teilnehmerinnen({ d, aktion }: { d: Detail; aktion: (f: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const [neu, setNeu] = useState(false);
  const klientinnen = useDaten<KlientinListe[]>(neu || d.teilnahmen.some((t) => !t.klientinId) ? "/api/klientinnen?nur=alle" : null);
  const [w, setW] = useState({ klientinId: "", name: "", email: "", telefon: "", stichtag: "", partner: false });
  const aendern = (t: Teilnahme, teil: Partial<Teilnahme>) => aktion(() => api(`/api/kursteilnahmen/${t.id}`, { method: "PUT", body: { ...nutzlast(t), ...teil } }));
  const gruppen: Array<[string, Teilnahme[]]> = [
    ["Teilnehmerinnen", d.teilnahmen.filter((t) => t.status === "angemeldet" || t.status === "bestaetigt")],
    ["Warteliste", d.teilnahmen.filter((t) => t.status === "warteliste")],
    ["Storniert", d.teilnahmen.filter((t) => t.status === "storniert")],
  ];

  return (
    <section className="karte space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Plätze {d.belegt}/{d.kurs.maxTeilnehmer}</h2>
        <button type="button" className="knopf-sekundaer min-h-11 px-3" onClick={() => setNeu((x) => !x)}><IconPlus className="size-5" /> Teilnehmerin</button>
      </div>
      {neu && (
        <div className="space-y-3 rounded-xl bg-sand-50 p-3 dark:bg-salbei-900/40">
          <Feld label="Aus der Akte" hilfe={d.kasse ? "Für die Kassenabrechnung muss die Teilnehmerin eine Akte haben." : undefined}>
            <select className="feld" value={w.klientinId} onChange={(e) => {
              const k = klientinnen.daten?.find((x) => x.id === e.target.value);
              setW({ ...w, klientinId: e.target.value, name: k ? `${k.vorname} ${k.nachname}` : w.name, telefon: k?.telefon ?? w.telefon });
            }}>
              <option value="">– ohne Akte –</option>
              {(klientinnen.daten ?? []).map((k) => <option key={k.id} value={k.id}>{k.nachname}, {k.vorname}{k.ort ? ` (${k.ort})` : ""}</option>)}
            </select>
          </Feld>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Feld label="Name"><input className="feld" value={w.name} onChange={(e) => setW({ ...w, name: e.target.value })} /></Feld>
            <Feld label={d.kurs.art === "geburtsvorbereitung" ? "Errechneter Termin" : "Geburtsdatum Kind"}><input className="feld" type="date" value={w.stichtag} onChange={(e) => setW({ ...w, stichtag: e.target.value })} /></Feld>
            <Feld label="E-Mail"><input className="feld" type="email" value={w.email} onChange={(e) => setW({ ...w, email: e.target.value })} /></Feld>
            <Feld label="Telefon"><input className="feld" value={w.telefon} onChange={(e) => setW({ ...w, telefon: e.target.value })} /></Feld>
          </div>
          <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="size-6 accent-salbei-600" checked={w.partner} onChange={(e) => setW({ ...w, partner: e.target.checked })} /> mit Partner/Begleitperson</label>
          <button type="button" className="knopf-primaer" disabled={w.name.trim().length < 2} onClick={() => aktion(async () => {
            const r = await api<Teilnahme>(`/api/kurse/${d.kurs.id}/teilnahmen`, { method: "POST", body: { ...w, klientinId: w.klientinId || null, email: w.email || null, telefon: w.telefon || null, stichtag: w.stichtag || null } });
            setNeu(false);
            setW({ klientinId: "", name: "", email: "", telefon: "", stichtag: "", partner: false });
            if (r.status === "warteliste") throw new Error("Der Kurs ist voll – auf die Warteliste gesetzt.");
          })}>Hinzufügen</button>
        </div>
      )}
      {gruppen.map(([titel, liste]) =>
        liste.length ? (
          <div key={titel}>
            {titel !== "Teilnehmerinnen" && <h3 className="mt-2 text-sm font-semibold text-slate-500">{titel} ({liste.length})</h3>}
            <ul className="divide-y divide-sand-200 dark:divide-salbei-700">
              {liste.map((t) => (
                <li key={t.id} className="py-2" data-testid="teilnahme">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    {t.partner && <span className="text-xs text-slate-500">+ Partner</span>}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TN_STATUS[t.status][1]}`}>{TN_STATUS[t.status][0]}</span>
                    {t.quelle === "online" && <span className="rounded-full bg-sand-200 px-2 py-0.5 text-xs">online</span>}
                    {t.klientin ? <Link to={`/klientinnen/${t.klientin.id}`} className="text-sm text-salbei-600 underline">Akte</Link> : d.kasse && t.status !== "storniert" ? <span className="text-xs font-medium text-tulpe-500">keine Akte</span> : null}
                  </div>
                  <div className="text-sm text-slate-500">
                    {[t.email, t.telefon, t.stichtag && `${d.kurs.art === "geburtsvorbereitung" ? "ET" : "Kind geb."} ${datum(t.stichtag)}`, t.krankenkasse].filter(Boolean).join(" · ")}
                  </div>
                  {t.nachricht && <div className="text-sm italic text-slate-600 dark:text-slate-300">„{t.nachricht}“</div>}
                  <div className="mt-1 flex flex-wrap gap-2">
                    {t.status === "angemeldet" && <button type="button" className="knopf-sekundaer min-h-10 px-3 text-sm" onClick={() => aendern(t, { status: "bestaetigt" })}>Bestätigen</button>}
                    {t.status === "warteliste" && <button type="button" className="knopf-sekundaer min-h-10 px-3 text-sm" onClick={() => aendern(t, { status: "bestaetigt" })}>Nachrücken</button>}
                    {t.status !== "storniert" && <button type="button" className="knopf-sekundaer min-h-10 px-3 text-sm" onClick={() => confirm(`${t.name} stornieren?`) && aendern(t, { status: "storniert" })}>Stornieren</button>}
                    {!d.kasse && t.status !== "storniert" && (
                      <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-salbei-600" checked={t.bezahlt} onChange={(e) => aendern(t, { bezahlt: e.target.checked })} /> bezahlt</label>
                    )}
                    {!t.klientinId && klientinnen.daten && t.status !== "storniert" && (
                      <select className="feld min-h-10 w-auto py-1 text-sm" aria-label={`Akte für ${t.name} zuordnen`} value="" onChange={(e) => e.target.value && aendern(t, { klientinId: e.target.value })}>
                        <option value="">Akte zuordnen …</option>
                        {klientinnen.daten.map((k) => <option key={k.id} value={k.id}>{k.nachname}, {k.vorname}</option>)}
                      </select>
                    )}
                    {t.status === "storniert" && <button type="button" className="knopf-gefahr min-h-10 px-2" aria-label={`${t.name} entfernen`} onClick={() => aktion(() => api(`/api/kursteilnahmen/${t.id}`, { method: "DELETE" }))}><IconMuell className="size-4" /></button>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
      {!d.teilnahmen.length && <p className="text-sm text-slate-500">Noch keine Anmeldungen.</p>}
    </section>
  );
}
