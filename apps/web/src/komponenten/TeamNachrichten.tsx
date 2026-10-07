import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { datum } from "../lib/format";
import type { TeamMitglied } from "../lib/typen";
import { useDaten } from "../lib/useDaten";
import { Feld, Laden, Meldung } from "./Formular";

type Nachricht = { id: string; text: string; erstelltAm: string; vonId: string; vonName: string; anId: string | null; anName: string | null; klientinId: string | null; klientinName: string | null; gelesen: boolean };
type Aufgabe = { id: string; titel: string; notiz: string | null; faelligAm: string | null; erledigtAm: string | null; zustaendigId: string | null; zustaendigName: string | null; erstelltVon: string; erstelltVonName: string; klientinId: string | null; klientinName: string | null };

const zeit = (iso: string) => new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const heuteIso = () => new Date().toISOString().slice(0, 10);

function useKolleginnen() {
  const { ich } = useAuth();
  const team = useDaten<TeamMitglied[]>("/api/team");
  return (team.daten ?? []).filter((h) => h.rolle === "hebamme" && h.id !== ich?.id && h.status !== "ausgeschieden");
}

/** M20: Team-Nachrichten – an das ganze Team oder eine Kollegin, optional zu einer Akte */
export function NachrichtenListe({ klientinId, kompakt }: { klientinId?: string; kompakt?: boolean }) {
  const { ich } = useAuth();
  const liste = useDaten<Nachricht[]>(`/api/nachrichten${klientinId ? `?klientinId=${klientinId}` : ""}`);
  const kolleginnen = useKolleginnen();
  const [text, setText] = useState("");
  const [an, setAn] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [sendet, setSendet] = useState(false);
  const ungelesen = (liste.daten ?? []).some((n) => !n.gelesen);

  // Beim Ansehen als gelesen markieren (die Markierung „neu“ bleibt bis zum nächsten Laden sichtbar)
  useEffect(() => {
    if (ungelesen) void api("/api/nachrichten/gelesen", { method: "POST", body: klientinId ? { klientinId } : {} }).catch(() => {});
  }, [ungelesen, klientinId]);

  const senden = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendet(true);
    setFehler(null);
    try {
      await api("/api/nachrichten", { method: "POST", body: { text, anId: an, klientinId: klientinId ?? null } });
      setText("");
      await liste.laden();
    } catch (err) {
      setFehler((err as Error).message);
    } finally {
      setSendet(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={senden} className="space-y-2">
        {fehler && <Meldung art="fehler">{fehler}</Meldung>}
        <Feld label={klientinId ? "Nachricht zu dieser Familie" : "Neue Nachricht"}>
          <textarea className="feld min-h-20" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. Wer kann am Samstag übernehmen?" />
        </Feld>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="etikett">Empfängerin</span>
            <select className="feld w-auto" aria-label="Empfängerin" value={an} onChange={(e) => setAn(e.target.value)}>
              <option value="">ganzes Team</option>
              {kolleginnen.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </label>
          <button className="knopf-primaer" disabled={sendet || !text.trim()}>Senden</button>
        </div>
      </form>
      {!liste.daten ? (
        <Laden />
      ) : liste.daten.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Nachrichten{klientinId ? " zu dieser Familie" : ""}.</p>
      ) : (
        <ul className="space-y-2">
          {(kompakt ? liste.daten.slice(0, 5) : liste.daten).map((n) => (
            <li key={n.id} className={`rounded-xl border px-4 py-3 ${n.vonId === ich?.id ? "border-sand-200 bg-white dark:border-salbei-700 dark:bg-salbei-900/40" : "border-salbei-200 bg-salbei-50 dark:border-salbei-700 dark:bg-salbei-900/60"}`} data-testid="nachricht">
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{n.vonName}</span>
                <span>→ {n.anName ?? "Team"}</span>
                <span>· {zeit(n.erstelltAm)}</span>
                {!n.gelesen && <span className="rounded-full bg-tulpe-500 px-2 py-0.5 font-semibold text-white">neu</span>}
                {n.klientinId && !klientinId && <Link to={`/klientinnen/${n.klientinId}`} className="font-medium text-salbei-600">{n.klientinName} ›</Link>}
                {n.vonId === ich?.id && (
                  <button type="button" className="ml-auto min-h-8 text-salbei-600" aria-label="Nachricht löschen" onClick={async () => { if (!confirm("Nachricht löschen?")) return; await api(`/api/nachrichten/${n.id}`, { method: "DELETE" }); await liste.laden(); }}>
                    Löschen
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-line">{n.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** M20: Aufgaben mit Fälligkeit – für eine Kollegin oder das Team */
export function AufgabenListe({ klientinId }: { klientinId?: string }) {
  const { ich } = useAuth();
  const [erledigte, setErledigte] = useState(false);
  const liste = useDaten<Aufgabe[]>(`/api/aufgaben?${new URLSearchParams({ ...(klientinId ? { klientinId } : {}), ...(erledigte ? { erledigt: "ja" } : {}) })}`);
  const kolleginnen = useKolleginnen();
  const [titel, setTitel] = useState("");
  const [faellig, setFaellig] = useState("");
  const [zustaendig, setZustaendig] = useState(ich?.id ?? "");
  const [fehler, setFehler] = useState<string | null>(null);

  const anlegen = async (e: React.FormEvent) => {
    e.preventDefault();
    setFehler(null);
    try {
      await api("/api/aufgaben", { method: "POST", body: { titel, faelligAm: faellig, zustaendigId: zustaendig, klientinId: klientinId ?? null } });
      setTitel("");
      setFaellig("");
      await liste.laden();
    } catch (err) {
      setFehler((err as Error).message);
    }
  };
  const umschalten = async (a: Aufgabe) => {
    await api(`/api/aufgaben/${a.id}/erledigt`, { method: "POST", body: { erledigt: !a.erledigtAm } });
    await liste.laden();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={anlegen} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        {fehler && <div className="sm:col-span-4"><Meldung art="fehler">{fehler}</Meldung></div>}
        <Feld label="Neue Aufgabe"><input className="feld" maxLength={120} value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="z. B. Anordnung bei der Frauenärztin holen" /></Feld>
        <Feld label="Fällig am"><input type="date" className="feld" value={faellig} onChange={(e) => setFaellig(e.target.value)} /></Feld>
        <label className="block">
          <span className="etikett">Für</span>
          <select className="feld" aria-label="Zuständig" value={zustaendig} onChange={(e) => setZustaendig(e.target.value)}>
            {ich && <option value={ich.id}>mich</option>}
            {kolleginnen.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            <option value="">Team</option>
          </select>
        </label>
        <button className="knopf-primaer" disabled={!titel.trim()}>Anlegen</button>
      </form>
      {!liste.daten ? (
        <Laden />
      ) : liste.daten.length === 0 ? (
        <p className="text-sm text-slate-500">Keine offenen Aufgaben.</p>
      ) : (
        <ul className="divide-y divide-sand-200 dark:divide-salbei-700">
          {liste.daten.map((a) => {
            const ueberfaellig = !a.erledigtAm && a.faelligAm && a.faelligAm < heuteIso();
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-2" data-testid="aufgabe">
                <input type="checkbox" className="size-6 shrink-0 accent-salbei-600" checked={Boolean(a.erledigtAm)} onChange={() => void umschalten(a)} aria-label={`${a.titel} erledigt`} />
                <div className="min-w-0 flex-1">
                  <div className={`font-medium ${a.erledigtAm ? "text-slate-400 line-through" : ""}`}>{a.titel}</div>
                  <div className="flex flex-wrap gap-x-2 text-xs text-slate-500">
                    <span>{a.zustaendigId ? (a.zustaendigId === ich?.id ? "für mich" : `für ${a.zustaendigName}`) : "Team"}</span>
                    {a.faelligAm && <span className={ueberfaellig ? "font-semibold text-tulpe-500" : ""}>· fällig {datum(a.faelligAm)}{ueberfaellig ? " (überfällig)" : ""}</span>}
                    {a.klientinId && !klientinId && <Link to={`/klientinnen/${a.klientinId}`} className="font-medium text-salbei-600">· {a.klientinName} ›</Link>}
                    <span>· von {a.erstelltVonName}</span>
                  </div>
                </div>
                {a.erstelltVon === ich?.id && (
                  <button type="button" className="min-h-9 text-sm text-salbei-600" aria-label={`${a.titel} löschen`} onClick={async () => { if (!confirm(`„${a.titel}“ löschen?`)) return; await api(`/api/aufgaben/${a.id}`, { method: "DELETE" }); await liste.laden(); }}>
                    Löschen
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" className="size-5 accent-salbei-600" checked={erledigte} onChange={(e) => setErledigte(e.target.checked)} />
        Erledigte der letzten 30 Tage zeigen
      </label>
    </div>
  );
}

/** Kasten in der Akte: Aufgaben und Nachrichten zu dieser Familie */
export function TeamKarte({ klientinId }: { klientinId: string }) {
  return (
    <section className="karte mt-6 grid gap-6 lg:grid-cols-2" aria-label="Team">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Aufgaben</h2>
        <AufgabenListe klientinId={klientinId} />
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Team-Nachrichten</h2>
        <NachrichtenListe klientinId={klientinId} kompakt />
      </div>
    </section>
  );
}
