import { appBauen } from "./app";
import { config } from "./config";
import { verbinden } from "./db/client";
import { migrieren } from "./db/migrate";

if (process.env.MIGRATION_BEIM_START !== "nein") await migrieren();

const { db } = verbinden();
const app = await appBauen(db, { logger: true });
await app.listen({ port: config.port, host: config.host });
