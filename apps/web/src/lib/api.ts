/** Schlanker Fetch-Wrapper für die API (Cookie-Sitzung, JSON, Fehler mit Feldmeldungen). */
export class ApiFehler extends Error {
  constructor(
    public status: number,
    message: string,
    public felder: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function api<T = unknown>(pfad: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(pfad, {
    method: opts.method ?? "GET",
    credentials: "same-origin",
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const daten = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401 && !pfad.endsWith("/anmelden")) window.dispatchEvent(new Event("kk:abgemeldet"));
    const text = res.status === 429 ? "Zu viele Versuche in kurzer Zeit. Bitte einige Minuten warten und dann erneut versuchen." : `Fehler ${res.status}`;
    throw new ApiFehler(res.status, daten?.fehler ?? text, daten?.felder ?? {});
  }
  return daten as T;
}
