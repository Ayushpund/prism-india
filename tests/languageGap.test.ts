import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeGap, summarizeGap } from '@/lib/languageGap';
import { classify, trustOf } from '@/lib/trust';
import type { RegionData, RegionId, SearchResponse } from '@/lib/types';

const mk = (id: RegionId, hl: string, links: string[]): RegionData => ({
  regionId: id,
  hl,
  organic: links.map((link, i) => ({ position: i + 1, title: `T${i}`, link, domain: new URL(link).hostname.replace(/^www\./, ''), snippet: '' })),
  answerBox: null,
  aiOverview: null,
  relatedQuestions: [],
  news: [],
  fromCache: false,
  warnings: [],
});

describe('trust classification', () => {
  it('classifies common domains', () => {
    expect(classify('voters.eci.gov.in')).toBe('official');
    expect(classify('who.int')).toBe('official');
    expect(classify('iitb.ac.in')).toBe('academic');
    expect(classify('altnews.in')).toBe('factcheck');
    expect(classify('www.thehindu.com')).toBe('news');
    expect(classify('x.com')).toBe('social');
    expect(classify('random-coaching.in')).toBe('commercial');
    expect(classify('en.wikipedia.org')).toBe('reference');
  });
  it('scores a mix and handles empty input', () => {
    expect(trustOf(['uidai.gov.in', 'x.com']).score).toBe(60);
    expect(trustOf([]).score).toBe(0);
  });
});

describe('computeGap', () => {
  it('is zero for identical results', () => {
    const l = ['https://a.gov.in/x', 'https://b.com/y'];
    const g = computeGap(mk('delhi', 'hi', l), mk('delhi', 'en', l));
    expect(g.index).toBe(0);
    expect(g.direction).toBe('same');
  });
  it('flags a loss of authority in the native language', () => {
    const nat = mk('chennai', 'ta', ['https://blog1.com/a', 'https://blog2.com/b', 'https://x.com/c']);
    const eng = mk('chennai', 'en', ['https://data.gov.in/a', 'https://iitm.ac.in/b', 'https://altnews.in/c']);
    const g = computeGap(nat, eng);
    expect(g.direction).toBe('worse');
    expect(g.trustDelta).toBeGreaterThan(40);
    expect(g.index).toBeGreaterThan(80);
    expect(g.onlyEnglish.map((i) => i.category)).toContain('official');
    expect(summarizeGap([g], { chennai: 'Chennai' }, { chennai: 'Tamil' }).summary).toContain('less authoritative');
  });
});

describe('real demo data', () => {
  it('produces valid gap scores for every saved query', () => {
    for (const slug of ['best-career-after-12th', 'is-tap-water-safe-to-drink', 'how-to-start-a-business', 'monsoon-health-tips']) {
      const n = JSON.parse(readFileSync(`data/demo/${slug}.json`, 'utf8')) as SearchResponse;
      const e = JSON.parse(readFileSync(`data/demo/${slug}.en.json`, 'utf8')) as SearchResponse;
      for (const id of ['delhi', 'chennai', 'kolkata', 'hyderabad'] as RegionId[]) {
        const a = n.outcomes.find((o) => o.ok && o.data.regionId === id);
        const b = e.outcomes.find((o) => o.ok && o.data.regionId === id);
        if (!a?.ok || !b?.ok) continue;
        const g = computeGap(a.data, b.data);
        expect(g.index).toBeGreaterThanOrEqual(0);
        expect(g.index).toBeLessThanOrEqual(100);
        console.log(slug.padEnd(28), id.padEnd(10), `idx=${g.index}`, `urlOv=${Math.round(g.urlOverlap * 100)}%`, `trust nat/eng=${g.trustNative.score}/${g.trustEnglish.score}`, g.direction);
      }
    }
  });
});
