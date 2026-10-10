import { cacheGet, cacheKey, cacheSet, getUsage, recordLiveSearch, MONTHLY_LIMIT } from './cache';
import { hlFor, REGION_BY_ID } from './regions';
import type { AiOverview, AnswerBox, NewsItem, OrganicResult, Region, RegionData, RegionOutcome, SearchRequest } from './types';

const ENDPOINT = 'https://serpapi.com/search.json';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

export class SerpError extends Error {
  constructor(message: string, public kind: 'invalid-location' | 'quota' | 'auth' | 'other' = 'other') {
    super(message);
  }
}

function apiKey(): string {
  const k = process.env.SERPAPI_API_KEY;
  if (!k) throw new SerpError('SERPAPI_API_KEY is not set. Add it to .env.local or use Demo Mode.', 'auth');
  return k;
}

function classify(msg: string): SerpError['kind'] {
  const m = msg.toLowerCase();
  if (m.includes('unsupported') && m.includes('location')) return 'invalid-location';
  if (m.includes('run out of searches') || m.includes('limit')) return 'quota';
  if (m.includes('invalid api key')) return 'auth';
  return 'other';
}

/** Cached, server-side SerpApi call. Only live (non-cached) calls consume credits. */
export async function serpCall(params: Record<string, string>, opts: { ttlMs?: number } = {}): Promise<{ json: Json; cached: boolean }> {
  // google / google_news keys stay backward compatible; other engines also hash their extra params
  const core = new Set(['engine', 'q', 'location', 'hl', 'api_key']);
  const extra = params.engine === 'google' || params.engine === 'google_news' ? undefined : JSON.stringify(Object.entries(params).filter(([k]) => !core.has(k)).sort(([a], [b]) => a.localeCompare(b)));
  const key = cacheKey({ engine: params.engine, q: params.q, location: params.location, hl: params.hl, extra });
  const hit = await cacheGet<Json>(key, opts.ttlMs);
  if (hit) return { json: hit, cached: true };

  const usage = await getUsage();
  if (usage.used >= MONTHLY_LIMIT) throw new SerpError(`Monthly SerpApi budget (${MONTHLY_LIMIT}) reached. Switch to Demo Mode.`, 'quota');

  const url = new URL(ENDPOINT);
  for (const [k, v] of Object.entries({ ...params, api_key: apiKey() })) url.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(40_000), cache: 'no-store' });
  } catch (e) {
    throw new SerpError(`Network error talking to SerpApi: ${(e as Error).message}`);
  }
  await recordLiveSearch();
  let json: Json = {};
  try {
    json = await res.json();
  } catch {
    throw new SerpError(`SerpApi returned non-JSON (HTTP ${res.status})`);
  }
  if (json.error) {
    // "Google hasn't returned any results for this query." is an empty result, not a failure.
    if (/hasn.t returned any results/i.test(json.error)) {
      json = { organic_results: [] };
    } else {
      throw new SerpError(String(json.error), classify(String(json.error)));
    }
  } else if (!res.ok) {
    throw new SerpError(`SerpApi HTTP ${res.status}`);
  }
  // strip metadata (it can echo request details) before caching
  delete json.search_metadata;
  delete json.search_parameters;
  await cacheSet(key, json);
  return { json, cached: false };
}

export function domainOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return link;
  }
}

function parseOrganic(json: Json): OrganicResult[] {
  const list: Json[] = Array.isArray(json.organic_results) ? json.organic_results : [];
  return list
    .filter((r) => r.link && r.title)
    .slice(0, 10)
    .map((r, i) => ({
      position: typeof r.position === 'number' ? r.position : i + 1,
      title: String(r.title),
      link: String(r.link),
      domain: domainOf(String(r.link)),
      snippet: String(r.snippet ?? ''),
    }));
}

function parseAnswerBox(json: Json): AnswerBox | null {
  const a = json.answer_box;
  if (!a) return null;
  const text = a.answer ?? a.snippet ?? a.result ?? (Array.isArray(a.list) ? a.list.join('; ') : '');
  if (!text) return null;
  return { type: String(a.type ?? 'answer'), title: a.title, text: String(text), source: a.link ? domainOf(a.link) : a.displayed_link };
}

function parseAiOverview(json: Json): AiOverview | null {
  const ai = json.ai_overview;
  if (!ai) return null;
  const parts: string[] = [];
  for (const b of ai.text_blocks ?? []) {
    if (b.snippet) parts.push(String(b.snippet));
    for (const li of b.list ?? []) if (li.snippet) parts.push(String(li.snippet));
  }
  const text = parts.join(' ').trim();
  if (!text) return null; // only a page_token (needs a second paid call) - skipped on purpose
  const sources = (ai.references ?? []).filter((r: Json) => r.link).map((r: Json) => ({ title: String(r.title ?? r.source ?? r.link), link: String(r.link) }));
  return { text, sources };
}

function parseNews(googleJson: Json, newsJson: Json | null): NewsItem[] {
  const out: NewsItem[] = [];
  const push = (n: Json) => {
    if (!n?.title) return;
    const source = typeof n.source === 'string' ? n.source : n.source?.name ?? '';
    out.push({ title: String(n.title), source, date: String(n.date ?? ''), link: n.link });
  };
  if (newsJson) {
    for (const n of newsJson.news_results ?? []) {
      if (n.stories) n.stories.forEach(push);
      else push(n);
    }
  }
  if (out.length === 0) for (const n of googleJson.top_stories ?? []) push(n);
  return out.slice(0, 6);
}

export async function fetchRegion(region: Region, req: Pick<SearchRequest, 'query' | 'langMode' | 'includeNews'>): Promise<RegionData> {
  const hl = hlFor(region, req.langMode);
  const warnings: string[] = [];
  const base = { q: req.query, gl: 'in', hl, google_domain: 'google.co.in', num: '10' };

  let g: { json: Json; cached: boolean };
  try {
    g = await serpCall({ engine: 'google', ...base, location: region.location });
  } catch (e) {
    if (e instanceof SerpError && e.kind === 'invalid-location') {
      warnings.push(`Location "${region.location}" rejected by SerpApi; fell back to country-level (India).`);
      g = await serpCall({ engine: 'google', ...base, location: 'India' });
    } else throw e;
  }

  let news: Json | null = null;
  let fromCache = g.cached;
  if (req.includeNews) {
    try {
      // google_news has no `location` parameter; gl/hl localise it.
      const n = await serpCall({ engine: 'google_news', q: req.query, gl: 'in', hl });
      news = n.json;
      fromCache = fromCache && n.cached;
    } catch (e) {
      warnings.push(`News unavailable: ${(e as Error).message}`);
    }
  }

  return {
    regionId: region.id,
    hl,
    organic: parseOrganic(g.json),
    answerBox: parseAnswerBox(g.json),
    aiOverview: parseAiOverview(g.json),
    relatedQuestions: (g.json.related_questions ?? []).map((q: Json) => String(q.question)).filter(Boolean).slice(0, 5),
    news: parseNews(g.json, news),
    fromCache,
    warnings,
  };
}

/** Fetch all regions in parallel; `onRegion` fires as each settles (for streaming progress). */
export async function fetchAllRegions(req: SearchRequest, onRegion?: (o: RegionOutcome) => void): Promise<RegionOutcome[]> {
  const tasks = req.regions.map(async (id): Promise<RegionOutcome> => {
    const region = REGION_BY_ID[id];
    let outcome: RegionOutcome;
    try {
      outcome = { ok: true, data: await fetchRegion(region, req) };
    } catch (e) {
      outcome = { ok: false, regionId: id, hl: hlFor(region, req.langMode), error: (e as Error).message };
    }
    onRegion?.(outcome);
    return outcome;
  });
  const settled = await Promise.allSettled(tasks);
  return settled.map((s, i) =>
    s.status === 'fulfilled' ? s.value : { ok: false as const, regionId: req.regions[i], hl: 'en', error: String(s.reason) },
  );
}
