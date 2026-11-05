import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { requireJsonBody, requireSameOrigin } from "./auth/csrf.js";
import { authRouter } from "./auth/routes.js";
import { frontendUrl, isProd } from "./config.js";
import { healthRouter } from "./health/routes.js";

// Mai il corpo della richiesta nei log: può contenere password
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "JSON non valido" });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "Richiesta troppo grande" });
    return;
  }
  console.error("[errore]", err instanceof Error ? err.message : "sconosciuto");
  res.status(500).json({ error: "Errore interno" });
};

// Separata da index.ts così i test possono usarla senza aprire una porta
export function createApp() {
  const app = express();

  // Railway sta davanti con un solo proxy: req.ip deve essere il client, non il proxy
  if (isProd) app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: frontendUrl,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    }),
  );
  app.use(requireSameOrigin);
  app.use(requireJsonBody);
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());

  app.use(healthRouter);
  app.use(authRouter);

  app.use(errorHandler);

  return app;
}
