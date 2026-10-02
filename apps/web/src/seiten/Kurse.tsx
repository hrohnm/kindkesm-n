import { KASSEN_KURSE, KURS_ARTEN, type KursArt } from "@kindkesmoeoen/shared";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Feld, Laden, Meldung, Seitenkopf } from "../komponenten/Formular";
import { IconPlus } from "../komponenten/Icons";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { datum, euro } from "../lib/format";
import type { TeamMitglied } from "../lib/typen";
import { useDaten } from "../lib/useDaten";
import { useFormular } from "../lib/useFormular";

export type KursDaten = {
  id: string;
  titel: string;
  art: KursArt;
  einzel: boolean;
  abrechnung: "kasse" | "selbstzahler";
  ort: string;
  maxTeilnehmer: number;
  preis: number | null;
  partnerPreis: number | null;
  beschreibung: string | null;
  leitung: string[];
  anmeldungOffen: boolean;
  status: "geplant" | "laufend" | "abgeschlossen" | "abgesagt";
};
type KursListe = KursDaten & { anzahlTermine: number; erster: string | null; letzter: string | null; naechster: { datum: string; von: string } | null; belegt: number; warteliste: number; neuOnline: number };

export const KURS_STATUS: Record<KursDaten["status"], [string, string]> = {
  geplant: ["geplant", "bg-amber-100 text-amber-800"],
  laufend: ["läuft", "bg-salbei-100 text-salbei-700"],
  abgeschlossen: ["abgeschlossen", "bg-sand-200 text-slate-600"],
  abgesagt: ["abgesagt", "bg-tulpe-100 text-tulpe-500"],
};

/** Kursübersicht: laufende und geplante Kurse, auf Wunsch auch vergangene. */
export function Kurse() {
  const [alle, setAlle] = useState(false);
  const [neu, setNeu] = useState(false);
  const liste = useDaten<KursListe[]>(`/api/kurse${alle ? "?alle=1" : ""}`);
  return (
    <>
      <Seitenkopf
        titel="Kurse"
        untertitel="Geburtsvorbereitung, Rückbildung, Babymassage und mehr"
        aktion={
          <button type="button" className="knopf-primaer" onClick={() => setNeu(true)}>
            <IconPlus className="size-5" /> Kurs anlegen
          </button>
        }
      />
      {neu && <KursFormular abbrechen={() => setNeu(false)} />}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2">
          <input type="checkbox" className="size-5 accent-salbei-600" checked={alle} onChange={(e) => setAlle(e.target.checked)} /> Auch abgeschlossene und abgesagte
        </label>
        <a className="ml-auto text-sm font-medium text-salbei-600 underline" href="/anmeldung" target="_blank" rel="noreferrer">Öffentliche Anmeldeseite ›</a>
      </div>
      {!liste.daten ? (
        liste.fehler ? <Meldung art="fehler">{liste.fehler}</Meldung> : <Laden />
      ) : !liste.daten.length ? (
        <p className="text-slate-500">Noch keine Kurse.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {liste.daten.map((k) => (
            <Link key={k.id} to={`/kurse/${k.id}`} className="karte block transition hover:border-salbei-300">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{k.titel}</div>
                  <div className="text-sm text-slate-500">
                    {KURS_ARTEN[k.art]}{k.einzel ? " (Einzel)" : ""} · {k.abrechnung === "kasse" ? "Krankenkasse" : `Selbstzahler${k.preis != null ? ` ${euro(k.preis)}` : ""}`} · {k.ort}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${KURS_STATUS[k.status][1]}`}>{KURS_STATUS[k.status][0]}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>{k.anzahlTermine} Termine{k.erster ? ` · ${datum(k.erster)}–${datum(k.letzter)}` : ""}</span>
                {k.naechster && <span className="font-medium">nächster: {datum(k.naechster.datum)} {k.naechster.von}</span>}
                <span>{k.belegt}/{k.maxTeilnehmer} Plätze{k.warteliste ? ` · ${k.warteliste} Warteliste` : ""}</span>
                {k.neuOnline > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{k.neuOnline} neue Online-Anmeldung{k.neuOnline > 1 ? "en" : ""}</span>}
                {k.anmeldungOffen && <span className="text-salbei-600">online buchbar</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

const leer = (ich: string): Omit<KursDaten, "id"> => ({
  titel: "",
  art: "geburtsvorbereitung",
  einzel: false,
  abrechnung: "kasse",
  ort: "Praxis",
  maxTeilnehmer: 10,
  preis: null,
  partnerPreis: null,
  beschreibung: null,
  leitung: [ich],
  anmeldungOffen: false,
  status: "geplant",
});

/** Kurs anlegen bzw. bearbeiten. */
export function KursFormular({ kurs, abbrechen, fertig }: { kurs?: KursDaten; abbrechen: () => void; fertig?: () => void }) {
  const { ich } = useAuth();
  const navigate = useNavigate();
  const team = useDaten<TeamMitglied[]>("/api/team");
  const f = useFormular<Omit<KursDaten, "id">>(kurs ? (({ id: _id, ...rest }) => rest)(kurs) : leer(ich!.id));
  const w = f.werte;
  const kasseMoeglich = (KASSEN_KURSE as string[]).includes(w.art);
  const zahl = (v: string) => (v === "" ? null : Number(v.replace(",", ".")));

  async function speichern() {
    const daten = { ...w, abrechnung: kasseMoeglich ? w.abrechnung : "selbstzahler", einzel: kasseMoeglich && w.einzel, beschreibung: w.beschreibung || null };
    const ok = await f.speichern(async (x) => {
      const r = await api<KursDaten>(kurs ? `/api/kurse/${kurs.id}` : "/api/kurse", { method: kurs ? "PUT" : "POST", body: { ...x, ...daten } });
      if (!kurs) navigate(`/kurse/${r.id}`);
      return r;
    });
    if (ok && kurs) fertig?.();
  }

  return (
    <section className="karte mb-5 space-y-4">
      <h2 className="text-lg font-semibold">{kurs ? "Kurs bearbeiten" : "Neuer Kurs"}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Feld label="Titel" fehler={f.felder.titel}>
          <input className="feld" value={w.titel} onChange={(e) => f.setze("titel", e.target.value)} placeholder="z. B. Geburtsvorbereitung Wochenende" />
        </Feld>
        <Feld label="Kursart">
          <select className="feld" value={w.art} onChange={(e) => f.setze("art", e.target.value as KursArt)}>
            {(Object.keys(KURS_ARTEN) as KursArt[]).map((a) => <option key={a} value={a}>{KURS_ARTEN[a]}</option>)}
          </select>
        </Feld>
        {kasseMoeglich && (
          <Feld label="Abrechnung">
            <select className="feld" value={w.abrechnung} onChange={(e) => f.setze("abrechnung", e.target.value as "kasse" | "selbstzahler")}>
              <option value="kasse">Krankenkasse (Formular 3.4)</option>
              <option value="selbstzahler">Selbstzahler</option>
            </select>
          </Feld>
        )}
        {kasseMoeglich && w.abrechnung === "kasse" && (
          <label className="flex min-h-12 cursor-pointer items-center gap-3 self-end">
            <input type="checkbox" className="size-6 accent-salbei-600" checked={w.einzel} onChange={(e) => f.setze("einzel", e.target.checked)} />
            Einzelunterweisung (nur mit Begründung)
          </label>
        )}
        <Feld label="Ort">
          <input className="feld" value={w.ort} onChange={(e) => f.setze("ort", e.target.value)} />
        </Feld>
        <Feld label="Plätze" hilfe={w.abrechnung === "kasse" ? "Kassenkurse: höchstens 10 Teilnehmerinnen" : undefined} fehler={f.felder.maxTeilnehmer}>
          <input className="feld" type="number" inputMode="numeric" min={1} max={30} value={w.maxTeilnehmer} onChange={(e) => f.setze("maxTeilnehmer", Number(e.target.value))} />
        </Feld>
        {(w.abrechnung === "selbstzahler" || !kasseMoeglich) && (
          <Feld label="Preis (€)">
            <input className="feld" inputMode="decimal" value={w.preis ?? ""} onChange={(e) => f.setze("preis", zahl(e.target.value))} />
          </Feld>
        )}
        <Feld label="Partnergebühr (€)" hilfe="Optional, z. B. bei Geburtsvorbereitung für Paare">
          <input className="feld" inputMode="decimal" value={w.partnerPreis ?? ""} onChange={(e) => f.setze("partnerPreis", zahl(e.target.value))} />
        </Feld>
      </div>
      <div>
        <span className="etikett">Kursleitung</span>
        <div className="flex flex-wrap gap-2">
          {(team.daten ?? []).filter((t) => t.rolle === "hebamme").map((t) => {
            const an = w.leitung.includes(t.id);
            return (
              <button key={t.id} type="button" aria-pressed={an} onClick={() => f.setze("leitung", an ? w.leitung.filter((x) => x !== t.id) : [...w.leitung, t.id])} className={`min-h-11 rounded-full px-4 text-sm font-medium ${an ? "bg-salbei-600 text-white" : "border border-sand-200 bg-white dark:border-salbei-700 dark:bg-salbei-900/40"}`}>
                {t.name}{t.status === "babypause" ? " (Babypause)" : ""}
              </button>
            );
          })}
        </div>
        {f.felder.leitung && <p className="mt-1 text-sm text-tulpe-500">{f.felder.leitung}</p>}
      </div>
      <Feld label="Beschreibung (auch auf der Anmeldeseite)">
        <textarea className="feld min-h-24" value={w.beschreibung ?? ""} onChange={(e) => f.setze("beschreibung", e.target.value)} maxLength={1000} />
      </Feld>
      <div className="flex flex-wrap gap-4">
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" className="size-6 accent-salbei-600" checked={w.anmeldungOffen} onChange={(e) => f.setze("anmeldungOffen", e.target.checked)} />
          Online-Anmeldung über die Website
        </label>
        {kurs && (
          <Feld label="Status">
            <select className="feld w-auto" value={w.status} onChange={(e) => f.setze("status", e.target.value as KursDaten["status"])}>
              {(Object.keys(KURS_STATUS) as KursDaten["status"][]).map((s) => <option key={s} value={s}>{KURS_STATUS[s][0]}</option>)}
            </select>
          </Feld>
        )}
      </div>
      {f.meldung && <Meldung art={f.meldung.art}>{f.meldung.text}</Meldung>}
      <div className="flex gap-2">
        <button type="button" className="knopf-primaer" disabled={f.speichert} onClick={speichern}>{kurs ? "Speichern" : "Kurs anlegen"}</button>
        <button type="button" className="knopf-sekundaer" onClick={abbrechen}>Abbrechen</button>
      </div>
    </section>
  );
}
