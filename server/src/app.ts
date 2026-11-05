import { toNodeHandler } from "better-auth/node";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { auth, frontendUrl } from "./auth.js";
import { meRouter } from "./auth/routes.js";
import { healthRouter } from "./health/routes.js";

// Separata da index.ts così i test possono usarla senza aprire una porta
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: frontendUrl,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    }),
  );

  // Better Auth legge il corpo da solo: va montato PRIMA di express.json().
  // Express 5: il wildcard ha un nome (*splat)
  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(express.json());
  app.use(cookieParser());

  app.use(healthRouter);
  app.use(meRouter);

  return app;
}
