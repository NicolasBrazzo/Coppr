import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";

export const healthRouter = Router();

// Usata da Railway e dai monitor: 200 se l'app e il database rispondono, 503 altrimenti
healthRouter.get("/health", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "error" });
  }
});
