import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { UsageInfo } from './types';

const CACHE_DIR = path.join(process.cwd(), '.cache');
const mem = new Map<string, unknown>();
export const MONTHLY_LIMIT = 250;

export function cacheKey(parts: { engine: string; q: string; location?: string; hl: string; extra?: string }): string {
  const raw = [parts.engine, parts.q.trim().toLowerCase(), parts.location ?? '', parts.hl, ...(parts.extra ? [parts.extra] : [])].join('|');
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

const memTime = new Map<string, number>();

/** Read a cached value. With maxAgeMs, entries older than that are treated as misses (used for fast-changing data like jobs/news). */
export async function cacheGet<T>(key: string, maxAgeMs?: number): Promise<T | null> {
  if (mem.has(key) && (!maxAgeMs || Date.now() - (memTime.get(key) ?? 0) < maxAgeMs)) return mem.get(key) as T;
  try {
    const file = path.join(CACHE_DIR, `${key}.json`);
    const st = await fs.stat(file);
    if (maxAgeMs && Date.now() - st.mtimeMs > maxAgeMs) return null;
    const val = JSON.parse(await fs.readFile(file, 'utf8')) as T;
    mem.set(key, val);
    memTime.set(key, st.mtimeMs);
    return val;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  mem.set(key, value);
  memTime.set(key, Date.now());
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(value));
  } catch {
    /* disk cache is best-effort (e.g. read-only serverless FS) */
  }
}

const month = () => new Date().toISOString().slice(0, 7);
let usageMem: { month: string; used: number } | null = null;

async function loadUsage(): Promise<{ month: string; used: number }> {
  if (usageMem && usageMem.month === month()) return usageMem;
  try {
    const u = JSON.parse(await fs.readFile(path.join(CACHE_DIR, 'usage.json'), 'utf8'));
    if (u.month === month()) return (usageMem = u);
  } catch {
    /* none yet */
  }
  return (usageMem = { month: month(), used: 0 });
}

export async function getUsage(): Promise<UsageInfo> {
  const u = await loadUsage();
  return { used: u.used, limit: MONTHLY_LIMIT, month: u.month };
}

export async function recordLiveSearch(): Promise<void> {
  const u = await loadUsage();
  u.used += 1;
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(CACHE_DIR, 'usage.json'), JSON.stringify(u));
  } catch {
    /* ignore */
  }
}
