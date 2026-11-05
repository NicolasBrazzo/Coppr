import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit.js";

function fakeClock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("rate limiter", () => {
  it("blocca la richiesta oltre il limite e dice quando riprovare", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 5, windowMs: 60_000, now: clock.now });
    for (let i = 0; i < 5; i++) expect(limiter.hit("k")).toEqual({ ok: true });
    clock.advance(20_000);
    expect(limiter.hit("k")).toEqual({ ok: false, retryAfterSec: 40 });
  });

  it("dopo la finestra il conteggio riparte", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });
    expect(limiter.hit("k").ok).toBe(true);
    expect(limiter.hit("k").ok).toBe(false);
    clock.advance(60_000);
    expect(limiter.hit("k").ok).toBe(true);
  });

  it("chiavi diverse sono indipendenti", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });
    expect(limiter.hit("a").ok).toBe(true);
    expect(limiter.hit("b").ok).toBe(true);
    expect(limiter.hit("a").ok).toBe(false);
  });

  it("retryAfterSec è sempre almeno 1", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });
    limiter.hit("k");
    clock.advance(59_999);
    expect(limiter.hit("k")).toEqual({ ok: false, retryAfterSec: 1 });
  });
});
