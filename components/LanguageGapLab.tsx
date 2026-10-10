'use client';
import { useEffect, useState } from 'react';
import { GAP_FORMULA, type CityGap, type GapItem, type GapResult } from '@/lib/languageGap';
import { REGION_BY_ID } from '@/lib/regions';
import { copyText, whatsappUrl } from '@/lib/share';
import { TRUST_META } from '@/lib/trust';
import type { RegionId } from '@/lib/types';
import TrustBar, { TrustLegend } from './TrustBar';
import VoiceInput from './VoiceInput';

type Result = GapResult & { problems: string[]; names: Record<string, string>; langs: Record<string, string> };

const CITIES: RegionId[] = ['delhi', 'chennai', 'kolkata', 'hyderabad'];
const SAMPLES = ['best career after 12th', 'is tap water safe to drink', 'how to start a business', 'monsoon health tips'];
const LANG: Record<string, string> = { hi: 'Hindi', ta: 'Tamil', bn: 'Bengali', te: 'Telugu' };

const label = (n: number) => (n >= 75 ? 'Very large gap' : n >= 50 ? 'Large gap' : n >= 25 ? 'Moderate gap' : 'Small gap');

function Pill({ it }: { it: GapItem }) {
  const m = TRUST_META[it.category];
  return (
    <li className="border-b-2 border-dashed border-black/15 py-2 last:border-0">
      <a href={it.link} target="_blank" rel="noreferrer noopener" className="text-sm font-bold leading-snug underline-offset-4 hover:underline">
        {it.title}<span className="sr-only"> (opens in new tab)</span>
      </a>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: m.color }}>{m.label}</span>
        <span className="font-mono text-[11px] text-mute">{it.domain}</span>
      </div>
    </li>
  );
}

function City({ g, name }: { g: CityGap; name: string }) {
  const r = REGION_BY_ID[g.regionId];
  const lang = LANG[g.nativeHl] ?? g.nativeHl;
  const delta = Math.abs(Math.round(g.trustDelta));
  const verdict = g.direction === 'worse' ? `${lang} results are ${delta} points less authoritative` : g.direction === 'better' ? `${lang} results are ${delta} points more authoritative` : `Similar authority in both languages`;
  return (
    <li className="card overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-ink px-5 py-3 text-white" style={{ background: r.color }}>
        <h3 className="font-display text-xl font-extrabold">{name} <span className="font-mono text-xs font-bold opacity-90">· {lang} vs English</span></h3>
        <span className="rounded-md border-2 border-ink bg-card px-2 py-0.5 font-display text-lg font-extrabold text-ink" aria-label={`Language gap ${g.index} out of 100`}>{g.index}</span>
      </div>
      <div className="space-y-5 p-5">
        <div>
          <div className="flex items-baseline justify-between"><span className="micro">Pages that differ</span><span className="font-display text-2xl font-extrabold">{Math.round((1 - g.urlOverlap) * 100)}%</span></div>
          <div className="mt-1 h-3 w-full border-2 border-ink bg-card"><div className="h-full bg-ink" style={{ width: `${(1 - g.urlOverlap) * 100}%` }} /></div>
        </div>
        <div>
          <div className="micro mb-2">Source trust</div>
          <div className="space-y-2">
            <div><div className="mb-1 flex justify-between text-xs font-bold"><span>{lang}</span><span>{g.trustNative.score}/100</span></div><TrustBar profile={g.trustNative} label={`${lang} results`} /></div>
            <div><div className="mb-1 flex justify-between text-xs font-bold"><span>English</span><span>{g.trustEnglish.score}/100</span></div><TrustBar profile={g.trustEnglish} label="English results" /></div>
          </div>
          <p className="mt-2 text-sm font-bold" style={{ color: g.direction === 'worse' ? '#E11D2E' : g.direction === 'better' ? '#0a7a45' : undefined }}>{g.direction === 'worse' ? '▼ ' : g.direction === 'better' ? '▲ ' : '≈ '}{verdict}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <h4 className="font-display text-sm font-extrabold">Only English searchers see</h4>
            <ul className="mt-1">{g.onlyEnglish.length ? g.onlyEnglish.map((it) => <Pill key={it.link} it={it} />) : <li className="text-sm text-mute">Nothing unique.</li>}</ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-extrabold">Only {lang} searchers see</h4>
            <ul className="mt-1">{g.onlyNative.length ? g.onlyNative.map((it) => <Pill key={it.link} it={it} />) : <li className="text-sm text-mute">Nothing unique.</li>}</ul>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function LanguageGapLab() {
  const [query, setQuery] = useState('is tap water safe to drink');
  const [cities, setCities] = useState<RegionId[]>(CITIES);
  const [demo, setDemo] = useState(true);
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    fetch('/api/search').then((r) => r.json()).then((j) => setUsage(j.usage)).catch(() => {});
  }, [res]);

  const credits = demo ? 0 : cities.length * 2;
  const toggle = (id: RegionId) => setCities((c) => (c.includes(id) ? (c.length > 1 ? c.filter((x) => x !== id) : c) : [...c, id]));

  const run = async (q = query) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/language-gap', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q, cities, demo }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `Request failed (${r.status})`);
      setRes(j as Result);
    } catch (e) {
      setError((e as Error).message);
      setRes(null);
    } finally {
      setLoading(false);
    }
  };

  const shareText = res
    ? `Prism India: I searched "${res.query}" in English vs local languages across ${res.gaps.length} Indian cities. Language Gap Index: ${res.index}/100 (${label(res.index).toLowerCase()}). ${res.summary} Check yours: ${typeof window !== 'undefined' ? window.location.origin : ''}/language-gap`
    : '';

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); void run(); }} aria-label="Language gap search">
        <label htmlFor="gap-q" className="micro mb-2 block">Your search</label>
        <div className="card flex items-center overflow-hidden p-0">
          <input id="gap-q" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={120} placeholder="e.g. is tap water safe to drink" className="min-w-0 flex-1 bg-transparent px-4 py-4 text-base outline-none placeholder:text-mute sm:text-lg" />
          <VoiceInput onText={(t) => setQuery(t)} className="mr-1" />
          <button type="submit" disabled={loading} className="btn-primary m-2 rounded-md px-5 text-sm disabled:opacity-50">{loading ? 'Measuring…' : `Measure the gap · ${credits} credit${credits === 1 ? '' : 's'}`}</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="micro">Try:</span>
          {SAMPLES.map((s) => <button key={s} type="button" onClick={() => { setQuery(s); void run(s); }} className="chip px-3 py-1 text-xs">{s}</button>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {CITIES.map((id) => {
            const r = REGION_BY_ID[id];
            const on = cities.includes(id);
            return <button key={id} type="button" aria-pressed={on} onClick={() => toggle(id)} className="rounded-full border-2 border-ink px-3 py-1 text-xs font-bold" style={{ background: on ? r.color : 'transparent', color: on ? '#fff' : '#0B0B0B', opacity: on ? 1 : 0.55 }}>{r.name} · {LANG[r.nativeHl]}</button>;
          })}
          <label className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-ink px-3 py-1 text-xs font-bold" style={{ background: demo ? '#FFD60A' : '#FFFDF7' }}>
            <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} className="accent-ink" /> Demo mode · 0 credits
          </label>
          {usage && <span className="micro ml-auto">Monthly credits {usage.used}/{usage.limit}</span>}
        </div>
        <p className="micro mt-3">Mumbai and Bengaluru search in English by default, so only the four cities whose native Google language differs are compared. Live mode costs 2 credits per city (one native, one English search).</p>
      </form>

      <div aria-live="polite" className="mt-10">
        {error && <p role="alert" className="border-2 border-ink bg-red p-3 text-sm font-bold text-white" style={{ boxShadow: '4px 4px 0 #0B0B0B' }}>{error}</p>}
        {loading && <p className="micro">Comparing native-language and English results…</p>}
        {res && !loading && (
          <section aria-label="Language gap results">
            <div className="card grid gap-6 p-6 md:grid-cols-[auto_1fr] md:items-center">
              <div className="text-center md:text-left">
                <div className="micro">Language Gap Index</div>
                <div className="font-display text-8xl font-extrabold leading-none" style={{ color: res.index >= 50 ? '#E11D2E' : '#0B0B0B' }} aria-label={`${res.index} out of 100`}>{res.index}</div>
                <div className="mt-1 text-sm font-bold">{label(res.index)}</div>
              </div>
              <div>
                <p className="text-base leading-relaxed md:text-lg">{res.summary}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <a href={whatsappUrl(shareText)} target="_blank" rel="noreferrer noopener" className="btn px-4 py-2 text-sm" style={{ background: '#25D366' }}>Share on WhatsApp</a>
                  <button type="button" onClick={async () => { setCopied(await copyText(shareText)); setTimeout(() => setCopied(false), 1800); }} className="btn px-4 py-2 text-sm">{copied ? 'Copied ✓' : 'Copy summary'}</button>
                  <span className="micro">{res.demo ? 'Saved data · 0 credits' : `${res.creditsUsed} credits used`}</span>
                </div>
                <details className="mt-3 text-sm"><summary className="cursor-pointer font-bold underline-offset-4 hover:underline">How is this calculated?</summary><p className="mt-2 text-mute">{GAP_FORMULA}</p></details>
              </div>
            </div>

            <div className="mt-6 card p-4"><TrustLegend /></div>

            <ul className="mt-6 grid gap-6 xl:grid-cols-2">
              {res.gaps.map((g) => <City key={g.regionId} g={g} name={res.names[g.regionId] ?? g.regionId} />)}
            </ul>
            {res.problems.length > 0 && <p className="mt-4 text-sm text-red">{res.problems.join(' · ')}</p>}
            <p className="micro mt-6">Trust scores rate the type of source, not the truth of a page. Results vary with personalization, time and device.</p>
          </section>
        )}
      </div>
    </div>
  );
}
