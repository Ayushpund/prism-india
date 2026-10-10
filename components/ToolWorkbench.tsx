'use client';
import { useEffect, useMemo, useState } from 'react';
import { REGIONS } from '@/lib/regions';
import VoiceInput from './VoiceInput';
import { LANGS, type ToolMeta } from '@/lib/toolsMeta';
import type { ToolItem, ToolOptions, ToolResult, Tone } from '@/lib/toolsTypes';

const TONE: Record<Tone, string> = {
  good: 'bg-[#BFF0D4] text-[#064E2B]',
  info: 'bg-[#D6E0FF] text-[#0B2A9C]',
  warn: 'bg-yellow text-ink',
};

function Item({ it }: { it: ToolItem }) {
  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        {it.link ? (
          <a href={it.link} target="_blank" rel="noreferrer noopener" className="font-display text-lg font-bold leading-snug underline-offset-4 hover:underline">
            {it.title}<span className="sr-only"> (opens in new tab)</span>
          </a>
        ) : (
          <span className="font-display text-lg font-bold leading-snug">{it.title}</span>
        )}
      </div>
      {it.source && <div className="mt-1 break-words font-mono text-xs text-mute">{it.source}</div>}
      {it.badges.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Labels">
          {it.badges.map((b) => (
            <li key={b.label} className={`rounded-full border-2 border-ink px-2.5 py-0.5 text-[11px] font-bold ${TONE[b.tone]}`}>{b.label}</li>
          ))}
        </ul>
      )}
      {it.snippet && <p className="mt-2 text-sm leading-relaxed">{it.snippet}</p>}
      {it.facts.length > 0 && (
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t-2 border-dashed border-black/20 pt-2 text-xs">
          {it.facts.map((f) => (
            <div key={f.label} className="flex gap-1.5"><dt className="text-mute">{f.label}</dt><dd className="font-bold">{f.value}</dd></div>
          ))}
        </dl>
      )}
    </li>
  );
}

export default function ToolWorkbench({ tool }: { tool: ToolMeta }) {
  const [query, setQuery] = useState('');
  const [demo, setDemo] = useState(true);
  const [sample, setSample] = useState<string | null>(null);
  const [opts, setOpts] = useState<ToolOptions>({ lang: 'en', sort: 'relevance', cities: ['bengaluru'] });
  const [result, setResult] = useState<ToolResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    fetch(`/api/tool?demo=${tool.id}`)
      .then((r) => r.json())
      .then((j) => {
        setUsage(j.usage);
        if (j.query) {
          setSample(j.query);
          setQuery((q) => q || j.query);
        }
      })
      .catch(() => {});
  }, [tool.id]);

  const credits = useMemo(() => (demo ? 0 : tool.id === 'jobs' ? opts.cities?.length ?? 1 : tool.credits), [demo, tool, opts.cities]);
  const set = (p: Partial<ToolOptions>) => setOpts((o) => ({ ...o, ...p }));

  const run = async (q = query) => {
    if (q.trim().length < 2) return setError('Type at least 2 characters.');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tool', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tool: tool.id, query: q.trim(), demo, options: opts }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? `Request failed (${res.status})`);
      setResult(j as ToolResult);
      fetch('/api/tool').then((r) => r.json()).then((x) => setUsage(x.usage)).catch(() => {});
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const groups = useMemo(() => (result?.groups ?? []).map((g) => ({ ...g, items: openOnly ? g.items.filter((i) => i.open) : g.items })), [result, openOnly]);
  const hasOpen = result?.groups.some((g) => g.items.some((i) => i.open));

  const sel = 'rounded-md border-2 border-ink bg-card px-3 py-2 text-sm font-bold';

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        <form onSubmit={(e) => { e.preventDefault(); void run(); }} aria-label={`${tool.title} search`}>
          <label htmlFor="tool-q" className="micro mb-2 block">Your search</label>
          <div className="card flex items-stretch overflow-hidden p-0">
            <input id="tool-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tool.placeholder} maxLength={160} className="min-w-0 flex-1 bg-transparent px-4 py-4 text-base outline-none placeholder:text-mute sm:text-lg" />
            <VoiceInput onText={(t) => setQuery(t)} className="mr-1" />
            <button type="submit" disabled={loading} className="btn-primary m-2 rounded-md px-5 text-sm disabled:opacity-50">
              {loading ? 'Searching…' : `Search · ${credits} credit${credits === 1 ? '' : 's'}`}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {tool.options.includes('lang') && (
              <label className="flex items-center gap-2 text-sm font-bold">Language
                <select value={opts.lang} onChange={(e) => set({ lang: e.target.value })} className={sel}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select>
              </label>
            )}
            {tool.options.includes('year') && (
              <label className="flex items-center gap-2 text-sm font-bold">Published since
                <select value={opts.year ?? ''} onChange={(e) => set({ year: e.target.value || undefined })} className={sel}>
                  <option value="">Any year</option><option value="2024">2024</option><option value="2020">2020</option><option value="2015">2015</option><option value="2010">2010</option>
                </select>
              </label>
            )}
            {tool.options.includes('india') && (
              <label className="chip flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm"><input type="checkbox" checked={!!opts.india} onChange={(e) => set({ india: e.target.checked })} className="accent-ink" /> India filings only</label>
            )}
            {tool.options.includes('sort') && (
              <label className="flex items-center gap-2 text-sm font-bold">Sort
                <select value={opts.sort} onChange={(e) => set({ sort: e.target.value as ToolOptions['sort'] })} className={sel}><option value="relevance">Most relevant</option><option value="new">Newest first</option></select>
              </label>
            )}
            {tool.options.includes('cities') && (
              <fieldset className="flex flex-wrap items-center gap-2">
                <legend className="sr-only">Cities (up to 3, 1 credit each)</legend>
                <span className="text-sm font-bold">Cities (max 3)</span>
                {REGIONS.map((r) => {
                  const on = opts.cities?.includes(r.id);
                  return (
                    <button key={r.id} type="button" aria-pressed={on} onClick={() => { const cur = opts.cities ?? []; set({ cities: on ? (cur.length > 1 ? cur.filter((c) => c !== r.id) : cur) : cur.length < 3 ? [...cur, r.id] : cur }); }}
                      className="rounded-full border-2 border-ink px-3 py-1 text-xs font-bold" style={{ background: on ? r.color : 'transparent', color: on ? '#fff' : '#0B0B0B' }}>{r.name}</button>
                  );
                })}
              </fieldset>
            )}
            <label className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-ink px-3 py-1.5 text-sm font-bold" style={{ background: demo ? '#FFD60A' : '#FFFDF7' }}>
              <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} className="accent-ink" /> Demo mode · 0 credits
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {demo && sample && <button type="button" onClick={() => { setQuery(sample); void run(sample); }} className="chip px-3 py-1 text-xs">Try the saved sample: “{sample}”</button>}
            {!demo && tool.examples.map((x) => (<button key={x} type="button" onClick={() => { setQuery(x); void run(x); }} className="chip px-3 py-1 text-xs">{x}</button>))}
            {usage && <span className="micro ml-auto">Monthly credits {usage.used}/{usage.limit}</span>}
          </div>
        </form>

        <div aria-live="polite" className="mt-8">
          {error && <p role="alert" className="border-2 border-ink bg-red p-3 text-sm font-bold text-white" style={{ boxShadow: '4px 4px 0 #0B0B0B' }}>{error}</p>}
          {loading && <p className="micro">Fetching live results…</p>}
          {result && !loading && (
            <section aria-label="Results">
              <ul className="grid gap-3 sm:grid-cols-3" aria-label="Summary">
                {result.stats.map((s) => (
                  <li key={s.label} className="card p-4">
                    <div className="micro">{s.label}</div>
                    <div className="font-display text-4xl font-extrabold">{s.value}</div>
                    {s.hint && <div className="mt-1 text-xs text-mute">{s.hint}</div>}
                  </li>
                ))}
              </ul>
              {result.notes.map((n) => (<p key={n} className="mt-4 border-2 border-ink bg-yellow p-3 text-sm font-bold">{n}</p>))}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="micro">{result.demo ? 'Saved sample · 0 credits' : `${result.creditsUsed} credit${result.creditsUsed === 1 ? '' : 's'} used (0 if cached)`}</span>
                {hasOpen && <label className="chip flex cursor-pointer items-center gap-2 px-3 py-1 text-xs"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="accent-ink" /> Free / official only</label>}
              </div>
              <div className={`mt-4 grid gap-6 ${groups.length > 1 ? 'xl:grid-cols-2' : ''}`}>
                {groups.map((g) => (
                  <div key={g.label}>
                    <h3 className="mb-3 font-display text-xl font-extrabold">{g.label}</h3>
                    {g.items.length ? <ul className="space-y-3">{g.items.map((it, i) => <Item key={it.title + i} it={it} />)}</ul> : <p className="text-sm text-mute">Nothing to show here.</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <aside className="space-y-6" aria-label="Guidance">
        <div className="card p-5">
          <h2 className="font-display text-lg font-extrabold">Use it wisely</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">{tool.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        <div className="card p-5">
          <h2 className="font-display text-lg font-extrabold">Official starting points</h2>
          <p className="mt-1 text-xs text-mute">Free, no credits. Always available.</p>
          <ul className="mt-3 space-y-3">
            {tool.official.map((o) => (
              <li key={o.url}>
                <a href={o.url} target="_blank" rel="noreferrer noopener" className="font-bold underline-offset-4 hover:underline">{o.name}<span className="sr-only"> (opens in new tab)</span> ↗</a>
                <div className="text-xs text-mute">{o.note}</div>
              </li>
            ))}
          </ul>
        </div>
        <p className="micro">Engine: {tool.engine}</p>
      </aside>
    </div>
  );
}
