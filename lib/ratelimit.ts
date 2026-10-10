const hits = new Map<string, number[]>();

/** Sliding-window in-memory limiter. Returns seconds to wait, or 0 if allowed. */
export function rateLimit(ip: string, max = 6, windowMs = 60_000): number {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(ip, recent);
    return Math.ceil((windowMs - (now - recent[0])) / 1000);
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return 0;
}
