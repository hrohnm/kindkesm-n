interface ImportMetaEnv {
  /** Adresse der Praxis-App (Kurse, Anmeldung), z. B. https://app.hebammen-landkreisrostock.de */
  readonly PUBLIC_APP_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
