'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { REGIONS, REGION_BY_ID } from '@/lib/regions';
import { useSearch } from '@/lib/useSearch';
import type { LangMode, PairOverlap, RegionData, RegionId } from '@/lib/types';
import { heat, pad2, useIsMobile } from '@/lib/ui';
import Boot from './Boot';
import { SiteFooter, SiteHeader } from './SiteChrome';
import Magnetic from './ui/Magnetic';
import ScoreGauge from './ScoreGauge';
import OverlapMatrix from './OverlapMatrix';
import BlindSpots from './BlindSpots';
import SplitReality from './SplitReality';
import RegionPanel from './RegionPanel';
import TrustProfile from './TrustProfile';
import VoiceInput from './VoiceInput';
import Link from 'next/link';
import { whatsappUrl } from '@/lib/share';

const IndiaMap = dynamic(() => import('./IndiaMap'), { ssr: false, loading: () => <div className="aspect-[600/660] w-full animate-pulse rounded-2xl bg-black/[0.03]" /> });

const EXAMPLES = ['best career after 12th', 'is tap water safe to drink', 'how to start a business', 'monsoon health tips'];
const DEMO_QUERY = 'best career after 12th';

export default function Observatory() {
  const { state, usage, demoQueries, run, refreshUsage } = useSearch();
  const mobile = useIsMobile();
  const [booted, setBooted] = useState(true); // flips to false in effect if first visit (avoids SSR flash)
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RegionId[]>(REGIONS.map((r) => r.id));
  const [langMode, setLangMode] = useState<LangMode>('native');
  const [includeNews, setIncludeNews] = useState(false);
  const [demo, setDemo] = useState(true);
  const [hovered, setHovered] = useState<RegionId | null>(null);
  const [active, setActive] = useState<RegionId | null>(null);
  const [hlPair, setHlPair] = useState<[RegionId, RegionId] | null>(null);
  const [pair, setPair] = useState<[RegionId, RegionId] | null>(null);
  const [divider, setDivider] = useState(50);
  const [forcedCell, setForcedCell] = useState<[number, number] | null>(null);
  const [forcedBlind, setForcedBlind] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [cinematic, setCinematic] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const matrixRef = useRef<HTMLElement>(null);
  const blindRef = useRef<HTMLElement>(null);
  const splitRef = useRef<HTMLElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const cancelRef = useRef(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem('boot-seen')) setBooted(false);
    } catch {
      /* ignore */
    }
    void refreshUsage();
  }, [refreshUsage]);
  const finishBoot = useCallback(() => {
    setBooted(true);
    try { sessionStorage.setItem('boot-seen', '1'); } catch { /* ignore */ }
  }, []);

  const response = state.response;
  const analysis = response?.analysis ?? null;
  const okData = useMemo(() => {
    const o: Partial<Record<RegionId, RegionData>> = {};
    for (const [id, out] of Object.entries(state.outcomes)) if (out?.ok) o[id as RegionId] = out.data;
    return o;
  }, [state.outcomes]);
  const divergence = useMemo(() => Object.fromEntries((analysis?.perRegion ?? []).map((r) => [r.regionId, r.divergence])) as Partial<Record<RegionId, number>>, [analysis]);
  const pairs: PairOverlap[] = analysis?.pairs ?? [];
  const running = state.phase === 'loading';
  const started = state.phase !== 'idle';
  const mostDivergent = useMemo(() => [...(analysis?.perRegion ?? [])].sort((a, b) => b.divergence - a.divergence)[0]?.regionId ?? null, [analysis]);

  // default comparison pair = the least-overlapping pair
  useEffect(() => {
    if (!analysis) return;
    const low = [...analysis.pairs].sort((a, b) => a.urlJaccard - b.urlJaccard)[0];
    if (low) setPair([low.a, low.b]);
    setDivider(50);
  }, [analysis]);

  const submit = useCallback(
    (q: string, over?: Partial<{ demo: boolean; regions: RegionId[] }>) => {
      const text = q.trim();
      if (text.length < 2) return;
      setQuery(text);
      setActive(null);
      setNotice(null);
      setDirty(false);
      void run({ query: text, regions: over?.regions ?? selected, langMode, includeNews, demo: over?.demo ?? demo });
    },
    [run, selected, langMode, includeNews, demo],
  );

  const submitRef = useRef(submit);
  submitRef.current = submit;
  const [dirty, setDirty] = useState(false);
  const firstSettings = useRef(true);
  useEffect(() => {
    if (firstSettings.current) { firstSettings.current = false; return; }
    const cur = stateRef.current;
    if (cinematic || cur.phase === 'idle' || !cur.query) return;
    if (demo) {
      const t = setTimeout(() => submitRef.current(cur.query), 350);
      return () => clearTimeout(t);
    }
    setDirty(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langMode, selected, includeNews]);

  const toggleRegion = useCallback((id: RegionId) => setSelected((s) => (s.includes(id) ? (s.length > 2 ? s.filter((x) => x !== id) : s) : REGIONS.map((r) => r.id).filter((x) => x === id || s.includes(x)))), []);

  // keyboard: "/" search, 1-6 regions, Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (e.key === 'Escape') {
        if (cinematic) cancelRef.current = true;
        setActive(null);
        (document.activeElement as HTMLElement | null)?.blur?.();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (/^[1-6]$/.test(e.key)) toggleRegion(REGIONS[Number(e.key) - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleRegion, cinematic]);

  const share = async () => {
    if (!response) return;
    setShareBusy(true);
    try {
      const r = await fetch('/api/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(response) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'Could not create report');
      window.open(j.url, '_blank');
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setShareBusy(false);
    }
  };

  /* ---------------- scripted ~60s cinematic demo (Demo Mode data, zero credits) ---------------- */
  const runCinematic = useCallback(async () => {
    if (cinematic) {
      cancelRef.current = true;
      return;
    }
    cancelRef.current = false;
    const stop = () => {
      if (cancelRef.current) throw new Error('cancelled');
    };
    const wait = async (ms: number) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        stop();
        await new Promise((r) => setTimeout(r, Math.min(100, end - Date.now())));
      }
    };
    const go = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setCinematic(true);
    try {
      setDemo(true); setLangMode("native"); setIncludeNews(false);
      setSelected(REGIONS.map((r) => r.id)); setActive(null); setHovered(null); setHlPair(null); setForcedCell(null); setForcedBlind(null); setQuery('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCaption('Same question. Six Indian cities. One Google… or is it?');
      await wait(3200);
      inputRef.current?.focus();
      for (let i = 1; i <= DEMO_QUERY.length; i++) { setQuery(DEMO_QUERY.slice(0, i)); await wait(70); }
      setCaption('Fire the pulse. The query radiates out to every city.');
      await wait(1200);
      inputRef.current?.blur();
      void run({ query: DEMO_QUERY, regions: REGIONS.map((r) => r.id), langMode: 'native', includeNews: false, demo: true });
      go(mapRef.current);
      for (let i = 0; i < 300 && stateRef.current.phase !== 'done'; i++) { await wait(100); if (stateRef.current.phase === 'error') throw new Error('demo failed'); }
      const a = stateRef.current.response?.analysis;
      if (!a) throw new Error('no analysis');
      setCaption(`Each beacon lit up when its real data arrived. Divergence Score: ${a.score} / 100.`);
      await wait(6500);
      const top = [...a.perRegion].sort((x, y) => y.divergence - x.divergence)[0].regionId;
      setCaption(`Hover a beacon: ${REGION_BY_ID[top].name} sees a very different top 3.`);
      setHovered(top);
      await wait(4200);
      setHovered(null);
      setCaption(`Click to zoom in: ${REGION_BY_ID[top].name}'s full results.`);
      setActive(top);
      await wait(6000);
      setActive(null);
      setCaption('The connection web: thick = overlap, dashed red = under 20% shared.');
      await wait(900);
      const lows = [...a.pairs].sort((x, y) => x.urlJaccard - y.urlJaccard).slice(0, 3);
      for (const p of lows) { setHlPair([p.a, p.b]); await wait(1500); }
      setHlPair(null);
      setCaption('The overlap matrix: how much does each city agree with each other?');
      go(matrixRef.current);
      await wait(1800);
      const n = a.regions.length;
      for (let k = 0; k < 7; k++) { setForcedCell([(k * 2) % n, (k * 2 + 1 + (k % 2)) % n]); await wait(1000); }
      setForcedCell(null);
      setCaption('Blind spots: results that rank high elsewhere but never reach a city.');
      go(blindRef.current);
      await wait(1800);
      for (let k = 0; k < Math.min(3, a.blindSpots.length); k++) { setForcedBlind(k); await wait(2400); }
      setForcedBlind(null);
      const lowest = lows[0];
      if (lowest) setPair([lowest.a, lowest.b]);
      setCaption(`Split reality: ${REGION_BY_ID[lowest.a].name} vs ${REGION_BY_ID[lowest.b].name}. Drag the divider.`);
      go(splitRef.current);
      await wait(2000);
      for (const v of [30, 70, 50]) { setDivider(v); await wait(2000); }
      setCaption('Same search. Different India. Share it as a poster.');
      await wait(3500);
    } catch {
      /* cancelled or failed */
    } finally {
      setCaption(null); setForcedCell(null); setForcedBlind(null); setHlPair(null); setHovered(null); setActive(null); setCinematic(false);
    }
  }, [cinematic, run]);

  const panelOutcome = active ? state.outcomes[active] : undefined;
  const hero = !started;

  return (
    <LayoutGroup>
      {!booted && <Boot onDone={finishBoot} />}

      <div className={`page-flash relative z-10 min-h-screen ${flash ? 'tearing' : ''}`}>
        {/* top bar */}
        <SiteHeader right={<>{usage && <span className="chip px-3.5 py-1.5 text-xs" title="SerpApi credits used this month (cached responses cost nothing)">Credits <b>{usage.used}</b>/{usage.limit}</span>}<button onClick={runCinematic} className="btn px-4 py-2 text-sm">{cinematic ? '■ Stop demo (Esc)' : '▶ Watch the demo'}</button></>} strip={<div className="overflow-hidden border-t-2 border-ink bg-ink py-1.5 text-paper" aria-hidden>
            <div className="marquee font-mono text-[11px] font-semibold uppercase tracking-wider">
              {[0, 1].map((k) => (
                <span key={k} className="flex shrink-0 gap-8 pr-8">
                  {['Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Hyderabad', 'Bengaluru'].flatMap((c) => [`${c} sees one internet`, '✦']).map((t, i) => <span key={i}>{t}</span>)}
                  <span>Same query ✦ six cities ✦ six realities ✦</span>
                </span>
              ))}
            </div>
          </div>} />

        <section id="main" className={`mx-auto max-w-6xl px-4 md:px-8 ${hero ? 'pb-10 pt-10 md:pt-16' : 'pb-4 pt-6'}`}>
          <motion.h1 layout className={`font-display font-extrabold uppercase leading-[0.92] ${hero ? 'text-[2.6rem] sm:text-6xl md:text-[6.5rem]' : 'text-2xl md:text-5xl'}`}>
            Same search.<br className={hero ? '' : 'hidden'} /> <span className="marker">Different</span> India<span className="text-red">.</span>
          </motion.h1>
          {hero && (
            <div className="mt-6 flex flex-wrap items-start gap-4">
              <p className="max-w-xl text-base leading-relaxed md:text-lg">
                We ask Google the same question from <b>six Indian cities</b> and measure what changes: the sources, the order, the answers, and what some cities never get to see.
              </p>
              <span className="sticker mt-1">Live data · 6 cities</span>
              <Link href="/language-gap" className="btn mt-1 px-4 py-2 text-sm">New: does your language limit your internet? →</Link>
            </div>
          )}

          <form className="mt-7 max-w-3xl" onSubmit={(e) => { e.preventDefault(); submit(query); }}>
            <div className="card flex items-stretch gap-0 overflow-hidden p-0">
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask anything, e.g. is tap water safe to drink" aria-label="Search query" maxLength={120} className="min-w-0 flex-1 bg-transparent px-4 py-4 text-base outline-none placeholder:text-mute sm:px-5 sm:text-xl" />
              <VoiceInput onText={(t) => setQuery(t)} className="mr-1" />
              <button type="submit" disabled={running} className="btn-primary m-2 rounded-md px-5 text-sm disabled:opacity-50 sm:px-7">
                {running ? 'Scanning…' : 'Compare →'}
              </button>
            </div>
            <div className={`mt-3 flex-wrap items-center gap-2 ${hero ? 'flex' : 'hidden'}`}>
              <span className="micro">Try:</span>
              {EXAMPLES.map((q) => (
                <button key={q} type="button" disabled={running} onClick={() => submit(q)} className="chip px-3 py-1 text-xs disabled:opacity-40">{q}</button>
              ))}
            </div>
          </form>

          {/* controls */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {REGIONS.map((r) => {
              const on = selected.includes(r.id);
              return (
                <motion.button key={r.id} layoutId={`name-${r.id}`} type="button" onClick={() => toggleRegion(r.id)} aria-pressed={on} title={`Toggle ${r.name} (key ${r.index})`}
                  className="flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 text-xs font-bold" style={{ color: on ? '#fff' : '#0B0B0B', background: on ? r.color : 'transparent', opacity: on ? 1 : 0.55 }}>
                  <span className="font-mono opacity-70">{r.index}</span> {r.name}
                </motion.button>
              );
            })}
            <span className="mx-1 hidden h-5 w-0.5 bg-ink md:block" />
            <div className="flex overflow-hidden rounded-full border-2 border-ink" role="group" aria-label="Language mode">
              {(['native', 'english'] as LangMode[]).map((m) => (
                <button key={m} type="button" aria-pressed={langMode === m} onClick={() => setLangMode(m)} className={`px-3 py-1 text-xs font-bold ${langMode === m ? 'bg-ink text-paper' : 'bg-card'}`}>{m === 'native' ? 'Native language' : 'English for all'}</button>
              ))}
            </div>
            <label className="chip flex cursor-pointer items-center gap-1.5 px-3 py-1 text-xs" title="google_news engine: +1 search per region"><input type="checkbox" checked={includeNews} onChange={(e) => setIncludeNews(e.target.checked)} className="accent-ink" /> Extra news (+1 credit/region)</label>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 text-xs font-bold" style={{ background: demo ? '#FFD60A' : '#FFFDF7' }} title="Replays 4 saved queries: works offline, zero credits">
              <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} className="accent-ink" /> Demo mode · 0 credits
            </label>
          </div>
          {dirty && !demo && <button type="button" onClick={() => submit(stateRef.current.query)} className="btn mt-3 px-4 py-2 text-xs">Settings changed. Compare again ({includeNews ? selected.length * 2 : selected.length} credits max) →</button>}
          {demo && demoQueries.length > 0 && hero && <p className="micro mt-3">Demo mode replays {demoQueries.length} saved queries · works offline</p>}
          {!demo && <p className="micro mt-3 text-red">Live mode: up to {includeNews ? selected.length * 2 : selected.length} SerpApi credits per search (cached repeats are free)</p>}
        </section>

        {(state.error || notice) && <p role="alert" className="mx-auto mb-4 max-w-3xl border-2 border-ink bg-red p-3 text-sm font-bold text-white" style={{ boxShadow: '4px 4px 0 #0B0B0B' }}>{state.error ?? notice}</p>}

        {started && (
          <>
            {/* map + score */}
            <section className="mx-auto grid max-w-7xl gap-5 px-4 md:px-8 lg:grid-cols-[1.25fr_1fr]" aria-label="Map and score">
              <div ref={mapRef} className="glass p-3 md:p-5">
                <div className="micro mb-2 flex justify-between"><span>Live map · {selected.length} regions</span><span>{running ? 'Receiving data…' : 'Up to date'}</span></div>
                <IndiaMap selected={selected.filter((id) => id in state.statuses)} statuses={state.statuses} divergence={divergence} pairs={pairs} outcomes={state.outcomes} running={running} runId={state.runId} query={state.query} hovered={hovered} onHover={setHovered} active={active} onSelect={setActive} highlightPair={hlPair} />
              </div>

              <div className="flex flex-col gap-5">
                <div className="glass p-5">
                  {analysis ? (
                    <>
                      <ScoreGauge analysis={analysis} runId={state.runId} onTear={setFlash} />
                      <p className="mt-4 text-[13px] leading-relaxed text-ink">{analysis.summary}</p>
                      <p className="micro mt-2">{response?.insightSource === 'llm' ? 'insight // written by Claude from structured analysis only' : 'insight // deterministic summary'}{response?.demo ? ' · demo data (0 credits)' : ` · ${response?.creditsUsed ?? 0} credits used`}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Magnetic><button onClick={share} disabled={shareBusy} className="btn-primary rounded-full px-5 py-2 text-xs disabled:opacity-60">{shareBusy ? 'Building…' : '⬇ Share report card'}</button></Magnetic>
                        <a href={whatsappUrl(`Prism India: I searched "${state.query}" in ${analysis.regions.length} Indian cities. Divergence Score ${analysis.score}/100. ${analysis.summary.split('. ')[0]}. Try it: ${typeof window !== 'undefined' ? window.location.origin : ''}`)} target="_blank" rel="noreferrer noopener" className="btn px-5 py-2 text-xs" style={{ background: '#25D366' }}>Share on WhatsApp</a>
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-[18rem] flex-col items-center justify-center text-center">
                      <div className="micro">{running ? 'AWAITING ALL REGIONS' : 'NO SIGNAL'}</div>
                      <div className="mt-3 font-display text-5xl text-black/20">--</div>
                    </div>
                  )}
                </div>

                {/* region telemetry */}
                <div className="glass p-4">
                  <div className="micro mb-3">REGION TELEMETRY</div>
                  <ul className="space-y-2">
                    {REGIONS.filter((r) => r.id in state.statuses).map((r) => {
                      const st = state.statuses[r.id];
                      const o = state.outcomes[r.id];
                      const dv = divergence[r.id];
                      return (
                        <li key={r.id}>
                          <button onClick={() => st !== 'pending' && setActive(r.id)} disabled={st === 'pending'} onMouseEnter={() => setHovered(r.id)} onMouseLeave={() => setHovered(null)}
                            className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-black/5">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color, opacity: st === 'pending' ? 0.4 : 1 }} />
                            <span className="micro w-44 shrink-0 truncate" style={{ color: r.color }}>REGION {pad2(r.index)} // {r.name} // hl={o?.ok ? o.data.hl : '…'}</span>
                            <span className="h-1.5 flex-1 rounded bg-black/10"><span className="block h-full rounded transition-all duration-1000" style={{ width: `${(dv ?? (st === 'ok' ? 0.02 : 0)) * 100}%`, background: heat(dv ?? 0) }} /></span>
                            <span className="w-16 text-right text-[11px] text-mute">{st === 'pending' ? 'loading…' : st === 'error' ? 'error' : dv !== undefined ? `${Math.round(dv * 100)}% off` : o?.ok && o.data.fromCache ? 'cached' : 'ok'}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </section>

            {analysis && (
              <div className="mx-auto mt-8 max-w-7xl space-y-8 px-4 pb-24 md:px-8">
                <section ref={matrixRef} className="glass p-4 md:p-6" aria-label="Overlap matrix">
                  <OverlapMatrix regions={analysis.regions} pairs={analysis.pairs} forced={forcedCell} onPair={setHlPair} runId={state.runId} />
                </section>

                <section className="card p-4 md:p-6" aria-label="Source trust">
                  <TrustProfile data={okData} order={analysis.regions} />
                </section>

                <section ref={blindRef} aria-label="Blind spots">
                  <h2 className="font-display text-2xl font-bold md:text-3xl">Blind spots</h2>
                  <p className="micro mb-4 mt-1">results that rank high elsewhere, absent from a region's top 10 · {new Set(analysis.blindSpots.map((b) => b.url)).size} found</p>
                  <BlindSpots key={state.runId} spots={analysis.blindSpots} forcedOpen={forcedBlind} />
                </section>

                <section ref={splitRef} className="glass p-4 md:p-6" aria-label="Split reality comparison">
                  <h2 className="font-display text-2xl font-bold md:text-3xl">Split reality</h2>
                  <p className="micro mb-6 mt-1">choose two cities · drag the divider</p>
                  {pair && <SplitReality data={okData} pair={pair} onPair={setPair} divider={divider} onDivider={setDivider} />}
                </section>
              </div>
            )}
          </>
        )}

        <SiteFooter />
      </div>

      <AnimatePresence>{active && <RegionPanel key={active} regionId={active} outcome={panelOutcome} div={analysis?.perRegion.find((r) => r.regionId === active)} onClose={() => setActive(null)} />}</AnimatePresence>

      <AnimatePresence>
        {caption && (
          <motion.div key={caption} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status">
            <div className="max-w-2xl border-2 border-ink bg-ink px-6 py-3 text-center font-display text-base font-bold text-yellow md:text-xl" style={{ boxShadow: "5px 5px 0 #FFD60A" }}>{caption}</div>
          </motion.div>
        )}
      </AnimatePresence>
      {mobile && null}
    </LayoutGroup>
  );
}
