import { describe, expect, it } from 'vitest';
import { analyze, jaccard, normalizeUrl, spearman, templateSummary } from '@/lib/analysis';
import type { RegionData, RegionId } from '@/lib/types';

function region(id: RegionId, links: string[], extra: Partial<RegionData> = {}): RegionData {
  return {
    regionId: id,
    hl: 'en',
    organic: links.map((link, i) => ({ position: i + 1, title: `T ${link}`, link, domain: new URL(link).hostname.replace(/^www\./, ''), snippet: '' })),
    answerBox: null,
    aiOverview: null,
    relatedQuestions: [],
    news: [],
    fromCache: false,
    warnings: [],
    ...extra,
  };
}

const L = (d: string, p = '') => `https://${d}/${p}`;
const same = [L('a.com'), L('b.com'), L('c.com'), L('d.com')];

describe('normalizeUrl', () => {
  it('strips tracking params, www, trailing slash, hash', () => {
    expect(normalizeUrl('https://www.Example.com/path/?utm_source=x&fbclid=1&id=5#frag')).toBe('example.com/path?id=5');
    expect(normalizeUrl('http://example.com/path')).toBe('example.com/path');
  });
  it('is stable for malformed input', () => {
    expect(normalizeUrl('not a url/')).toBe('not a url');
  });
});

describe('jaccard & spearman', () => {
  it('jaccard basics', () => {
    expect(jaccard(new Set([1, 2]), new Set([2, 3]))).toBeCloseTo(1 / 3);
    expect(jaccard(new Set(), new Set())).toBe(0);
  });
  it('spearman perfect, reversed, insufficient', () => {
    expect(spearman([1, 2, 3], [1, 2, 3])).toBe(1);
    expect(spearman([1, 2, 3], [3, 2, 1])).toBe(-1);
    expect(spearman([1], [1])).toBeNull();
  });
});

describe('analyze', () => {
  it('returns null with fewer than 2 regions', () => {
    expect(analyze([region('mumbai', same)])).toBeNull();
  });

  it('identical regions score ~0 with no blind spots', () => {
    const a = analyze([region('mumbai', same), region('delhi', same), region('chennai', same)])!;
    expect(a.score).toBe(0);
    expect(a.blindSpots).toHaveLength(0);
    expect(a.pairs.every((p) => p.urlJaccard === 1)).toBe(true);
  });

  it('disjoint regions score high', () => {
    const a = analyze([region('mumbai', same), region('delhi', [L('w.com'), L('x.com'), L('y.com'), L('z.com')])])!;
    expect(a.score).toBeGreaterThanOrEqual(75);
    expect(a.pairs[0].urlJaccard).toBe(0);
    expect(a.perRegion[0].uniqueDomains).toContain('a.com');
  });

  it('treats tracking-param/www variants as the same URL', () => {
    const a = analyze([region('mumbai', ['https://www.a.com/x?utm_source=g']), region('delhi', ['https://a.com/x/'])])!;
    expect(a.pairs[0].urlJaccard).toBe(1);
  });

  it('detects blind spots: ranked high in two regions, missing in a third', () => {
    const shared = L('hot.com', 'page');
    const a = analyze([region('mumbai', [shared, L('a.com')]), region('delhi', [L('b.com'), shared]), region('chennai', [L('c.com'), L('d.com')])])!;
    const bs = a.blindSpots.find((b) => b.domain === 'hot.com');
    expect(bs?.missingIn).toBe('chennai');
    expect(bs?.rankedIn).toEqual(expect.arrayContaining(['mumbai', 'delhi']));
  });

  it('computes rank correlation on shared results', () => {
    const a = analyze([region('mumbai', [L('a.com'), L('b.com'), L('c.com')]), region('delhi', [L('c.com'), L('b.com'), L('a.com')])])!;
    expect(a.pairs[0].rankCorrelation).toBe(-1);
    expect(a.pairs[0].sharedUrls).toBe(3);
  });

  it('flags answer divergence when featured snippets differ or are missing', () => {
    const ab = (text: string) => ({ type: 'x', text });
    const a = analyze([
      region('mumbai', same, { answerBox: ab('Tap water is safe after boiling and filtering in most cities') }),
      region('delhi', same, { answerBox: ab('Municipal supply contains contaminants; drink bottled purified water') }),
    ])!;
    expect(a.answerDivergence.snippetDiffers).toBe(true);
    const b = analyze([region('mumbai', same, { answerBox: ab('Same words here for test') }), region('delhi', same, { answerBox: ab('Same words here for test') })])!;
    expect(b.answerDivergence.snippetDiffers).toBe(false);
    expect(a.score).toBeGreaterThan(b.score);
  });

  it('produces a deterministic template summary', () => {
    const a = analyze([region('mumbai', same), region('delhi', [L('w.com')])])!;
    expect(templateSummary(a, { mumbai: 'Mumbai', delhi: 'Delhi' })).toContain('Mumbai and Delhi agree least');
    expect(a.summary).toBe(templateSummary(a));
  });
});
