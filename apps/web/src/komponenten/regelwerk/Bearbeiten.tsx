import { KONTINGENT_FELDER, KONTINGENT_LABEL, UMSATZSTEUER, UMSATZSTEUER_LABEL, type Operation } from "@kindkesmoeoen/shared";
import { useState } from "react";
import type { Position, Selbstzahler } from "../../lib/typen";
import { Feld } from "../Formular";
import { Vorschlag, geaendert, zahlAus, zahlText } from "./Vorschlag";

type Basis = { regelwerkId: string | null; abbrechen: () => void; fertig: () => void };
type Entwurf = { ops: Operation[]; vorher: Array<Record<string, unknown>>; titel: string } | null;

/** Gemeinsamer Ablauf: Formular → „Weiter“ → Vorschlag mit Titel und Begründung */
function Ablauf({ basis, entwurf, setEntwurf, children }: { basis: Basis; entwurf: Entwurf; setEntwurf: (e: Entwurf) => void; children: React.ReactNode }) {
  if (entwurf) {
    return <Vorschlag regelwerkId={basis.regelwerkId} operationen={entwurf.ops} vorher={entwurf.vorher} titelVorschlag={entwurf.titel} abbrechen={() => setEntwurf(null)} fertig={basis.fertig} />;
  }
  return <div className="space-y-4 rounded-2xl border border-sand-200 bg-sand-50 p-4 dark:border-salbei-700 dark:bg-salbei-900/40">{children}</div>;
}

function Knoepfe({ weiter, abbrechen }: { weiter: () => void; abbrechen: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="knopf-primaer" onClick={weiter}>Weiter</button>
      <button type="button" className="knopf-sekundaer" onClick={abbrechen}>Abbrechen</button>
    </div>
  );
}

// ------------------------------------------------------------------ Gebührenposition
export function PositionBearbeiten({ p, ...basis }: Basis & { p: Position }) {
  const alt = { betrag: p.betrag === null ? null : Number(p.betrag), bezeichnung: p.bezeichnung, kurztext: p.kurztext, formular: p.formular, quittierungspflichtig: p.quittierungspflichtig, hinweis: p.hinweis };
  const [w, setW] = useState({ ...alt, betrag: zahlText(alt.betrag), formular: alt.formular ?? "", hinweis: alt.hinweis ?? "" });
  const [entwurf, setEntwurf] = useState<Entwurf>(null);
  return (
    <Ablauf basis={basis} entwurf={entwurf} setEntwurf={setEntwurf}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Feld label="Betrag (€)"><input className="feld" inputMode="decimal" value={w.betrag} onChange={(e) => setW({ ...w, betrag: e.target.value })} /></Feld>
        <Feld label="Kurztext"><input className="feld" value={w.kurztext} onChange={(e) => setW({ ...w, kurztext: e.target.value })} /></Feld>
        <Feld label="Formular"><input className="feld" value={w.formular} placeholder="z. B. 3.3" onChange={(e) => setW({ ...w, formular: e.target.value })} /></Feld>
        <label className="flex min-h-12 items-center gap-3 self-end">
          <input type="checkbox" className="size-6 accent-salbei-600" checked={w.quittierungspflichtig} onChange={(e) => setW({ ...w, quittierungspflichtig: e.target.checked })} />
          quittierungspflichtig
        </label>
      </div>
      <Feld label="Bezeichnung"><input className="feld" value={w.bezeichnung} onChange={(e) => setW({ ...w, bezeichnung: e.target.value })} /></Feld>
      <Feld label="Hinweis"><input className="feld" value={w.hinweis} onChange={(e) => setW({ ...w, hinweis: e.target.value })} /></Feld>
      <Knoepfe
        abbrechen={basis.abbrechen}
        weiter={() => {
          const felder = geaendert(alt, { ...w, betrag: zahlAus(w.betrag), formular: w.formular.trim() || null, hinweis: w.hinweis.trim() || null });
          setEntwurf({ ops: Object.keys(felder).length ? [{ art: "position", gpos: p.gpos, felder }] : [], vorher: [alt], titel: `GPOS ${p.gpos} ${"betrag" in felder ? "Betrag" : "geändert"}` });
        }}
      />
    </Ablauf>
  );
}

// ------------------------------------------------------------------ Kontingent
export function KontingentBearbeiten({ k, ...basis }: Basis & { k: Record<string, unknown> & { id: string; name: string } }) {
  const vorhanden = KONTINGENT_FELDER.filter((f) => k[f] !== undefined);
  const [w, setW] = useState<Record<string, string>>(Object.fromEntries(KONTINGENT_FELDER.map((f) => [f, typeof k[f] === "number" ? String(k[f]) : ""])));
  const [alle, setAlle] = useState(false);
  const [entwurf, setEntwurf] = useState<Entwurf>(null);
  const felder = alle ? KONTINGENT_FELDER : vorhanden;
  return (
    <Ablauf basis={basis} entwurf={entwurf} setEntwurf={setEntwurf}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {felder.map((f) => (
          <Feld key={f} label={KONTINGENT_LABEL[f]} hilfe={typeof k[f] === "string" ? `bisher: ${String(k[f])}` : undefined}>
            <input className="feld" inputMode="numeric" value={w[f]} onChange={(e) => setW({ ...w, [f]: e.target.value })} placeholder="leer = keine Grenze" />
          </Feld>
        ))}
      </div>
      {!alle && vorhanden.length < KONTINGENT_FELDER.length && (
        <button type="button" className="text-sm font-medium text-salbei-600" onClick={() => setAlle(true)}>Weitere Grenzen hinzufügen</button>
      )}
      <Knoepfe
        abbrechen={basis.abbrechen}
        weiter={() => {
          const neu = Object.fromEntries(felder.map((f) => [f, w[f]!.trim() === "" ? (typeof k[f] === "string" ? k[f] : null) : Number(w[f])]));
          const alt = Object.fromEntries(felder.map((f) => [f, k[f] ?? null]));
          const diff = Object.fromEntries(Object.entries(geaendert(alt, neu)).filter(([, v]) => typeof v !== "string"));
          setEntwurf({ ops: Object.keys(diff).length ? [{ art: "kontingent", id: k.id, felder: diff }] : [], vorher: [alt], titel: `Kontingent ${k.id} angepasst` });
        }}
      />
    </Ablauf>
  );
}

// ------------------------------------------------------------------ Zuschläge und Wegegeld
type Zuschlaege = { nacht: { von: string; bis: string }; samstag_ab: string; sonntag: boolean; feiertage: boolean };
type Wegegeld = { satz_je_km: number; max_km_regel: number; max_km_mit_begruendung: number; hin_und_rueckweg?: boolean };

export function ZuschlaegeWegegeldBearbeiten({ z, wg, ...basis }: Basis & { z: Zuschlaege; wg: Wegegeld }) {
  const altZ = { nacht_von: z.nacht.von, nacht_bis: z.nacht.bis, samstag_ab: z.samstag_ab, sonntag: z.sonntag, feiertage: z.feiertage };
  const altW = { satz_je_km: wg.satz_je_km, max_km_regel: wg.max_km_regel, max_km_mit_begruendung: wg.max_km_mit_begruendung, hin_und_rueckweg: wg.hin_und_rueckweg !== false };
  const [w, setW] = useState({ ...altZ, ...altW, satz_je_km: zahlText(altW.satz_je_km), max_km_regel: String(altW.max_km_regel), max_km_mit_begruendung: String(altW.max_km_mit_begruendung) });
  const [entwurf, setEntwurf] = useState<Entwurf>(null);
  return (
    <Ablauf basis={basis} entwurf={entwurf} setEntwurf={setEntwurf}>
      <h3 className="font-semibold">Zuschläge</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Feld label="Nacht von"><input type="time" className="feld" value={w.nacht_von} onChange={(e) => setW({ ...w, nacht_von: e.target.value })} /></Feld>
        <Feld label="Nacht bis"><input type="time" className="feld" value={w.nacht_bis} onChange={(e) => setW({ ...w, nacht_bis: e.target.value })} /></Feld>
        <Feld label="Samstag ab"><input type="time" className="feld" value={w.samstag_ab} onChange={(e) => setW({ ...w, samstag_ab: e.target.value })} /></Feld>
      </div>
      <div className="flex flex-wrap gap-6">
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="size-6 accent-salbei-600" checked={w.sonntag} onChange={(e) => setW({ ...w, sonntag: e.target.checked })} /> Sonntags</label>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="size-6 accent-salbei-600" checked={w.feiertage} onChange={(e) => setW({ ...w, feiertage: e.target.checked })} /> an Feiertagen</label>
      </div>
      <h3 className="font-semibold">Wegegeld</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Feld label="Satz je km (€)"><input className="feld" inputMode="decimal" value={w.satz_je_km} onChange={(e) => setW({ ...w, satz_je_km: e.target.value })} /></Feld>
        <Feld label="Höchstens km (Regel)"><input className="feld" inputMode="numeric" value={w.max_km_regel} onChange={(e) => setW({ ...w, max_km_regel: e.target.value })} /></Feld>
        <Feld label="Höchstens km mit Begründung"><input className="feld" inputMode="numeric" value={w.max_km_mit_begruendung} onChange={(e) => setW({ ...w, max_km_mit_begruendung: e.target.value })} /></Feld>
      </div>
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="size-6 accent-salbei-600" checked={w.hin_und_rueckweg} onChange={(e) => setW({ ...w, hin_und_rueckweg: e.target.checked })} /> Hin- und Rückweg zählen</label>
      <Knoepfe
        abbrechen={basis.abbrechen}
        weiter={() => {
          const dz = geaendert(altZ, { nacht_von: w.nacht_von, nacht_bis: w.nacht_bis, samstag_ab: w.samstag_ab, sonntag: w.sonntag, feiertage: w.feiertage });
          const dw = geaendert(altW, { satz_je_km: zahlAus(w.satz_je_km) ?? 0, max_km_regel: Number(w.max_km_regel), max_km_mit_begruendung: Number(w.max_km_mit_begruendung), hin_und_rueckweg: w.hin_und_rueckweg });
          const ops: Operation[] = [];
          const vorher: Array<Record<string, unknown>> = [];
          if (Object.keys(dz).length) ops.push({ art: "zuschlaege", felder: dz }), vorher.push(altZ);
          if (Object.keys(dw).length) ops.push({ art: "wegegeld", felder: dw }), vorher.push(altW);
          setEntwurf({ ops, vorher, titel: ops.length === 2 ? "Zuschläge und Wegegeld angepasst" : ops[0]?.art === "wegegeld" ? "Wegegeld angepasst" : "Zuschlagszeiten angepasst" });
        }}
      />
    </Ablauf>
  );
}

// ------------------------------------------------------------------ Feiertage
export function FeiertageBearbeiten({ liste, ...basis }: Basis & { liste: Array<{ name: string; regel: string }> }) {
  const [w, setW] = useState(liste.map((f) => ({ ...f })));
  const [entwurf, setEntwurf] = useState<Entwurf>(null);
  return (
    <Ablauf basis={basis} entwurf={entwurf} setEntwurf={setEntwurf}>
      <p className="text-sm text-slate-500">Regel: fester Tag als MM-TT (z. B. 10-31) oder bewegliche Feiertage relativ zu Ostersonntag (z. B. ostern+39 für Himmelfahrt).</p>
      <ul className="space-y-2">
        {w.map((f, i) => (
          <li key={i} className="flex gap-2">
            <input className="feld" aria-label="Name" value={f.name} onChange={(e) => setW(w.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input className="feld w-36 shrink-0" aria-label="Regel" value={f.regel} onChange={(e) => setW(w.map((x, j) => (j === i ? { ...x, regel: e.target.value } : x)))} />
            <button type="button" className="knopf-gefahr shrink-0 px-3" aria-label="Entfernen" onClick={() => setW(w.filter((_, j) => j !== i))}>✕</button>
          </li>
        ))}
      </ul>
      <button type="button" className="text-sm font-medium text-salbei-600" onClick={() => setW([...w, { name: "", regel: "" }])}>+ Feiertag</button>
      <Knoepfe abbrechen={basis.abbrechen} weiter={() => setEntwurf({ ops: JSON.stringify(w) === JSON.stringify(liste) ? [] : [{ art: "feiertage", liste: w }], vorher: [{ liste }], titel: "Feiertage angepasst" })} />
    </Ablauf>
  );
}

// ------------------------------------------------------------------ Frist
export function FristBearbeiten({ f, ...basis }: Basis & { f: { id: string; regel: string; app: string } }) {
  const [w, setW] = useState({ regel: f.regel, app: f.app });
  const [entwurf, setEntwurf] = useState<Entwurf>(null);
  return (
    <Ablauf basis={basis} entwurf={entwurf} setEntwurf={setEntwurf}>
      <Feld label="Regel"><textarea className="feld min-h-16" value={w.regel} onChange={(e) => setW({ ...w, regel: e.target.value })} /></Feld>
      <Feld label="Umsetzung in der App"><textarea className="feld min-h-16" value={w.app} onChange={(e) => setW({ ...w, app: e.target.value })} /></Feld>
      <Knoepfe
        abbrechen={basis.abbrechen}
        weiter={() => {
          const d = geaendert(f, w);
          setEntwurf({ ops: Object.keys(d).length ? [{ art: "frist", id: f.id, felder: d }] : [], vorher: [{ regel: f.regel, app: f.app }], titel: `Frist „${f.id}“ angepasst` });
        }}
      />
    </Ablauf>
  );
}

// ------------------------------------------------------------------ Selbstzahler
export function SelbstzahlerBearbeiten({ s, ...basis }: Basis & { s: Selbstzahler }) {
  const alt = { preis: Number(s.preis), bezeichnung: s.bezeichnung, rechnungstext: s.rechnungstext, aktiv: s.aktiv };
  const [w, setW] = useState({ ...alt, preis: zahlText(alt.preis) });
  const [entwurf, setEntwurf] = useState<Entwurf>(null);
  return (
    <Ablauf basis={basis} entwurf={entwurf} setEntwurf={setEntwurf}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Feld label="Preis (€)"><input className="feld" inputMode="decimal" value={w.preis} onChange={(e) => setW({ ...w, preis: e.target.value })} /></Feld>
        <div className="sm:col-span-2"><Feld label="Bezeichnung"><input className="feld" value={w.bezeichnung} onChange={(e) => setW({ ...w, bezeichnung: e.target.value })} /></Feld></div>
      </div>
      <Feld label="Rechnungstext"><input className="feld" value={w.rechnungstext} onChange={(e) => setW({ ...w, rechnungstext: e.target.value })} /></Feld>
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="size-6 accent-salbei-600" checked={w.aktiv} onChange={(e) => setW({ ...w, aktiv: e.target.checked })} /> wird angeboten</label>
      <Knoepfe
        abbrechen={basis.abbrechen}
        weiter={() => {
          const d = geaendert(alt, { ...w, preis: zahlAus(w.preis) ?? 0 });
          setEntwurf({ ops: Object.keys(d).length ? [{ art: "selbstzahler", id: s.id, felder: d }] : [], vorher: [alt], titel: `Selbstzahler: ${s.bezeichnung.slice(0, 60)}` });
        }}
      />
    </Ablauf>
  );
}

export function SelbstzahlerNeu(basis: Basis) {
  const [w, setW] = useState({ id: "", bezeichnung: "", rechnungstext: "", einheit: "Termin", preis: "", umsatzsteuer: "kleinunternehmer_19" as (typeof UMSATZSTEUER)[number] });
  const [entwurf, setEntwurf] = useState<Entwurf>(null);
  return (
    <Ablauf basis={basis} entwurf={entwurf} setEntwurf={setEntwurf}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Feld label="Bezeichnung"><input className="feld" value={w.bezeichnung} onChange={(e) => setW({ ...w, bezeichnung: e.target.value, id: w.id || "" })} /></Feld>
        <Feld label="Kennung" hilfe="Kleinbuchstaben und Bindestriche, z. B. trageberatung"><input className="feld" value={w.id} onChange={(e) => setW({ ...w, id: e.target.value })} placeholder={w.bezeichnung.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)} /></Feld>
        <Feld label="Preis (€)"><input className="feld" inputMode="decimal" value={w.preis} onChange={(e) => setW({ ...w, preis: e.target.value })} /></Feld>
        <Feld label="je"><input className="feld" value={w.einheit} onChange={(e) => setW({ ...w, einheit: e.target.value })} /></Feld>
      </div>
      <Feld label="Rechnungstext"><input className="feld" value={w.rechnungstext} onChange={(e) => setW({ ...w, rechnungstext: e.target.value })} /></Feld>
      <Feld label="Umsatzsteuer">
        <select className="feld" value={w.umsatzsteuer} onChange={(e) => setW({ ...w, umsatzsteuer: e.target.value as (typeof UMSATZSTEUER)[number] })}>
          {UMSATZSTEUER.map((u) => <option key={u} value={u}>{UMSATZSTEUER_LABEL[u]}</option>)}
        </select>
      </Feld>
      <Knoepfe
        abbrechen={basis.abbrechen}
        weiter={() => {
          const id = w.id.trim() || w.bezeichnung.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
          setEntwurf({ ops: [{ art: "selbstzahler_neu", id, bezeichnung: w.bezeichnung, rechnungstext: w.rechnungstext || w.bezeichnung, einheit: w.einheit, preis: zahlAus(w.preis) ?? 0, umsatzsteuer: w.umsatzsteuer }], vorher: [{}], titel: `Neue Selbstzahler-Leistung: ${w.bezeichnung}` });
        }}
      />
    </Ablauf>
  );
}

// ------------------------------------------------------------------ Fassung
export function FassungFreigeben(basis: Basis & { name: string }) {
  return <Vorschlag regelwerkId={basis.regelwerkId} operationen={[{ art: "status", status: "aktiv" }]} vorher={[{}]} titelVorschlag={`${basis.name}: fachlich geprüft`} abbrechen={basis.abbrechen} fertig={basis.fertig} />;
}

export function NeueFassung(basis: Basis & { name: string }) {
  const [w, setW] = useState({ gueltigVon: "", name: "", neueId: "" });
  const [entwurf, setEntwurf] = useState<Entwurf>(null);
  return (
    <Ablauf basis={basis} entwurf={entwurf} setEntwurf={setEntwurf}>
      <p className="text-sm text-slate-600 dark:text-slate-300">Kopie von „{basis.name}“ mit allen Positionen, Kontingenten und Regeln, z. B. für eine neue Vergütungsvereinbarung. Besuche ab „gültig ab“ werden danach abgerechnet; ältere Besuche behalten ihre Fassung.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Feld label="Gültig ab"><input type="date" className="feld" value={w.gueltigVon} onChange={(e) => setW({ ...w, gueltigVon: e.target.value, neueId: w.neueId || `hhv-${e.target.value}`, name: w.name || `Hebammenhilfevertrag ab ${e.target.value.split("-").reverse().join(".")}` })} /></Feld>
        <Feld label="Name"><input className="feld" value={w.name} onChange={(e) => setW({ ...w, name: e.target.value })} /></Feld>
        <Feld label="Kennung"><input className="feld" value={w.neueId} onChange={(e) => setW({ ...w, neueId: e.target.value })} /></Feld>
      </div>
      <Knoepfe abbrechen={basis.abbrechen} weiter={() => setEntwurf({ ops: [{ art: "neue_fassung", neueId: w.neueId, name: w.name, gueltigVon: w.gueltigVon }], vorher: [{}], titel: `Neue Fassung ab ${w.gueltigVon.split("-").reverse().join(".")}` })} />
    </Ablauf>
  );
}
