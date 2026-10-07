import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, istOffline } from "../lib/api";
import { useAuth } from "../lib/auth";
import { aktivMerken, pruefwertMerken, pruefwertPruefen, zuletztAktiv } from "../lib/sperre";

const EREIGNISSE = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/** Verdeckt die App nach der eingestellten Zeit ohne Bedienung (Einstellungen → Sicherheit). */
export function Sperre() {
  const { ich, abmelden } = useAuth();
  const minuten = ich?.sperreMinuten ?? 0;
  const [gesperrt, setGesperrt] = useState(() => minuten > 0 && Date.now() - zuletztAktiv() > minuten * 60_000);
  const gesperrtRef = useRef(gesperrt);
  gesperrtRef.current = gesperrt;

  useEffect(() => {
    if (!minuten) return;
    let gemerkt = 0;
    const aktiv = () => {
      if (gesperrtRef.current) return;
      const jetzt = Date.now();
      // höchstens alle 5 Sekunden schreiben
      if (jetzt - gemerkt > 5000) {
        aktivMerken(jetzt);
        gemerkt = jetzt;
      }
    };
    for (const e of EREIGNISSE) window.addEventListener(e, aktiv, { passive: true });
    aktiv();
    const pruefen = () => {
      if (!gesperrtRef.current && Date.now() - zuletztAktiv() > minuten * 60_000) setGesperrt(true);
    };
    const t = window.setInterval(pruefen, 15_000);
    // Beim Zurückkehren in die App (Tablet aus dem Standby) sofort prüfen
    document.addEventListener("visibilitychange", pruefen);
    return () => {
      for (const e of EREIGNISSE) window.removeEventListener(e, aktiv);
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", pruefen);
    };
  }, [minuten]);

  // Hintergrund während der Sperre unbedienbar und für Vorlesehilfen unsichtbar (Eingaben bleiben erhalten)
  useEffect(() => {
    const inhalt = document.getElementById("app-inhalt");
    if (!inhalt) return;
    inhalt.inert = gesperrt;
    return () => {
      inhalt.inert = false;
    };
  }, [gesperrt]);

  if (!gesperrt || !ich || !minuten) return null;
  return <Sperrbildschirm name={ich.name} benutzerId={ich.id} entsperrt={() => { aktivMerken(); setGesperrt(false); }} abmelden={abmelden} />;
}

function Sperrbildschirm({ name, benutzerId, entsperrt, abmelden }: { name: string; benutzerId: string; entsperrt: () => void; abmelden: () => void }) {
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string>();
  const [laeuft, setLaeuft] = useState(false);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setLaeuft(true);
    setFehler(undefined);
    try {
      await api("/api/auth/entsperren", { method: "POST", body: { passwort } });
      await pruefwertMerken(passwort, benutzerId);
      entsperrt();
    } catch (err) {
      if (istOffline(err)) {
        const ok = await pruefwertPruefen(passwort, benutzerId);
        if (ok) return entsperrt();
        setFehler(ok === null ? "Ohne Verbindung kann das Passwort auf diesem Gerät nicht geprüft werden." : "Das Passwort ist falsch.");
      } else {
        // 401 (Sitzung beendet, z. B. Gerät abgemeldet) meldet api() selbst ab
        setFehler((err as Error).message);
      }
    } finally {
      setLaeuft(false);
      setPasswort("");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-sand-100/95 px-4 backdrop-blur-md dark:bg-salbei-900/95" role="dialog" aria-modal="true" aria-labelledby="sperre-titel">
      <form onSubmit={absenden} className="karte w-full max-w-sm space-y-4 p-8 text-center">
        <img src="/logo.png" alt="" className="mx-auto size-16" />
        <h1 id="sperre-titel" className="text-xl font-semibold">Gesperrt</h1>
        <p className="text-slate-600 dark:text-slate-300">{name}, zum Weiterarbeiten bitte das Passwort eingeben.</p>
        {fehler && <p className="rounded-xl bg-tulpe-100 p-3 text-sm text-tulpe-500" role="alert">{fehler}</p>}
        <label className="block text-left">
          <span className="etikett">Passwort</span>
          <input className="feld" type="password" autoComplete="current-password" autoFocus value={passwort} onChange={(e) => setPasswort(e.target.value)} required />
        </label>
        <button className="knopf-primaer w-full" disabled={laeuft}>{laeuft ? "Prüfen …" : "Entsperren"}</button>
        <button type="button" className="text-sm text-slate-500 underline" onClick={abmelden}>Abmelden</button>
      </form>
    </div>
  );
}
