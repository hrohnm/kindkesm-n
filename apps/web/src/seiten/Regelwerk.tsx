import { useEffect, useMemo, useState } from "react";
import { Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { datum, euro } from "../lib/format";
import type { Position, RegelwerkKurz, Selbstzahler } from "../lib/typen";
import { useDaten } from "../lib/useDaten";

const KATEGORIEN = [
  { wert: "", label: "Alle" },
  { wert: "1", label: "Schwangerschaft" },
  { wert: "2", label: "Geburt" },
  { wert: "3", label: "Wochenbett" },
  { wert: "4", label: "Kurse" },
  { wert: "5", label: "Wegegeld" },
  { wert: "6", label: "Material" },
];
const EINHEIT: Record<string, string> = { "5min": "je 5 Min.", pauschal: "pauschal", km: "je km", tatsaechlich: "tatsächlich" };
const TABS = ["Positionen", "Kontingente", "Fristen", "Formulare", "Selbstzahler"] as const;
type Tab = (typeof TABS)[number];

type Kontingent = { id: string; name: string; positionen: string[]; verhalten_bei_ueberschreitung: string; sonderregeln?: string[]; [k: string]: unknown };
type Frist = { id: string; regel: string; quelle: string; app: string };
type Formular = { titel: string; zeilen: number; spalten: Array<{ label: string; gruppen: string[]; eintrag: string; ziffern?: string }> };
type RegelwerkDetail = { id: string; name: string; status: string; daten: { kontingente: Kontingent[]; fristen_und_hinweise: Frist[]; formulare: Record<string, Formular>; quelle: { hinweis: string } } };

const GRENZEN: Array<[string, string]> = [
  ["kontakte_pro_tag", "Kontakte/Tag"],
  ["einheiten_pro_kontakt", "Einheiten/Kontakt"],
  ["einheiten_pro_tag", "Einheiten/Tag"],
  ["kontakte_gesamt", "Kontakte gesamt"],
  ["kontakttage_gesamt", "Kontakttage gesamt"],
  ["einheiten_gesamt", "Einheiten gesamt"],
];

export function Regelwerk() {
  const liste = useDaten<RegelwerkKurz[]>("/api/regelwerke");
  const [id, setId] = useState<string>();
  const [tab, setTab] = useState<Tab>("Positionen");
  const [suche, setSuche] = useState("");
  const [kategorie, setKategorie] = useState("");

  useEffect(() => {
    if (!id && liste.daten?.length) setId(liste.daten.at(-1)!.id);
  }, [id, liste.daten]);

  const detail = useDaten<RegelwerkDetail>(id ? `/api/regelwerke/${id}` : null);
  const query = useMemo(() => new URLSearchParams({ ...(suche ? { q: suche } : {}), ...(kategorie ? { kategorie } : {}) }).toString(), [suche, kategorie]);
  const positionen = useDaten<Position[]>(id && tab === "Positionen" ? `/api/regelwerke/${id}/positionen?${query}` : null);
  const selbstzahler = useDaten<Selbstzahler[]>(tab === "Selbstzahler" ? "/api/selbstzahler" : null);

  return (
    <>
      <Seitenkopf titel="Regelwerk" untertitel="Gebührenpositionen, Kontingente und Fristen aus dem Hebammenhilfevertrag. Bearbeiten mit Vier-Augen-Freigabe folgt in Meilenstein 5." />

      <div className="mb-4 flex flex-wrap gap-2">
        {liste.daten?.map((r) => (
          <button key={r.id} type="button" onClick={() => setId(r.id)} className={id === r.id ? "knopf-primaer" : "knopf-sekundaer"}>
            ab {datum(r.gueltigVon)}
            {r.gueltigBis ? ` bis ${datum(r.gueltigBis)}` : " (aktuell)"}
          </button>
        ))}
      </div>
      {detail.daten && (
        <div className="mb-4">
          <Meldung art="hinweis">
            <strong>Status: {detail.daten.status}.</strong> {detail.daten.daten.quelle.hinweis}
          </Meldung>
        </div>
      )}

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-sand-200 dark:border-meer-700">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`min-h-12 shrink-0 border-b-2 px-4 font-medium ${tab === t ? "border-meer-600 text-meer-700 dark:text-meer-100" : "border-transparent text-slate-500"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Positionen" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <input className="feld sm:max-w-xs" placeholder="GPOS oder Bezeichnung suchen" value={suche} onChange={(e) => setSuche(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {KATEGORIEN.map((k) => (
                <button key={k.wert} type="button" onClick={() => setKategorie(k.wert)} className={`min-h-12 rounded-full px-4 text-sm font-medium ${kategorie === k.wert ? "bg-meer-600 text-white" : "bg-white text-slate-600 dark:bg-meer-900/50 dark:text-slate-300"}`}>
                  {k.label}
                </button>
              ))}
            </div>
          </div>
          {!positionen.daten ? (
            <Laden />
          ) : (
            <div className="karte overflow-x-auto p-0">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-sand-50 text-slate-500 dark:bg-meer-900">
                  <tr>
                    <th className="px-4 py-3">GPOS</th>
                    <th className="px-4 py-3">Bezeichnung</th>
                    <th className="px-4 py-3 text-right">Betrag</th>
                    <th className="px-4 py-3">Formular</th>
                  </tr>
                </thead>
                <tbody>
                  {positionen.daten.map((p) => (
                    <tr key={p.gpos} className="border-t border-sand-200 align-top dark:border-meer-700">
                      <td className="px-4 py-3 font-mono font-medium">{p.gpos}</td>
                      <td className="px-4 py-3">
                        <div>{p.bezeichnung}</div>
                        <div className="text-slate-500">
                          {p.leistungsart}
                          {p.befristetBis ? ` · befristet bis ${datum(p.befristetBis)}` : ""}
                        </div>
                        {p.hinweis && <div className="mt-1 text-slate-500">{p.hinweis}</div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="font-medium">{euro(p.betrag)}</div>
                        <div className="text-slate-500">{EINHEIT[p.einheit] ?? p.einheit}</div>
                      </td>
                      <td className="px-4 py-3">{p.formular ?? (p.quittierungspflichtig ? "–" : <span className="text-slate-500">Datenblatt</span>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-3 text-sm text-slate-500">{positionen.daten.length} Positionen</p>
            </div>
          )}
        </>
      )}

      {tab === "Kontingente" && detail.daten && (
        <div className="grid gap-4 lg:grid-cols-2">
          {detail.daten.daten.kontingente.map((k) => (
            <div key={k.id} className="karte">
              <div className="font-semibold">{k.name}</div>
              <div className="mt-1 font-mono text-sm text-slate-500">{k.positionen.join(", ")}</div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {GRENZEN.filter(([f]) => k[f] !== undefined && k[f] !== null).map(([f, l]) => (
                  <div key={f} className="contents">
                    <dt className="text-slate-500">{l}</dt>
                    <dd>{String(k[f])}</dd>
                  </div>
                ))}
                <dt className="text-slate-500">Bei Überschreitung</dt>
                <dd>{k.verhalten_bei_ueberschreitung === "anordnung" ? "ärztliche Anordnung" : k.verhalten_bei_ueberschreitung}</dd>
              </dl>
              {k.sonderregeln && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">{k.sonderregeln.map((s) => <li key={s}>{s}</li>)}</ul>}
            </div>
          ))}
        </div>
      )}

      {tab === "Fristen" && detail.daten && (
        <ul className="space-y-3">
          {detail.daten.daten.fristen_und_hinweise.map((f) => (
            <li key={f.id} className="karte">
              <div className="font-medium">{f.regel}</div>
              <div className="mt-1 text-sm text-slate-500">{f.quelle}</div>
              <div className="mt-2 text-sm"><span className="text-slate-500">In der App: </span>{f.app}</div>
            </li>
          ))}
        </ul>
      )}

      {tab === "Formulare" && detail.daten && (
        <div className="grid gap-4 lg:grid-cols-2">
          {Object.entries(detail.daten.daten.formulare)
            .filter(([k]) => k !== "gemeinsam")
            .map(([nr, f]) => (
              <div key={nr} className="karte">
                <div className="font-semibold">Formular {nr} – {f.titel}</div>
                <div className="text-sm text-slate-500">{f.zeilen} Leistungszeilen je Blatt</div>
                <ul className="mt-3 space-y-1 text-sm">
                  {f.spalten.map((s) => (
                    <li key={s.label} className="flex justify-between gap-3">
                      <span>{s.label}</span>
                      <span className="shrink-0 font-mono text-slate-500">{s.gruppen.join("/")} · {s.eintrag === "ziffer" ? `Ziffer ${s.ziffern?.split("").join("|")}` : "X"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}

      {tab === "Selbstzahler" &&
        (!selbstzahler.daten ? (
          <Laden />
        ) : (
          <>
            <div className="mb-4"><Meldung art="hinweis">Beispielpreise (Dummydaten). Umsatzsteuer vor dem Echtbetrieb mit der Steuerberatung klären.</Meldung></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {selbstzahler.daten.map((s) => (
                <div key={s.id} className="karte">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-semibold">{s.bezeichnung}</div>
                    <div className="text-lg font-semibold text-meer-700 dark:text-meer-100">{euro(s.preis)}</div>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">je {s.einheit} · {s.umsatzsteuer.replace(/_/g, " ")}</div>
                  <div className="mt-2 text-sm">{s.rechnungstext}</div>
                </div>
              ))}
            </div>
          </>
        ))}
    </>
  );
}
