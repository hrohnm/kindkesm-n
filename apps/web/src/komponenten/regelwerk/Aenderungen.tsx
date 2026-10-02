import { STATUS_AENDERUNG_LABEL } from "@kindkesmoeoen/shared";
import { useState } from "react";
import { api } from "../../lib/api";
import { useDaten } from "../../lib/useDaten";
import { Laden, Meldung } from "../Formular";

export type AenderungZeile = {
  id: string;
  nummer: number;
  regelwerkId: string | null;
  titel: string;
  begruendung: string;
  status: keyof typeof STATUS_AENDERUNG_LABEL;
  von: string;
  erstelltAm: string;
  entschiedenVonName: string | null;
  entschiedenAm: string | null;
  kommentar: string | null;
  zeilen: string[];
  darfFreigeben: boolean;
  darfZurueckziehen: boolean;
};

const FARBE: Record<string, string> = {
  offen: "bg-amber-100 text-amber-800",
  freigegeben: "bg-salbei-100 text-salbei-700",
  abgelehnt: "bg-tulpe-100 text-tulpe-500",
  zurueckgezogen: "bg-sand-100 text-slate-500",
};
const zeit = (iso: string | null) => (iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "");

/** Vorschläge mit Status; Freigeben/Ablehnen nur durch eine andere Hebamme. */
export function Aenderungen({ regelwerkId, testen, geaendert }: { regelwerkId: string; testen: (aenderungId: string) => void; geaendert: () => void }) {
  const [filter, setFilter] = useState<"offen" | "alle">("offen");
  const liste = useDaten<AenderungZeile[]>(`/api/aenderungen${filter === "offen" ? "?status=offen" : ""}`);
  const [ablehnen, setAblehnen] = useState<string | null>(null);
  const [kommentar, setKommentar] = useState("");
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string }>();

  async function aktion(url: string, body?: unknown, ok?: string) {
    setMeldung(undefined);
    try {
      await api(url, { method: "POST", body });
      if (ok) setMeldung({ art: "ok", text: ok });
      setAblehnen(null);
      setKommentar("");
      await liste.laden();
      geaendert();
    } catch (e) {
      setMeldung({ art: "fehler", text: (e as Error).message });
    }
  }

  // Alle Vorschläge zeigen (auch zu anderen Fassungen), damit keiner bei der Freigabe übersehen wird
  const sichtbar = liste.daten ?? [];
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["offen", "alle"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`min-h-11 rounded-full px-4 text-sm font-medium ${filter === f ? "bg-salbei-600 text-white" : "bg-white text-slate-600 dark:bg-salbei-900/50 dark:text-slate-300"}`}>
            {f === "offen" ? "Warten auf Freigabe" : "Verlauf (alle)"}
          </button>
        ))}
      </div>
      {meldung && <Meldung art={meldung.art}>{meldung.text}</Meldung>}
      {!liste.daten ? (
        <Laden />
      ) : sichtbar.length === 0 ? (
        <p className="text-slate-500">{filter === "offen" ? "Keine offenen Vorschläge." : "Noch keine Änderungen."}</p>
      ) : (
        <ul className="space-y-3">
          {sichtbar.map((a) => (
            <li key={a.id} className="karte space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">#{a.nummer} {a.titel}</div>
                  <div className="text-sm text-slate-500">vorgeschlagen von {a.von} am {zeit(a.erstelltAm)}{a.regelwerkId ? (a.regelwerkId === regelwerkId ? "" : ` · Fassung ${a.regelwerkId}`) : " · Selbstzahler-Preisliste"}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${FARBE[a.status]}`}>{STATUS_AENDERUNG_LABEL[a.status]}</span>
              </div>
              <ul className="list-disc pl-5 text-sm">{a.zeilen.map((z) => <li key={z}>{z}</li>)}</ul>
              <p className="text-sm"><span className="text-slate-500">Begründung: </span>{a.begruendung}</p>
              {a.entschiedenVonName && (
                <p className="text-sm text-slate-500">
                  {a.status === "freigegeben" ? "Freigegeben" : "Abgelehnt"} von {a.entschiedenVonName} am {zeit(a.entschiedenAm)}
                  {a.kommentar ? ` – „${a.kommentar}“` : ""}
                </p>
              )}
              {a.status === "offen" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {a.regelwerkId === regelwerkId && <button type="button" className="knopf-sekundaer" onClick={() => testen(a.id)}>Im Testrechner prüfen</button>}
                  {a.darfFreigeben && (
                    <>
                      <button type="button" className="knopf-primaer" onClick={() => confirm(`„${a.titel}“ freigeben? Die Änderung wird sofort wirksam.`) && aktion(`/api/aenderungen/${a.id}/freigeben`, undefined, "Freigegeben – die Änderung ist jetzt wirksam.")}>
                        Freigeben
                      </button>
                      <button type="button" className="knopf-gefahr" onClick={() => setAblehnen(ablehnen === a.id ? null : a.id)}>Ablehnen</button>
                    </>
                  )}
                  {a.darfZurueckziehen && (
                    <>
                      <span className="self-center text-sm text-slate-500">Wartet auf eine Kollegin.</span>
                      <button type="button" className="knopf-sekundaer" onClick={() => aktion(`/api/aenderungen/${a.id}/zurueckziehen`)}>Zurückziehen</button>
                    </>
                  )}
                </div>
              )}
              {ablehnen === a.id && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input className="feld" placeholder="Grund der Ablehnung" value={kommentar} onChange={(e) => setKommentar(e.target.value)} />
                  <button type="button" className="knopf-gefahr shrink-0" onClick={() => aktion(`/api/aenderungen/${a.id}/ablehnen`, { kommentar }, "Abgelehnt.")}>Ablehnen bestätigen</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
