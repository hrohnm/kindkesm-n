import { Fragment, useEffect, useMemo, useState } from "react";
import { Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { IconPlus, IconStift } from "../komponenten/Icons";
import { Aenderungen } from "../komponenten/regelwerk/Aenderungen";
import { CsvImport, EigenerPreis, FassungFreigeben, FeiertageBearbeiten, FristBearbeiten, KontingentBearbeiten, KontingentNeu, NeueFassung, PositionBearbeiten, PositionNeu, SelbstzahlerBearbeiten, SelbstzahlerNeu, ZuschlaegeWegegeldBearbeiten } from "../komponenten/regelwerk/Bearbeiten";
import { Testrechner } from "../komponenten/regelwerk/Testrechner";
import { useAuth } from "../lib/auth";
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
const TABS = ["Positionen", "Kontingente", "Zuschläge & Wegegeld", "Feiertage", "Fristen", "Formulare", "Selbstzahler", "Änderungen", "Testrechner"] as const;
type Tab = (typeof TABS)[number];

type Kontingent = { id: string; name: string; positionen: string[]; verhalten_bei_ueberschreitung: string; sonderregeln?: string[]; [k: string]: unknown };
type Frist = { id: string; regel: string; quelle: string; app: string };
type Formular = { titel: string; zeilen: number; spalten: Array<{ label: string; gruppen: string[]; eintrag: string; ziffern?: string }> };
type RegelwerkDetail = {
  id: string;
  name: string;
  status: string;
  daten: {
    kontingente: Kontingent[];
    fristen_und_hinweise: Frist[];
    formulare: Record<string, Formular>;
    quelle: { hinweis: string };
    zuschlaege: { nacht: { von: string; bis: string }; samstag_ab: string; sonntag: boolean; feiertage: boolean };
    wegegeld: { satz_je_km: number; max_km_regel: number; max_km_mit_begruendung: number; hin_und_rueckweg?: boolean };
    feiertage: Array<{ name: string; regel: string }>;
  };
};

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
  const { ich } = useAuth();
  const darf = ich?.rolle === "hebamme";
  /** gerade bearbeitetes Element (Schlüssel) bzw. Aktion in der Kopfzeile */
  const [bearbeiten, setBearbeiten] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<string>();
  const [testAenderung, setTestAenderung] = useState<string | null>(null);
  const offen = useDaten<{ anzahl: number; aktiveHebammen: number }>("/api/aenderungen/offen/anzahl");
  const vorgeschlagen = () => {
    setBearbeiten(null);
    void selbstzahler.laden();
    setMeldung("Vorschlag gespeichert. Er wird wirksam, sobald eine Kollegin ihn unter „Änderungen“ freigibt.");
    void offen.laden();
  };
  const basis = (schluessel: string) => ({ regelwerkId: id ?? null, abbrechen: () => setBearbeiten(null), fertig: vorgeschlagen, offen: bearbeiten === schluessel });
  const stift = (schluessel: string, label: string) =>
    darf && (
      <button type="button" aria-label={label} className="knopf-sekundaer min-h-11 shrink-0 px-3" onClick={() => { setMeldung(undefined); setBearbeiten(bearbeiten === schluessel ? null : schluessel); }}>
        <IconStift className="size-5" />
      </button>
    );

  useEffect(() => {
    if (!id && liste.daten?.length) setId(liste.daten.at(-1)!.id);
  }, [id, liste.daten]);

  const detail = useDaten<RegelwerkDetail>(id ? `/api/regelwerke/${id}` : null);
  const query = useMemo(() => new URLSearchParams({ ...(suche ? { q: suche } : {}), ...(kategorie ? { kategorie } : {}) }).toString(), [suche, kategorie]);
  const positionen = useDaten<Position[]>(id && tab === "Positionen" ? `/api/regelwerke/${id}/positionen?${query}` : null);
  const selbstzahler = useDaten<Selbstzahler[]>(tab === "Selbstzahler" ? "/api/selbstzahler" : null);

  return (
    <>
      <Seitenkopf titel="Regelwerk" untertitel="Gebührenpositionen, Kontingente, Zuschläge, Wegegeld und Fristen aus dem Hebammenhilfevertrag. Änderungen werden erst nach Freigabe durch eine zweite Hebamme wirksam." />

      <div className="mb-4 flex flex-wrap gap-2">
        {liste.daten?.map((r) => (
          <button key={r.id} type="button" onClick={() => setId(r.id)} className={id === r.id ? "knopf-primaer" : "knopf-sekundaer"}>
            ab {datum(r.gueltigVon)}
            {r.gueltigBis ? ` bis ${datum(r.gueltigBis)}` : " (aktuell)"}
          </button>
        ))}
      </div>
      {detail.daten && (
        <div className="mb-4 space-y-3">
          <Meldung art={detail.daten.status === "aktiv" ? "ok" : "hinweis"}>
            <strong>{detail.daten.status === "aktiv" ? "Fachlich geprüft und freigegeben." : detail.daten.status === "entwurf" ? "Entwurf – noch nicht fachlich freigegeben." : "Archiviert."}</strong> {detail.daten.daten.quelle.hinweis}
          </Meldung>
          {darf && detail.daten.status !== "archiviert" && (
            <div className="flex flex-wrap gap-2">
              {detail.daten.status === "entwurf" && <button type="button" className="knopf-primaer" onClick={() => setBearbeiten("fassung-freigeben")}>Fassung freigeben</button>}
              <button type="button" className="knopf-sekundaer" onClick={() => setBearbeiten("neue-fassung")}><IconPlus className="size-5" /> Neue Fassung</button>
            </div>
          )}
          {bearbeiten === "fassung-freigeben" && <FassungFreigeben {...basis("fassung-freigeben")} name={detail.daten.name} />}
          {bearbeiten === "neue-fassung" && <NeueFassung {...basis("neue-fassung")} name={detail.daten.name} />}
        </div>
      )}
      {meldung && <div className="mb-4"><Meldung art="ok">{meldung}</Meldung></div>}
      {offen.daten && offen.daten.aktiveHebammen < 2 && (
        <div className="mb-4"><Meldung art="hinweis">Zurzeit ist nur eine Hebamme aktiv. Änderungen können vorgeschlagen, aber erst freigegeben werden, wenn eine zweite Hebamme aktiv ist.</Meldung></div>
      )}

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-sand-200 dark:border-salbei-700">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`min-h-12 shrink-0 border-b-2 px-4 font-medium ${tab === t ? "border-salbei-600 text-salbei-700 dark:text-salbei-100" : "border-transparent text-slate-500"}`}>
            {t}
            {t === "Änderungen" && offen.daten?.anzahl ? <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">{offen.daten.anzahl}</span> : null}
          </button>
        ))}
      </div>

      {tab === "Positionen" && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <input className="feld sm:max-w-xs" placeholder="GPOS oder Bezeichnung suchen" value={suche} onChange={(e) => setSuche(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {KATEGORIEN.map((k) => (
                <button key={k.wert} type="button" onClick={() => setKategorie(k.wert)} className={`min-h-12 rounded-full px-4 text-sm font-medium ${kategorie === k.wert ? "bg-salbei-600 text-white" : "bg-white text-slate-600 dark:bg-salbei-900/50 dark:text-slate-300"}`}>
                  {k.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {darf && <button type="button" className="knopf-sekundaer" onClick={() => setBearbeiten(bearbeiten === "pos-neu" ? null : "pos-neu")}><IconPlus className="size-5" /> Neue Position</button>}
            <a className="knopf-sekundaer" href={`/api/regelwerke/${id}/positionen.csv`}>CSV exportieren</a>
            {darf && <button type="button" className="knopf-sekundaer" onClick={() => setBearbeiten(bearbeiten === "pos-csv" ? null : "pos-csv")}>CSV importieren</button>}
          </div>
          {bearbeiten === "pos-neu" && <div className="mb-4"><PositionNeu {...basis("pos-neu")} /></div>}
          {bearbeiten === "pos-csv" && id && <div className="mb-4"><CsvImport {...basis("pos-csv")} url={`/api/regelwerke/${id}/import`} /></div>}
          {!positionen.daten ? (
            <Laden />
          ) : (
            <div className="karte overflow-x-auto p-0">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-sand-50 text-slate-500 dark:bg-salbei-900">
                  <tr>
                    <th className="px-4 py-3">GPOS</th>
                    <th className="px-4 py-3">Bezeichnung</th>
                    <th className="px-4 py-3 text-right">Betrag</th>
                    <th className="px-4 py-3">Formular</th>
                    {darf && <th className="px-2 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {positionen.daten.map((p) => (
                    <Fragment key={p.gpos}>
                    <tr className="border-t border-sand-200 align-top dark:border-salbei-700">
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
                      {darf && <td className="px-2 py-2">{stift(`pos-${p.gpos}`, `GPOS ${p.gpos} bearbeiten`)}</td>}
                    </tr>
                    {bearbeiten === `pos-${p.gpos}` && (
                      <tr>
                        <td colSpan={5} className="px-4 pb-4">
                          <PositionBearbeiten {...basis(`pos-${p.gpos}`)} p={p} fertig={() => { vorgeschlagen(); }} />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-3 text-sm text-slate-500">{positionen.daten.length} Positionen</p>
            </div>
          )}
        </>
      )}

      {tab === "Kontingente" && detail.daten && darf && (
        <div className="mb-4">
          {bearbeiten === "k-neu" ? <KontingentNeu {...basis("k-neu")} /> : <button type="button" className="knopf-sekundaer" onClick={() => setBearbeiten("k-neu")}><IconPlus className="size-5" /> Neues Kontingent</button>}
        </div>
      )}
      {tab === "Kontingente" && detail.daten && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {detail.daten.daten.kontingente.map((k) => (
            <div key={k.id} className="karte">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{k.name}</div>
                {stift(`k-${k.id}`, `Kontingent ${k.id} bearbeiten`)}
              </div>
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
              {bearbeiten === `k-${k.id}` && <div className="mt-3"><KontingentBearbeiten {...basis(`k-${k.id}`)} k={k} /></div>}
            </div>
          ))}
        </div>
      )}

      {tab === "Fristen" && detail.daten && (
        <ul className="space-y-3">
          {detail.daten.daten.fristen_und_hinweise.map((f) => (
            <li key={f.id} className="karte">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{f.regel}</div>
                {stift(`f-${f.id}`, "Frist bearbeiten")}
              </div>
              <div className="mt-1 text-sm text-slate-500">{f.quelle}</div>
              <div className="mt-2 text-sm"><span className="text-slate-500">In der App: </span>{f.app}</div>
              {bearbeiten === `f-${f.id}` && <div className="mt-3"><FristBearbeiten {...basis(`f-${f.id}`)} f={f} /></div>}
            </li>
          ))}
        </ul>
      )}

      {tab === "Formulare" && detail.daten && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
            <div className="mb-4"><Meldung art="hinweis">Beispielpreise (Dummydaten). Umsatzsteuer vor dem Echtbetrieb mit der Steuerberatung klären. Preisänderungen gelten nach Freigabe durch eine zweite Hebamme für die ganze Praxis.</Meldung></div>
            {darf && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="knopf-sekundaer" onClick={() => setBearbeiten(bearbeiten === "sz-neu" ? null : "sz-neu")}><IconPlus className="size-5" /> Neue Leistung</button>
                  <a className="knopf-sekundaer" href="/api/selbstzahler.csv">CSV exportieren</a>
                  <button type="button" className="knopf-sekundaer" onClick={() => setBearbeiten(bearbeiten === "sz-csv" ? null : "sz-csv")}>CSV importieren</button>
                </div>
                {bearbeiten === "sz-neu" && <div className="mt-3"><SelbstzahlerNeu {...basis("sz-neu")} regelwerkId={null} /></div>}
                {bearbeiten === "sz-csv" && <div className="mt-3"><CsvImport {...basis("sz-csv")} regelwerkId={null} url="/api/selbstzahler/import" /></div>}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {selbstzahler.daten.map((s) => (
                <div key={s.id} className={`karte ${s.aktiv ? "" : "opacity-60"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-semibold">{s.bezeichnung}{s.aktiv ? "" : " (nicht angeboten)"}</div>
                    <div className="flex shrink-0 items-start gap-2">
                      <div className="text-lg font-semibold text-salbei-700 dark:text-salbei-100">{euro(s.preis)}</div>
                      {stift(`sz-${s.id}`, `${s.bezeichnung} bearbeiten`)}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">je {s.einheit} · {s.umsatzsteuer.replace(/_/g, " ")}</div>
                  <div className="mt-2 text-sm">{s.rechnungstext}</div>
                  {(s.eigenePreise?.length ?? 0) > 0 && (
                    <div className="mt-2 text-sm text-slate-500">Eigene Preise: {s.eigenePreise!.map((e) => `${e.kuerzel} ${euro(e.preis)}`).join(" · ")}</div>
                  )}
                  {darf && (
                    <button type="button" className="mt-2 min-h-11 text-sm font-medium text-salbei-600" onClick={() => setBearbeiten(bearbeiten === `sz-eigen-${s.id}` ? null : `sz-eigen-${s.id}`)}>
                      {s.meinPreis ? `Mein Preis: ${euro(s.meinPreis)} – ändern` : "Eigenen Preis festlegen"}
                    </button>
                  )}
                  {bearbeiten === `sz-eigen-${s.id}` && ich && <div className="mt-3"><EigenerPreis {...basis(`sz-eigen-${s.id}`)} regelwerkId={null} s={s} hebammeId={ich.id} meinPreis={s.meinPreis ?? null} /></div>}
                  {bearbeiten === `sz-${s.id}` && <div className="mt-3"><SelbstzahlerBearbeiten {...basis(`sz-${s.id}`)} regelwerkId={null} s={s} /></div>}
                </div>
              ))}
            </div>
          </>
        ))}
      {tab === "Zuschläge & Wegegeld" && detail.daten && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="karte">
              <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">Zuschläge</h3>{stift("zw", "Zuschläge und Wegegeld bearbeiten")}</div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-slate-500">Nacht</dt><dd>{detail.daten.daten.zuschlaege.nacht.von}–{detail.daten.daten.zuschlaege.nacht.bis} Uhr</dd>
                <dt className="text-slate-500">Samstag ab</dt><dd>{detail.daten.daten.zuschlaege.samstag_ab} Uhr</dd>
                <dt className="text-slate-500">Sonntag</dt><dd>{detail.daten.daten.zuschlaege.sonntag ? "ja" : "nein"}</dd>
                <dt className="text-slate-500">Feiertage</dt><dd>{detail.daten.daten.zuschlaege.feiertage ? "ja (MV)" : "nein"}</dd>
              </dl>
            </div>
            <div className="karte">
              <h3 className="font-semibold">Wegegeld (§ 11 Anlage 1.1)</h3>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-slate-500">Satz</dt><dd>{euro(detail.daten.daten.wegegeld.satz_je_km)} je km</dd>
                <dt className="text-slate-500">Höchstens</dt><dd>{detail.daten.daten.wegegeld.max_km_regel} km, mit Begründung {detail.daten.daten.wegegeld.max_km_mit_begruendung} km</dd>
                <dt className="text-slate-500">Hin- und Rückweg</dt><dd>{detail.daten.daten.wegegeld.hin_und_rueckweg === false ? "nein (nur Hinweg)" : "ja"}</dd>
              </dl>
            </div>
          </div>
          {bearbeiten === "zw" && <ZuschlaegeWegegeldBearbeiten {...basis("zw")} z={detail.daten.daten.zuschlaege} wg={detail.daten.daten.wegegeld} />}
        </div>
      )}

      {tab === "Feiertage" && detail.daten && (
        <div className="space-y-4">
          <div className="karte">
            <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">Feiertage Mecklenburg-Vorpommern (für Zuschläge)</h3>{stift("ft", "Feiertage bearbeiten")}</div>
            <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {detail.daten.daten.feiertage.map((f) => <li key={f.name} className="flex justify-between gap-3"><span>{f.name}</span><span className="font-mono text-slate-500">{f.regel}</span></li>)}
            </ul>
          </div>
          {bearbeiten === "ft" && <FeiertageBearbeiten {...basis("ft")} liste={detail.daten.daten.feiertage} />}
        </div>
      )}

      {tab === "Änderungen" && id && (
        <Aenderungen regelwerkId={id} testen={(a) => { setTestAenderung(a); setTab("Testrechner"); }} geaendert={() => { void offen.laden(); void detail.laden(); void positionen.laden(); void liste.laden(); }} />
      )}

      {tab === "Testrechner" && id && <Testrechner regelwerkId={id} aenderungId={testAenderung} />}
    </>
  );
}
