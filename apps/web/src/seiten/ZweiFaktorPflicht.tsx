import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Einrichten, Wiederherstellungscodes } from "./einstellungen/Sicherheit";

/** Ist die Zwei-Faktor-Anmeldung in der Praxis Pflicht, geht es erst nach der Einrichtung weiter. */
export function ZweiFaktorPflicht() {
  const { ich, abmelden, neuLaden } = useAuth();
  const [codes, setCodes] = useState<string[]>();
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="karte w-full max-w-2xl space-y-5 p-8">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="size-14" />
          <div>
            <h1 className="text-2xl font-semibold text-salbei-700 dark:text-salbei-100">Zwei-Faktor-Anmeldung einrichten</h1>
            <p className="text-slate-500">{ich?.name}</p>
          </div>
        </div>
        <p>In der Praxis ist die Anmeldung mit einem zweiten Faktor Pflicht. Du brauchst dafür eine Authenticator-App auf deinem Handy (z. B. Google Authenticator, Microsoft Authenticator, 2FAS oder die Passwörter-App des iPhones).</p>
        {codes ? <Wiederherstellungscodes codes={codes} fertig={() => void neuLaden()} /> : <Einrichten fertig={setCodes} />}
        <button type="button" className="text-sm text-slate-500 underline" onClick={abmelden}>Abmelden</button>
      </div>
    </div>
  );
}
