import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL mancante: copia .env.example in .env");

export const db = drizzle(url, { schema });
