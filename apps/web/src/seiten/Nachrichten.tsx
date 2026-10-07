import { useSearchParams } from "react-router";
import { Seitenkopf } from "../komponenten/Formular";
import { AufgabenListe, NachrichtenListe } from "../komponenten/TeamNachrichten";

/** M20: Team-Nachrichten und Aufgaben (statt WhatsApp und Zettel) */
export function Nachrichten() {
  const [params, setParams] = useSearchParams();
  const ansicht = params.get("ansicht") === "aufgaben" ? "aufgaben" : "nachrichten";
  const reiter = (id: "nachrichten" | "aufgaben", label: string) => (
    <button type="button" role="tab" aria-selected={ansicht === id} onClick={() => setParams(id === "aufgaben" ? { ansicht: id } : {})} className={`min-h-11 rounded-full px-5 font-medium ${ansicht === id ? "bg-salbei-600 text-white" : "bg-white text-slate-600 dark:bg-salbei-900/50 dark:text-slate-300"}`}>
      {label}
    </button>
  );
  return (
    <>
      <Seitenkopf titel="Nachrichten und Aufgaben" untertitel="Absprachen im Team – Gesundheitsdaten bleiben in der Praxis-App statt im Messenger." />
      <div className="mb-4 flex gap-2" role="tablist">
        {reiter("nachrichten", "Nachrichten")}
        {reiter("aufgaben", "Aufgaben")}
      </div>
      <section className="karte max-w-3xl">{ansicht === "aufgaben" ? <AufgabenListe /> : <NachrichtenListe />}</section>
    </>
  );
}
