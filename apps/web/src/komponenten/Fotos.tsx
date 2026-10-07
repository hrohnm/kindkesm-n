import { FOTO_BEREICHE, type FotoBereich } from "@kindkesmoeoen/shared";
import { useRef, useState } from "react";
import { api } from "../lib/api";
import { useDaten } from "../lib/useDaten";
import { Meldung } from "./Formular";

type Foto = { id: string; bereich: FotoBereich; notiz: string | null; kindId: string | null; kindName: string | null; besuchId: string | null; aufgenommenAm: string; erstelltVonName: string };
type Daten = { einwilligung: boolean; schluessel: boolean; fotos: Foto[] };

const datumZeit = (iso: string) => new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Foto verkleinern (längste Seite 1600 px) und als JPEG-Data-URL liefern – das Original bleibt nirgends liegen */
async function verkleinern(datei: File): Promise<string> {
  const url = URL.createObjectURL(datei);
  try {
    const img = new Image();
    await new Promise<void>((ok, fehler) => {
      img.onload = () => ok();
      img.onerror = () => fehler(new Error("Das Bild konnte nicht gelesen werden."));
      img.src = url;
    });
    const faktor = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * faktor));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * faktor));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * M17: Fotos in der Akte (Wundverlauf, Nabel, Haut …) – nur mit Einwilligung, verschlüsselt auf dem Server,
 * nicht in der Galerie des Geräts. Verlauf je Bereich nebeneinander.
 */
export function FotoKarte({ klientinId, kinder, besuchId }: { klientinId: string; kinder: Array<{ id: string; vorname: string }>; besuchId?: string }) {
  const d = useDaten<Daten>(`/api/klientinnen/${klientinId}/fotos`);
  const [bereich, setBereich] = useState<FotoBereich>("nabel");
  const [kindId, setKindId] = useState("");
  const [notiz, setNotiz] = useState("");
  const [filter, setFilter] = useState<FotoBereich | "">("");
  const [gross, setGross] = useState<Foto | null>(null);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string } | null>(null);
  const [laedtHoch, setLaedtHoch] = useState(false);
  const eingabe = useRef<HTMLInputElement>(null);

  const hochladen = async (datei: File | undefined) => {
    if (!datei) return;
    setLaedtHoch(true);
    setMeldung(null);
    try {
      const bild = datei.type === "image/png" && datei.size < 500_000 ? await new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(datei); }) : await verkleinern(datei);
      await api(`/api/klientinnen/${klientinId}/fotos`, { method: "POST", body: { bild, bereich, kindId, besuchId: besuchId ?? null, notiz } });
      setNotiz("");
      setFilter(bereich);
      setMeldung({ art: "ok", text: "Foto gespeichert." });
      await d.laden();
    } catch (e) {
      setMeldung({ art: "fehler", text: (e as Error).message });
    } finally {
      setLaedtHoch(false);
      if (eingabe.current) eingabe.current.value = "";
    }
  };

  const fotos = d.daten?.fotos ?? [];
  const bereiche = [...new Set(fotos.map((f) => f.bereich))];
  const sichtbar = filter ? fotos.filter((f) => f.bereich === filter) : fotos;

  return (
    <section className="karte mt-6" aria-labelledby="fotos-titel">
      <h2 id="fotos-titel" className="mb-1 text-lg font-semibold">Fotos</h2>
      <p className="mb-3 text-sm text-slate-500">Verschlüsselt in der Praxis-App gespeichert, nicht in der Galerie des Geräts.</p>
      {meldung && <Meldung art={meldung.art}>{meldung.text}</Meldung>}
      {!d.daten ? null : !d.daten.schluessel ? (
        <Meldung art="hinweis">Fotos sind auf diesem Server nicht eingerichtet (FOTO_SCHLUESSEL fehlt).</Meldung>
      ) : !d.daten.einwilligung ? (
        <div className="space-y-3">
          <Meldung art="hinweis">
            {fotos.length ? "Die Einwilligung für Fotos wurde widerrufen – die Fotos sind gesperrt und sollten gelöscht werden." : "Fotos nur mit Einwilligung – bitte unter „Einwilligungen“ erfassen."}
          </Meldung>
          {fotos.length > 0 && (
            <button
              type="button"
              className="knopf-sekundaer"
              onClick={async () => {
                if (!confirm(`Alle ${fotos.length} Fotos dieser Akte endgültig löschen?`)) return;
                await api(`/api/klientinnen/${klientinId}/fotos`, { method: "DELETE" });
                await d.laden();
              }}
            >
              Alle {fotos.length} Fotos löschen
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="etikett">Bereich</span>
              <select className="feld w-auto" aria-label="Bereich" value={bereich} onChange={(e) => setBereich(e.target.value as FotoBereich)}>
                {Object.entries(FOTO_BEREICHE).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            {kinder.length > 0 && (
              <label className="block">
                <span className="etikett">Kind</span>
                <select className="feld w-auto" aria-label="Kind" value={kindId} onChange={(e) => setKindId(e.target.value)}>
                  <option value="">Mutter</option>
                  {kinder.map((k) => <option key={k.id} value={k.id}>{k.vorname}</option>)}
                </select>
              </label>
            )}
            <label className="block min-w-48 flex-1">
              <span className="etikett">Notiz (optional)</span>
              <input className="feld" maxLength={300} value={notiz} onChange={(e) => setNotiz(e.target.value)} />
            </label>
            <label className={`knopf-primaer cursor-pointer ${laedtHoch ? "pointer-events-none opacity-60" : ""}`}>
              {laedtHoch ? "Wird gespeichert …" : "Foto aufnehmen"}
              {/* capture: Kamera direkt öffnen – das Bild landet nicht in der Galerie */}
              <input ref={eingabe} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Foto aufnehmen" onChange={(e) => void hochladen(e.target.files?.[0])} />
            </label>
          </div>
          {fotos.length > 0 && (
            <>
              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Bereich filtern">
                <button type="button" aria-pressed={filter === ""} onClick={() => setFilter("")} className={`min-h-10 rounded-full px-4 text-sm font-medium ${filter === "" ? "bg-salbei-600 text-white" : "border border-sand-200 bg-white dark:border-salbei-700 dark:bg-salbei-900/40"}`}>Alle ({fotos.length})</button>
                {bereiche.map((b) => (
                  <button key={b} type="button" aria-pressed={filter === b} onClick={() => setFilter(b)} className={`min-h-10 rounded-full px-4 text-sm font-medium ${filter === b ? "bg-salbei-600 text-white" : "border border-sand-200 bg-white dark:border-salbei-700 dark:bg-salbei-900/40"}`}>
                    {FOTO_BEREICHE[b]} ({fotos.filter((f) => f.bereich === b).length})
                  </button>
                ))}
              </div>
              {/* Verlauf: chronologisch nebeneinander */}
              <ol className="mt-3 flex gap-3 overflow-x-auto pb-2" aria-label="Verlauf">
                {sichtbar.map((f) => (
                  <li key={f.id} className="w-44 shrink-0" data-testid="foto">
                    <button type="button" className="block w-full overflow-hidden rounded-xl border border-sand-200 dark:border-salbei-700" onClick={() => setGross(f)} aria-label={`${FOTO_BEREICHE[f.bereich]} vom ${datumZeit(f.aufgenommenAm)} vergrößern`}>
                      <img src={`/api/fotos/${f.id}/bild`} alt="" loading="lazy" className="aspect-square w-full bg-sand-100 object-cover" />
                    </button>
                    <div className="mt-1 text-xs">
                      <div className="font-semibold">{datumZeit(f.aufgenommenAm)}</div>
                      <div className="text-slate-500">{FOTO_BEREICHE[f.bereich]}{f.kindName ? ` · ${f.kindName}` : ""}</div>
                      {f.notiz && <div className="text-slate-600 dark:text-slate-300">{f.notiz}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}
      {gross && (
        <div role="dialog" aria-modal="true" aria-label="Foto" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setGross(null)} onKeyDown={(e) => e.key === "Escape" && setGross(null)}>
          <div className="max-h-full max-w-3xl space-y-2 rounded-2xl bg-white p-3 dark:bg-salbei-900" onClick={(e) => e.stopPropagation()}>
            <img src={`/api/fotos/${gross.id}/bild`} alt={`${FOTO_BEREICHE[gross.bereich]} vom ${datumZeit(gross.aufgenommenAm)}`} className="max-h-[70vh] w-auto rounded-lg" />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{FOTO_BEREICHE[gross.bereich]}</span>
              <span>{datumZeit(gross.aufgenommenAm)} · {gross.erstelltVonName}</span>
              <button
                type="button"
                className="knopf-sekundaer ml-auto min-h-10 px-3"
                onClick={async () => {
                  if (!confirm("Foto endgültig löschen?")) return;
                  await api(`/api/fotos/${gross.id}`, { method: "DELETE" });
                  setGross(null);
                  await d.laden();
                }}
              >
                Löschen
              </button>
              <button type="button" className="knopf-primaer min-h-10 px-3" autoFocus onClick={() => setGross(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
