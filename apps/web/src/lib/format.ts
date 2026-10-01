export const datum = (iso: string | null | undefined) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "–";

export const euro = (betrag: string | number | null | undefined) =>
  betrag === null || betrag === undefined ? "–" : Number(betrag).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export const inTagen = (tage: number) => (tage === 0 ? "heute" : tage === 1 ? "morgen" : tage < 0 ? `vor ${-tage} Tagen` : `in ${tage} Tagen`);
