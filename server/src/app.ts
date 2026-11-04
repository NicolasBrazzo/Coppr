import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { healthRouter } from "./health/routes.js";

// Separata da index.ts così i test possono usarla senza aprire una porta
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL ?? "http://localhost:5173", credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use(healthRouter);

  return app;
}
