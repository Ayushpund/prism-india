import type { Analysis, BlindSpot, PairOverlap, RegionData, RegionDivergence, RegionId, RegionOutcome } from './types';

export const SCORE_WEIGHTS = { urlDistance: 0.4, domainDistance: 0.2, rankDisagreement: 0.15, blindSpotPressure: 0.15, answerDivergence: 0.1 } as const;

export const FORMULA_TEXT =
  'Divergence = 100 × (0.40·URL distance + 0.20·domain distance + 0.15·rank disagreement + 0.15·blind-spot pressure + 0.10·answer divergence). ' +
  'URL/domain distance = 1 − mean pairwise Jaccard. Rank disagreement = mean (1 − Spearman ρ)/2 over shared results (1 when <2 shared). ' +
  'Blind-spot pressure = blind spots ÷ (3 × regions), capped at 1. Answer divergence = share of featured snippets / AI Overviews that differ.';

const TRACKING = /^(utm_.*|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|ref|ref_src|ref_url|source|cmpid|_ga|yclid|srsltid|ved|ei|sa|usg)$/i;

export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const params = [...u.searchParams.entries()].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => a.localeCompare(b));
    const qs = params.length ? '?' + params.map(([k, v]) => `${k}=${v}`).join('&') : '';
    const path = u.pathname.replace(/\/+$/, '');
    return `${host}${path}${qs}`;
  } catch {
    return raw.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');
  }
}

export function normalizeDomain(d: string): string {
  return d.toLowerCase().replace(/^www\./, '');
}

export function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Spearman rho over ranks re-computed within the shared subset. null if fewer than 2 shared. */
export function spearman(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2) return null;
  const rank = (v: number[]) => {
    const order = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
    const r = new Array<number>(n);
    order.forEach(([, i], k) => (r[i] = k + 1));
    return r;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const d2 = rx.reduce((s, x, i) => s + (x - ry[i]) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

const words = (s: string) => new Set(s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2));

/** Fraction of region pairs whose text differs (missing vs present counts as different). 0 if no region has it. */
function textDivergence(texts: (string | null)[]): number {
  if (texts.every((t) => !t)) return 0;
  let pairs = 0;
  let diff = 0;
  for (let i = 0; i < texts.length; i++)
    for (let j = i + 1; j < texts.length; j++) {
      pairs++;
      const a = texts[i];
      const b = texts[j];
      if (!a || !b) diff += a || b ? 1 : 0;
      else if (jaccard(words(a), words(b)) < 0.5) diff++;
    }
  return pairs ? diff / pairs : 0;
}

const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function successful(outcomes: RegionOutcome[]): RegionData[] {
  return outcomes.flatMap((o) => (o.ok ? [o.data] : []));
}

export function analyze(regions: RegionData[]): Analysis | null {
  if (regions.length < 2) return null;
  const ids = regions.map((r) => r.regionId);

  const norm = new Map<RegionId, { url: string; rank: number; title: string; domain: string }[]>();
  for (const r of regions)
    norm.set(r.regionId, r.organic.map((o, i) => ({ url: normalizeUrl(o.link), rank: i + 1, title: o.title, domain: normalizeDomain(o.domain) })));

  const pairs: PairOverlap[] = [];
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const A = norm.get(ids[i])!;
      const B = norm.get(ids[j])!;
      const ua = new Set(A.map((x) => x.url));
      const ub = new Set(B.map((x) => x.url));
      const shared = A.filter((x) => ub.has(x.url));
      const bRank = new Map(B.map((x) => [x.url, x.rank]));
      pairs.push({
        a: ids[i],
        b: ids[j],
        urlJaccard: jaccard(ua, ub),
        domainJaccard: jaccard(new Set(A.map((x) => x.domain)), new Set(B.map((x) => x.domain))),
        rankCorrelation: spearman(shared.map((x) => x.rank), shared.map((x) => bRank.get(x.url)!)),
        sharedUrls: shared.length,
      });
    }

  // unique domains + per-region divergence from consensus
  const domainCount = new Map<string, number>();
  for (const r of regions) for (const d of new Set(norm.get(r.regionId)!.map((x) => x.domain))) domainCount.set(d, (domainCount.get(d) ?? 0) + 1);
  const perRegion: RegionDivergence[] = ids.map((id) => {
    const mine = pairs.filter((p) => p.a === id || p.b === id);
    const sim = mean(mine.map((p) => 0.6 * p.urlJaccard + 0.4 * p.domainJaccard));
    const uniq = [...new Set(norm.get(id)!.map((x) => x.domain))].filter((d) => domainCount.get(d) === 1);
    return { regionId: id, divergence: clamp01(1 - sim), uniqueDomains: uniq };
  });

  // blind spots: ranked top-5 in >=2 regions, absent from another region's top 10
  const byUrl = new Map<string, { title: string; domain: string; ranks: Map<RegionId, number> }>();
  for (const r of regions)
    for (const x of norm.get(r.regionId)!) {
      const e = byUrl.get(x.url) ?? { title: x.title, domain: x.domain, ranks: new Map() };
      e.ranks.set(r.regionId, x.rank);
      byUrl.set(x.url, e);
    }
  const blindSpots: BlindSpot[] = [];
  for (const [url, e] of byUrl) {
    const high = [...e.ranks.entries()].filter(([, rank]) => rank <= 5);
    if (high.length < 2) continue;
    const best = Math.min(...high.map(([, r]) => r));
    for (const id of ids) if (!e.ranks.has(id)) blindSpots.push({ url, title: e.title, domain: e.domain, bestRank: best, rankedIn: [...e.ranks.keys()], missingIn: id });
  }
  blindSpots.sort((a, b) => b.rankedIn.length - a.rankedIn.length || a.bestRank - b.bestRank);

  const snippetVal = textDivergence(regions.map((r) => r.answerBox?.text ?? null));
  const aiVal = textDivergence(regions.map((r) => r.aiOverview?.text ?? null));
  const parts: number[] = [];
  if (regions.some((r) => r.answerBox)) parts.push(snippetVal);
  if (regions.some((r) => r.aiOverview)) parts.push(aiVal);
  const answerValue = mean(parts);

  const rhos = pairs.map((p) => (p.rankCorrelation === null ? 1 : (1 - p.rankCorrelation) / 2));
  const breakdown = {
    urlDistance: 1 - mean(pairs.map((p) => p.urlJaccard)),
    domainDistance: 1 - mean(pairs.map((p) => p.domainJaccard)),
    rankDisagreement: mean(rhos),
    blindSpotPressure: clamp01(blindSpots.length / (3 * ids.length)),
    answerDivergence: answerValue,
  };
  const w = SCORE_WEIGHTS;
  const score = Math.round(
    100 *
      clamp01(
        breakdown.urlDistance * w.urlDistance +
          breakdown.domainDistance * w.domainDistance +
          breakdown.rankDisagreement * w.rankDisagreement +
          breakdown.blindSpotPressure * w.blindSpotPressure +
          breakdown.answerDivergence * w.answerDivergence,
      ),
  );

  const result: Analysis = {
    regions: ids,
    pairs,
    perRegion,
    blindSpots,
    answerDivergence: { snippetDiffers: snippetVal > 0, aiOverviewDiffers: aiVal > 0, value: answerValue },
    score,
    breakdown,
    summary: '',
  };
  result.summary = templateSummary(result);
  return result;
}

export function scoreLabel(score: number): string {
  return score >= 75 ? 'Radically different' : score >= 50 ? 'Strongly different' : score >= 25 ? 'Noticeably different' : 'Mostly the same';
}

export function templateSummary(a: Analysis, names: Record<string, string> = {}): string {
  const n = (id: RegionId) => names[id] ?? id;
  const avgUrl = Math.round(mean(a.pairs.map((p) => p.urlJaccard)) * 100);
  const lowest = [...a.pairs].sort((x, y) => x.urlJaccard - y.urlJaccard)[0];
  const outlier = [...a.perRegion].sort((x, y) => y.divergence - x.divergence)[0];
  const s1 = `Across ${a.regions.length} regions this search scores ${a.score}/100 on divergence (${scoreLabel(a.score).toLowerCase()}), with only ${avgUrl}% average URL overlap.`;
  const s2 = lowest ? `${n(lowest.a)} and ${n(lowest.b)} agree least (${Math.round(lowest.urlJaccard * 100)}% shared URLs), and ${n(outlier.regionId)} sits furthest from the consensus.` : '';
  const s3 = a.blindSpots.length
    ? `${a.blindSpots.length} widely-ranked result${a.blindSpots.length > 1 ? 's' : ''} never reach at least one region's top 10.`
    : 'No widely-ranked result is fully missing from any region.';
  return [s1, s2, s3].filter(Boolean).join(' ');
}

/** Structured-only payload given to the LLM (never raw page text). */
export function insightPayload(a: Analysis, names: Record<string, string>, query: string) {
  const nm = (id: RegionId) => names[id] ?? id;
  return {
    query,
    score: a.score,
    regions: a.regions.map(nm),
    avgUrlOverlapPct: Math.round(mean(a.pairs.map((p) => p.urlJaccard)) * 100),
    leastSimilarPair: [...a.pairs].sort((x, y) => x.urlJaccard - y.urlJaccard).slice(0, 1).map((p) => ({ a: nm(p.a), b: nm(p.b), urlOverlapPct: Math.round(p.urlJaccard * 100) })),
    mostDivergentRegion: [...a.perRegion].sort((x, y) => y.divergence - x.divergence).slice(0, 1).map((r) => ({ region: nm(r.regionId), uniqueDomains: r.uniqueDomains.slice(0, 5) })),
    blindSpotCount: a.blindSpots.length,
    answerBoxDiffers: a.answerDivergence.snippetDiffers,
    aiOverviewDiffers: a.answerDivergence.aiOverviewDiffers,
  };
}

export type GroupedBlindSpot = BlindSpot & { missingAll: RegionId[] };

/** One entry per URL, listing every region it is absent from. */
export function groupBlindSpots(spots: BlindSpot[]): GroupedBlindSpot[] {
  const m = new Map<string, GroupedBlindSpot>();
  for (const s of spots) {
    const g = m.get(s.url);
    if (g) g.missingAll.push(s.missingIn);
    else m.set(s.url, { ...s, missingAll: [s.missingIn] });
  }
  return [...m.values()];
}
