import { migrate } from "drizzle-orm/postgres-js/migrator";
import { config } from "../config";
import { verbinden } from "./client";

export async function migrieren(url?: string) {
  const { db, sql } = verbinden(url);
  await migrate(db, { migrationsFolder: config.migrationsOrdner });
  await sql.end();
}

// Nur ausführen, wenn diese Datei direkt gestartet wird (nicht, wenn sie in den Server gebündelt ist)
if (/[\\/]migrate\.(ts|js)$/.test(process.argv[1] ?? "")) {
  await migrieren();
  console.log("Datenbank migriert.");
}
