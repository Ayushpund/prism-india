import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getUsage } from '@/lib/cache';
import { loadDemo } from '@/lib/demo';
import { computeGap, summarizeGap, type CityGap, type GapResult } from '@/lib/languageGap';
import { rateLimit } from '@/lib/ratelimit';
import { REGION_BY_ID } from '@/lib/regions';
import { fetchRegion } from '@/lib/serpapi';
import type { RegionData, RegionId } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Cities whose native Google language is not English (the only ones where a language gap exists). */
const GAP_CITIES = ['delhi', 'chennai', 'kolkata', 'hyderabad'] as const;
const LANG_NAME: Record<string, string> = { hi: 'Hindi', ta: 'Tamil', bn: 'Bengali', te: 'Telugu' };

const json = (body: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const schema = z.object({
  query: z.string().trim().min(2, 'Query must be at least 2 characters').max(120),
  cities: z.array(z.enum(GAP_CITIES)).min(1, 'Pick at least one city').max(4),
  demo: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const wait = rateLimit(`gap:${ip}`, 10);
  if (wait) return json({ error: `Rate limit reached. Try again in ${wait}s.` }, 429, { 'retry-after': String(wait) });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.issues.map((i) => i.message).join('; ') }, 400);
  const { query, cities, demo } = parsed.data;

  const names = Object.fromEntries(cities.map((c) => [c, REGION_BY_ID[c].name]));
  const langs = Object.fromEntries(cities.map((c) => [c, LANG_NAME[REGION_BY_ID[c].nativeHl] ?? REGION_BY_ID[c].nativeHl]));
  const before = (await getUsage()).used;
  const gaps: CityGap[] = [];
  const problems: string[] = [];

  if (demo) {
    const [n, e] = await Promise.all([loadDemo(query, 'native'), loadDemo(query, 'english')]);
    if (!n || !e) return json({ error: `No saved language-gap demo for "${query}". Pick one of the sample queries, or turn off Demo Mode (2 credits per city).` }, 404);
    const pick = (r: typeof n, id: RegionId): RegionData | null => {
      const o = r.outcomes.find((x) => (x.ok ? x.data.regionId : x.regionId) === id);
      return o?.ok ? o.data : null;
    };
    for (const id of cities) {
      const a = pick(n, id);
      const b = pick(e, id);
      if (a && b) gaps.push(computeGap(a, b));
      else problems.push(`${names[id]}: no saved data`);
    }
  } else {
    const settled = await Promise.allSettled(
      cities.map(async (id) => {
        const region = REGION_BY_ID[id];
        const [a, b] = await Promise.all([fetchRegion(region, { query, langMode: 'native', includeNews: false }), fetchRegion(region, { query, langMode: 'english', includeNews: false })]);
        return computeGap(a, b);
      }),
    );
    settled.forEach((s, i) => (s.status === 'fulfilled' ? gaps.push(s.value) : problems.push(`${names[cities[i]]}: ${(s.reason as Error).message}`)));
  }
  if (!gaps.length) return json({ error: problems.join('; ') || 'No data.' }, 502);

  const { index, summary } = summarizeGap(gaps, names, langs);
  const result: GapResult & { problems: string[]; names: Record<string, string>; langs: Record<string, string> } = {
    query,
    gaps,
    index,
    summary,
    creditsUsed: demo ? 0 : (await getUsage()).used - before,
    demo,
    createdAt: new Date().toISOString(),
    problems,
    names,
    langs,
  };
  return json(result);
}
