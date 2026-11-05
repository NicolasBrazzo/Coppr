import type { NextFunction, Request, Response } from "express";

// Limitatore a finestra fissa, in memoria: vale per una sola istanza del server.
// Nel laboratorio post-v1 viene sostituito da Redis (INCR + EXPIRE).

type Options = { limit: number; windowMs: number; now?: () => number };
type Entry = { count: number; resetAt: number };
export type HitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function createRateLimiter({ limit, windowMs, now = Date.now }: Options) {
  const entries = new Map<string, Entry>();

  function prune(at: number) {
    for (const [key, entry] of entries) if (entry.resetAt <= at) entries.delete(key);
  }
  // Pulizia periodica, così la mappa non cresce con chiavi mai più usate.
  // unref(): il timer non tiene vivo il processo (né i test)
  setInterval(() => prune(now()), windowMs).unref();

  function hit(key: string): HitResult {
    const at = now();
    let entry = entries.get(key);
    if (!entry || entry.resetAt <= at) {
      entry = { count: 0, resetAt: at + windowMs };
      entries.set(key, entry);
    }
    entry.count += 1;
    if (entry.count <= limit) return { ok: true };
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - at) / 1000) };
  }

  return { hit, size: () => entries.size };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

export function rateLimit(limiter: RateLimiter, key: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = limiter.hit(key(req));
    if (result.ok) return next();
    res.set("Retry-After", String(result.retryAfterSec));
    res.status(429).json({ error: "Troppi tentativi, riprova tra poco" });
  };
}
