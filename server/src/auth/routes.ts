import { Router } from "express";
import { currentUser, requireAuth } from "./require-auth.js";

export const meRouter = Router();

meRouter.get("/api/me", requireAuth, (req, res) => {
  const { id, email, name } = currentUser(req);
  res.json({ id, email, name });
});
