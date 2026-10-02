/** Akte (M2): Merkmale, Kontakte und Einwilligungen. */
import { EINWILLIGUNG_ARTEN, EINWILLIGUNG_FORM, FLAGGEN, KONTAKT_ARTEN, type EinwilligungArt, type Flagge, type KontaktArt } from "@kindkesmoeoen/shared";
import { useState } from "react";
import { api } from "../lib/api";
import { datum } from "../lib/format";
import type { Einwilligung, Klientin, Kontakt } from "../lib/typen";
import { useFormular } from "../lib/useFormular";
import { Feld, Meldung } from "./Formular";
import { IconMuell, IconPlus, IconStift } from "./Icons";
import { UnterschriftFeld } from "./Unterschrift";

const FLAGGEN_FARBE: Record<string, string> = {
  risiko: "bg-tulpe-100 text-tulpe-500",
  sozialdienst: "bg-amber-100 text-amber-800",
  dolmetscherin: "bg-sky-100 text-sky-800",
  psyche: "bg-violet-100 text-violet-800",
  erstgebaerend: "bg-salbei-100 text-salbei-700",
};

/** Kleine Abzeichen für Flaggen (Akte, Liste, Besuch). */
export function FlaggenAbzeichen({ flaggen, sprache }: { flaggen: string[]; sprache?: string | null }) {
  if (!flaggen.length && !sprache) return null;
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {flaggen.map((f) => (
        <span key={f} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${FLAGGEN_FARBE[f] ?? "bg-sand-200 text-slate-600"}`}>{FLAGGEN[f as Flagge] ?? f}</span>
      ))}
      {sprache && <span className="rounded-full bg-sand-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">Sprache: {sprache}</span>}
    </span>
  );
}

export function MerkmaleKarte({ klientin, neuLaden }: { klientin: Klientin; neuLaden: () => Promise<void> }) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const f = useFormular({ flaggen: klientin.flaggen, sprache: klientin.sprache ?? "", allergien: klientin.allergien ?? "" });
  return (
    <section className="karte">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Merkmale</h2>
        <button type="button" className="knopf-sekundaer min-h-11 px-3" onClick={() => setBearbeiten((v) => !v)}><IconStift className="size-5" /> {bearbeiten ? "Schließen" : "Bearbeiten"}</button>
      </div>
      {!bearbeiten ? (
        <div className="space-y-2 text-sm">
          {klientin.flaggen.length || klientin.sprache ? <FlaggenAbzeichen flaggen={klientin.flaggen} sprache={klientin.sprache} /> : <p className="text-slate-500">Keine Merkmale erfasst.</p>}
          <p><span className="text-slate-500">Allergien: </span>{klientin.allergien ? <strong className="text-tulpe-500">{klientin.allergien}</strong> : "keine bekannt"}</p>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await f.speichern((w) => api(`/api/klientinnen/${klientin.id}/merkmale`, { method: "PUT", body: w }))) {
              setBearbeiten(false);
              await neuLaden();
            }
          }}
        >
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FLAGGEN) as Flagge[]).map((fl) => {
              const an = f.werte.flaggen.includes(fl);
              return (
                <button key={fl} type="button" aria-pressed={an} onClick={() => f.setze("flaggen", an ? f.werte.flaggen.filter((x) => x !== fl) : [...f.werte.flaggen, fl])} className={`min-h-11 rounded-full px-4 text-sm font-medium ${an ? "bg-salbei-600 text-white" : "border border-sand-200 bg-white dark:border-salbei-700 dark:bg-salbei-900/40"}`}>
                  {FLAGGEN[fl]}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Feld label="Sprache (falls nicht Deutsch)" fehler={f.felder.sprache}><input className="feld" value={f.werte.sprache} onChange={(e) => f.setze("sprache", e.target.value)} /></Feld>
            <Feld label="Allergien" fehler={f.felder.allergien}><input className="feld" value={f.werte.allergien} onChange={(e) => f.setze("allergien", e.target.value)} placeholder="z. B. Penicillin, Latex" /></Feld>
          </div>
          {f.meldung?.art === "fehler" && <Meldung art="fehler">{f.meldung.text}</Meldung>}
          <button className="knopf-primaer" disabled={f.speichert}>Speichern</button>
        </form>
      )}
    </section>
  );
}

const leerKontakt = { art: "partner" as KontaktArt, name: "", telefon: "", email: "", anschrift: "", notiz: "" };

export function KontakteKarte({ klientin, neuLaden }: { klientin: Klientin; neuLaden: () => Promise<void> }) {
  const [form, setForm] = useState<Kontakt | "neu" | null>(null);
  return (
    <section className="karte">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kontakte</h2>
        <button type="button" className="knopf-sekundaer min-h-11 px-3" onClick={() => setForm(form ? null : "neu")}><IconPlus className="size-5" /> Kontakt</button>
      </div>
      {form && <KontaktFormular klientinId={klientin.id} kontakt={form === "neu" ? undefined : form} fertig={async () => { setForm(null); await neuLaden(); }} abbrechen={() => setForm(null)} />}
      {!klientin.kontakte.length && !form && <p className="text-sm text-slate-500">Noch keine Kontakte (z. B. Partner, Gynäkologin, Kinderärztin, Klinik).</p>}
      <ul className="divide-y divide-sand-200 dark:divide-salbei-700">
        {klientin.kontakte.map((k) => (
          <li key={k.id} className="flex items-start gap-3 py-2" data-testid="kontakt">
            <div className="min-w-0 flex-1 text-sm">
              <div className="text-xs text-slate-500">{KONTAKT_ARTEN[k.art as KontaktArt] ?? k.art}</div>
              <div className="font-medium">{k.name}</div>
              <div className="flex flex-wrap gap-x-3">
                {k.telefon && <a className="text-salbei-600 underline" href={`tel:${k.telefon.replace(/\s/g, "")}`}>{k.telefon}</a>}
                {k.email && <a className="text-salbei-600 underline" href={`mailto:${k.email}`}>{k.email}</a>}
                {k.anschrift && <span className="text-slate-500">{k.anschrift}</span>}
              </div>
              {k.notiz && <div className="text-slate-500">{k.notiz}</div>}
            </div>
            <button type="button" className="knopf-sekundaer min-h-10 px-2" aria-label={`${k.name} bearbeiten`} onClick={() => setForm(k)}><IconStift className="size-4" /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function KontaktFormular({ klientinId, kontakt, fertig, abbrechen }: { klientinId: string; kontakt?: Kontakt; fertig: () => Promise<void>; abbrechen: () => void }) {
  const f = useFormular(kontakt ? { art: kontakt.art as KontaktArt, name: kontakt.name, telefon: kontakt.telefon ?? "", email: kontakt.email ?? "", anschrift: kontakt.anschrift ?? "", notiz: kontakt.notiz ?? "" } : leerKontakt);
  return (
    <form
      className="mb-3 space-y-3 rounded-xl bg-sand-50 p-3 dark:bg-salbei-900/40"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await f.speichern((w) => api(kontakt ? `/api/kontakte/${kontakt.id}` : `/api/klientinnen/${klientinId}/kontakte`, { method: kontakt ? "PUT" : "POST", body: w }))) await fertig();
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Feld label="Art">
          <select className="feld" value={f.werte.art} onChange={(e) => f.setze("art", e.target.value as KontaktArt)}>
            {(Object.keys(KONTAKT_ARTEN) as KontaktArt[]).map((a) => <option key={a} value={a}>{KONTAKT_ARTEN[a]}</option>)}
          </select>
        </Feld>
        <Feld label="Name" fehler={f.felder.name}><input className="feld" value={f.werte.name} onChange={(e) => f.setze("name", e.target.value)} /></Feld>
        <Feld label="Telefon"><input className="feld" inputMode="tel" value={f.werte.telefon} onChange={(e) => f.setze("telefon", e.target.value)} /></Feld>
        <Feld label="E-Mail" fehler={f.felder.email}><input className="feld" type="email" value={f.werte.email} onChange={(e) => f.setze("email", e.target.value)} /></Feld>
        <Feld label="Anschrift"><input className="feld" value={f.werte.anschrift} onChange={(e) => f.setze("anschrift", e.target.value)} /></Feld>
        <Feld label="Notiz"><input className="feld" value={f.werte.notiz} onChange={(e) => f.setze("notiz", e.target.value)} /></Feld>
      </div>
      {f.meldung?.art === "fehler" && <Meldung art="fehler">{f.meldung.text}</Meldung>}
      <div className="flex flex-wrap gap-2">
        <button className="knopf-primaer" disabled={f.speichert}>Speichern</button>
        <button type="button" className="knopf-sekundaer" onClick={abbrechen}>Abbrechen</button>
        {kontakt && (
          <button type="button" className="knopf-gefahr ml-auto px-3" aria-label="Kontakt löschen" onClick={async () => confirm(`Kontakt „${kontakt.name}“ löschen?`) && (await api(`/api/kontakte/${kontakt.id}`, { method: "DELETE" }), await fertig())}>
            <IconMuell className="size-5" />
          </button>
        )}
      </div>
    </form>
  );
}

const heute = () => new Date().toISOString().slice(0, 10);

export function EinwilligungenKarte({ klientin, neuLaden }: { klientin: Klientin; neuLaden: () => Promise<void> }) {
  const [offen, setOffen] = useState<EinwilligungArt | null>(null);
  return (
    <section className="karte">
      <h2 className="mb-1 text-lg font-semibold">Einwilligungen</h2>
      <p className="mb-3 text-sm text-slate-500">Jede Erteilung und jeder Widerruf wird mit Datum und Person protokolliert.</p>
      <ul className="divide-y divide-sand-200 dark:divide-salbei-700">
        {(Object.keys(EINWILLIGUNG_ARTEN) as EinwilligungArt[]).map((art) => {
          const e = klientin.einwilligungen.find((x) => x.art === art);
          return (
            <li key={art} className="py-2" data-testid="einwilligung">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 font-medium">{EINWILLIGUNG_ARTEN[art].titel}</span>
                <EinwilligungStatus e={e} />
                <button type="button" className="knopf-sekundaer min-h-10 px-3 text-sm" onClick={() => setOffen(offen === art ? null : art)}>{offen === art ? "Schließen" : e?.erteilt ? "Ändern" : "Erfassen"}</button>
              </div>
              {offen === art && <EinwilligungFormular klientinId={klientin.id} art={art} e={e} fertig={async () => { setOffen(null); await neuLaden(); }} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EinwilligungStatus({ e }: { e?: Einwilligung }) {
  if (!e) return <span className="rounded-full bg-sand-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">nicht erfasst</span>;
  if (!e.erteilt) return <span className="rounded-full bg-tulpe-100 px-2.5 py-0.5 text-xs font-medium text-tulpe-500">{e.widerrufenAm ? `widerrufen ${datum(e.widerrufenAm)}` : "nicht erteilt"}</span>;
  return <span className="rounded-full bg-salbei-100 px-2.5 py-0.5 text-xs font-medium text-salbei-700">✓ erteilt {datum(e.datum)} · {EINWILLIGUNG_FORM[e.form]}</span>;
}

function EinwilligungFormular({ klientinId, art, e, fertig }: { klientinId: string; art: EinwilligungArt; e?: Einwilligung; fertig: () => Promise<void> }) {
  const [form, setForm] = useState<"papier" | "muendlich" | "tablet">(e?.erteilt ? e.form : "papier");
  const [tag, setTag] = useState(heute());
  const [bild, setBild] = useState<string | null>(null);
  const [notiz, setNotiz] = useState(e?.notiz ?? "");
  const [meldung, setMeldung] = useState<string>();
  async function senden(erteilt: boolean) {
    setMeldung(undefined);
    try {
      await api(`/api/klientinnen/${klientinId}/einwilligungen/${art}`, { method: "PUT", body: { erteilt, form, datum: tag, notiz, unterschrift: erteilt && form === "tablet" && bild ? { bild, zeitpunkt: new Date().toISOString() } : null } });
      await fertig();
    } catch (err) {
      setMeldung((err as Error).message);
    }
  }
  return (
    <div className="mt-2 space-y-3 rounded-xl bg-sand-50 p-3 dark:bg-salbei-900/40">
      <p className="text-sm">{EINWILLIGUNG_ARTEN[art].text}</p>
      {e?.unterschrift && <img src={e.unterschrift.bild} alt="Unterschrift zur Einwilligung" className="h-14 rounded border border-sand-200 bg-white" />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Feld label="Form">
          <select className="feld" value={form} onChange={(ev) => setForm(ev.target.value as typeof form)}>
            {Object.entries(EINWILLIGUNG_FORM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        <Feld label="Datum"><input className="feld" type="date" value={tag} onChange={(ev) => setTag(ev.target.value)} /></Feld>
      </div>
      {form === "tablet" && <UnterschriftFeld aendern={setBild} />}
      <Feld label="Notiz (optional)"><input className="feld" value={notiz} onChange={(ev) => setNotiz(ev.target.value)} /></Feld>
      {meldung && <Meldung art="fehler">{meldung}</Meldung>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="knopf-primaer" disabled={form === "tablet" && !bild} onClick={() => senden(true)}>Einwilligung erteilt</button>
        {e?.erteilt ? (
          <button type="button" className="knopf-gefahr" onClick={() => confirm("Widerruf mit dem gewählten Datum speichern?") && senden(false)}>Widerrufen</button>
        ) : (
          <button type="button" className="knopf-sekundaer" onClick={() => senden(false)}>Nicht erteilt</button>
        )}
      </div>
    </div>
  );
}
