import { useState } from "react";
import { Link } from "react-router";
import { Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { api } from "../lib/api";
import { useDaten } from "../lib/useDaten";

type Hebamme = { id: string; name: string; kuerzel: string; status: "aktiv" | "babypause" | "ausgeschieden"; babypauseBis: string | null };
type Eintrag = { id: string; art: "termin" | "kurs" | "abwesenheit" | "rufbereitschaft"; hebammeId: string; datum: string; bisDatum?: string; von?: string; bis?: string; titel: string; ort?: string | null; link?: string; status?: string };
type Daten = { von: string; bis: string; hebammen: Hebamme[]; eintraege: Eintrag[] };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plus = (s: string, tage: number) => {
  const d = new Date(`${s}T12:00:00`);
  d.setDate(d.getDate() + tage);
  return iso(d);
};
const montag = (d = new Date()) => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return iso(x);
};
const tagLabel = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });

const STIL: Record<Eintrag["art"], string> = {
  termin: "border-l-4 border-salbei-500 bg-salbei-50 dark:bg-salbei-900/40",
  kurs: "border-l-4 border-sky-500 bg-sky-50 dark:bg-sky-900/30",
  abwesenheit: "border-l-4 border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100",
  rufbereitschaft: "border-l-4 border-tulpe-500 bg-tulpe-100/60 dark:bg-tulpe-500/20",
};

/** M5: Teamkalender – eine Spalte je Hebamme (Babypause ausgeblendet), Woche für Woche */
export function Kalender() {
  const [start, setStart] = useState(montag());
  const [babypause, setBabypause] = useState(false);
  const d = useDaten<Daten>(`/api/kalender?von=${start}&tage=7`);
  const heute = iso(new Date());
  const tage = Array.from({ length: 7 }, (_, i) => plus(start, i));
  const hebammen = (d.daten?.hebammen ?? []).filter((h) => babypause || h.status !== "babypause");
  const inZelle = (tag: string, hebammeId: string) => (d.daten?.eintraege ?? []).filter((e) => e.hebammeId === hebammeId && e.datum <= tag && (e.bisDatum ?? e.datum) >= tag);
  const spalten = { gridTemplateColumns: `7rem repeat(${Math.max(1, hebammen.length)}, minmax(0, 1fr))` };

  return (
    <>
      <Seitenkopf
        titel="Kalender"
        untertitel="Hausbesuche, Kurse, Abwesenheiten und Rufbereitschaft des Teams"
        aktion={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="knopf-sekundaer min-h-11 px-3" onClick={() => setStart(plus(start, -7))} aria-label="Vorherige Woche">‹</button>
            <button type="button" className="knopf-sekundaer min-h-11 px-3" onClick={() => setStart(montag())}>Diese Woche</button>
            <button type="button" className="knopf-sekundaer min-h-11 px-3" onClick={() => setStart(plus(start, 7))} aria-label="Nächste Woche">›</button>
          </div>
        }
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="font-medium" data-testid="kalender-zeitraum">{tagLabel(tage[0]!)} – {tagLabel(tage[6]!)}</span>
        {(d.daten?.hebammen ?? []).some((h) => h.status === "babypause") && (
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" className="size-5 accent-salbei-600" checked={babypause} onChange={(e) => setBabypause(e.target.checked)} />
            Hebammen in Babypause zeigen
          </label>
        )}
      </div>
      {d.fehler && <Meldung art="fehler">{d.fehler}</Meldung>}
      {!d.daten ? (
        <Laden />
      ) : (
        <div className="karte overflow-x-auto p-0">
          <div className="hidden border-b border-sand-200 md:grid dark:border-salbei-700" style={spalten}>
            <div />
            {hebammen.map((h) => (
              <div key={h.id} className="px-3 py-2 font-semibold">
                {h.name}
                {h.status === "babypause" && <span className="ml-1 text-xs font-normal text-slate-500">(Babypause)</span>}
              </div>
            ))}
          </div>
          {tage.map((tag) => (
            <div key={tag} className={`grid grid-cols-1 border-b border-sand-200 last:border-0 md:[grid-template-columns:var(--spalten)] dark:border-salbei-700 ${tag === heute ? "bg-sand-50 dark:bg-salbei-900/30" : ""}`} style={{ "--spalten": spalten.gridTemplateColumns } as React.CSSProperties} data-testid="kalender-tag">
              <div className={`px-3 py-2 text-sm font-semibold ${tag === heute ? "text-salbei-700 dark:text-salbei-100" : ""}`}>{tagLabel(tag)}{tag === heute && " · heute"}</div>
              {hebammen.map((h) => {
                const liste = inZelle(tag, h.id);
                return (
                  <div key={h.id} className="min-h-12 space-y-1 px-3 py-2" data-testid={`zelle-${h.kuerzel}`}>
                    {liste.length > 0 && <div className="text-xs font-semibold text-slate-500 md:hidden">{h.name}</div>}
                    {liste.map((e) => {
                      const inhalt = (
                        <>
                          {e.von && <span className="block font-semibold tabular-nums">{e.von}{e.bis ? `–${e.bis}` : ""}</span>}
                          <span className={e.status === "erledigt" ? "line-through decoration-1" : ""}>{e.titel}</span>
                          {e.ort && <span className="block text-xs text-slate-500">{e.ort}</span>}
                        </>
                      );
                      return e.link ? (
                        <Link key={e.id} to={e.link} className={`block rounded-lg px-2 py-1 text-sm ${STIL[e.art]}`} data-testid="kalender-eintrag">{inhalt}</Link>
                      ) : (
                        <div key={e.id} className={`rounded-lg px-2 py-1 text-sm ${STIL[e.art]}`} data-testid="kalender-eintrag">{inhalt}</div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      <KalenderAbo />
    </>
  );
}

/** Privates Kalender-Abo (ICS): nur eigene Einträge, Familien nur mit Initialen, keine Gesundheitsdaten */
function KalenderAbo() {
  const stand = useDaten<{ aktiv: boolean }>("/api/ich/kalender-abo");
  const [link, setLink] = useState<string | null>(null);
  const [kopiert, setKopiert] = useState(false);
  const neu = async () => {
    if (stand.daten?.aktiv && !confirm("Neuen Link erzeugen? Der bisherige Link funktioniert dann nicht mehr.")) return;
    const r = await api<{ pfad: string }>("/api/ich/kalender-abo", { method: "POST" });
    setLink(`${location.origin}${r.pfad}`);
    setKopiert(false);
    await stand.laden();
  };
  return (
    <section className="karte mt-6 max-w-3xl space-y-3" aria-labelledby="abo-titel">
      <h2 id="abo-titel" className="text-lg font-semibold">Kalender abonnieren</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Eigene Termine, Kurse, Abwesenheiten und Rufbereitschaft im privaten Kalender (iPhone, Android, Outlook). Familien erscheinen nur mit Initialen, ohne Art des Besuchs, Anschrift oder Notizen. Der Link ist wie ein Passwort – nicht weitergeben.
      </p>
      {link ? (
        <div className="space-y-2">
          <input className="feld font-mono text-sm" readOnly value={link} aria-label="Abo-Link" onFocus={(e) => e.target.select()} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="knopf-primaer" onClick={async () => { await navigator.clipboard?.writeText(link).catch(() => {}); setKopiert(true); }}>{kopiert ? "Kopiert ✓" : "Link kopieren"}</button>
            <a className="knopf-sekundaer" href={link.replace(/^https?:/, "webcal:")}>In Kalender-App öffnen</a>
          </div>
          <p className="text-xs text-slate-500">Der Link wird nur jetzt angezeigt. Die Kalender-App aktualisiert ihn selbst (etwa stündlich).</p>
        </div>
      ) : (
        <p className="text-sm" data-testid="abo-stand">{stand.daten?.aktiv ? "Ein Abo-Link ist eingerichtet." : "Noch kein Abo eingerichtet."}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={link ? "knopf-sekundaer" : "knopf-primaer"} onClick={neu}>{stand.daten?.aktiv ? "Neuen Link erzeugen" : "Abo-Link erzeugen"}</button>
        {stand.daten?.aktiv && (
          <button
            type="button"
            className="knopf-sekundaer"
            onClick={async () => {
              if (!confirm("Abo beenden? Der Link funktioniert dann nicht mehr.")) return;
              await api("/api/ich/kalender-abo", { method: "DELETE" });
              setLink(null);
              await stand.laden();
            }}
          >
            Abo beenden
          </button>
        )}
      </div>
    </section>
  );
}
