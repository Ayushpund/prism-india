import { normalizeUrl } from './analysis';
import { classify, TRUST_META, trustOf, type TrustCat, type TrustProfile } from './trust';
import type { RegionData, RegionId } from './types';

export const GAP_FORMULA =
  'Language Gap = 100 × (0.50·page difference + 0.30·domain difference + 0.20·authority shortfall). ' +
  'Page/domain difference = 1 − Jaccard overlap between the same city’s native-language and English top 10. ' +
  'Authority shortfall = how many trust points the native-language results lose versus English, divided by 40 (capped at 1; 0 if native is better).';

export interface GapItem {
  title: string;
  link: string;
  domain: string;
  category: TrustCat;
  rank: number;
}

export interface CityGap {
  regionId: RegionId;
  nativeHl: string;
  urlOverlap: number;
  domainOverlap: number;
  trustNative: TrustProfile;
  trustEnglish: TrustProfile;
  /** english minus native; positive = native-language searchers get less authoritative results */
  trustDelta: number;
  onlyEnglish: GapItem[];
  onlyNative: GapItem[];
  index: number;
  direction: 'worse' | 'better' | 'same';
}

export interface GapResult {
  query: string;
  gaps: CityGap[];
  index: number;
  summary: string;
  creditsUsed: number;
  demo: boolean;
  createdAt: string;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const jac = (a: Set<string>, b: Set<string>) => {
  if (!a.size && !b.size) return 0;
  let i = 0;
  for (const x of a) if (b.has(x)) i++;
  return i / (a.size + b.size - i);
};

const items = (d: RegionData): GapItem[] => d.organic.map((o, i) => ({ title: o.title, link: o.link, domain: o.domain, category: classify(o.domain), rank: i + 1 }));

function pickUnique(from: GapItem[], other: Set<string>, n: number): GapItem[] {
  return from
    .filter((g) => !other.has(normalizeUrl(g.link)))
    .sort((a, b) => TRUST_META[b.category].score - TRUST_META[a.category].score || a.rank - b.rank)
    .slice(0, n);
}

export function computeGap(nat: RegionData, eng: RegionData): CityGap {
  const nItems = items(nat);
  const eItems = items(eng);
  const nUrls = new Set(nItems.map((i) => normalizeUrl(i.link)));
  const eUrls = new Set(eItems.map((i) => normalizeUrl(i.link)));
  const urlOverlap = jac(nUrls, eUrls);
  const domainOverlap = jac(new Set(nItems.map((i) => i.domain.replace(/^www\./, ''))), new Set(eItems.map((i) => i.domain.replace(/^www\./, ''))));
  const trustNative = trustOf(nItems.map((i) => i.domain));
  const trustEnglish = trustOf(eItems.map((i) => i.domain));
  const trustDelta = trustEnglish.score - trustNative.score;
  const index = Math.round(100 * clamp01(0.5 * (1 - urlOverlap) + 0.3 * (1 - domainOverlap) + 0.2 * clamp01(trustDelta / 40)));
  return {
    regionId: nat.regionId,
    nativeHl: nat.hl,
    urlOverlap,
    domainOverlap,
    trustNative,
    trustEnglish,
    trustDelta,
    onlyEnglish: pickUnique(eItems, nUrls, 4),
    onlyNative: pickUnique(nItems, eUrls, 3),
    index,
    direction: trustDelta >= 5 ? 'worse' : trustDelta <= -5 ? 'better' : 'same',
  };
}

export function summarizeGap(gaps: CityGap[], names: Record<string, string>, langs: Record<string, string>): { index: number; summary: string } {
  if (!gaps.length) return { index: 0, summary: '' };
  const index = Math.round(gaps.reduce((s, g) => s + g.index, 0) / gaps.length);
  const worst = [...gaps].sort((a, b) => b.trustDelta - a.trustDelta)[0];
  const diff = Math.round(100 - (gaps.reduce((s, g) => s + g.urlOverlap, 0) / gaps.length) * 100);
  const s1 = `Searching in a local language instead of English changes ${diff}% of the pages people see, on average across ${gaps.length} cities.`;
  const s2 =
    worst.trustDelta >= 5
      ? `${langs[worst.regionId]} searchers in ${names[worst.regionId]} get less authoritative sources: trust ${worst.trustNative.score} vs ${worst.trustEnglish.score} in English, and miss ${worst.onlyEnglish.filter((i) => ['official', 'academic', 'factcheck'].includes(i.category)).length} official, academic or fact-check pages that English searchers see.`
      : `In this query, local-language results are about as authoritative as English ones. The difference is in which pages appear, not their quality.`;
  return { index, summary: `${s1} ${s2}` };
}
