import { useState, type FormEvent } from "react";
import { Meldung } from "../komponenten/Formular";
import { useAuth } from "../lib/auth";

export function Anmelden() {
  const { anmelden } = useAuth();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string>();
  const [laeuft, setLaeuft] = useState(false);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setLaeuft(true);
    setFehler(undefined);
    try {
      await anmelden(email, passwort);
    } catch (err) {
      setFehler((err as Error).message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <form onSubmit={absenden} className="karte w-full max-w-md space-y-5 p-8">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="size-16" />
          <div>
            <h1 className="text-2xl font-semibold text-salbei-700 dark:text-salbei-100">Kindkesmöön</h1>
            <p className="text-slate-500">Hebammenpraxis Bad Doberan</p>
          </div>
        </div>
        {fehler && <Meldung art="fehler">{fehler}</Meldung>}
        <label className="block">
          <span className="etikett">E-Mail</span>
          <input className="feld" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="block">
          <span className="etikett">Passwort</span>
          <input className="feld" type="password" autoComplete="current-password" value={passwort} onChange={(e) => setPasswort(e.target.value)} required />
        </label>
        <button className="knopf-primaer w-full" disabled={laeuft}>
          {laeuft ? "Anmelden …" : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
