'use client';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { REGION_BY_ID } from '@/lib/regions';
import type { RegionDivergence, RegionOutcome } from '@/lib/types';
import { heat, pad2, pct, useIsMobile } from '@/lib/ui';

interface OverviewItem { title: string; body: string; source: string }

/** Turns the flat AI Overview string into a lead sentence plus tidy items with their source tags. */
function parseOverview(text: string): { lead: string; items: OverviewItem[] } {
  const chunks = text.split(/(?<=\([^()]{2,40}\)\.)\s+/).map((c) => c.trim()).filter(Boolean);
  let lead = '';
  const items: OverviewItem[] = [];
  chunks.forEach((raw, i) => {
    let chunk = raw;
    const colon = chunk.indexOf(': ');
    if (i === 0 && colon > 0) {
      const cut = chunk.slice(0, colon).lastIndexOf('. ');
      if (cut > 0) {
        lead = chunk.slice(0, cut + 1).trim();
        chunk = chunk.slice(cut + 2).trim();
      }
    }
    const src = /\(([^()]{2,40})\)\.?\s*$/.exec(chunk);
    const source = src ? src[1] : '';
    const body0 = src ? chunk.slice(0, src.index).trim() : chunk;
    const c = body0.indexOf(': ');
    items.push(c > 0 && c < 90 ? { title: body0.slice(0, c), body: body0.slice(c + 2).trim(), source } : { title: '', body: body0, source });
  });
  if (!lead && items.length > 1 && !items[0].title) lead = items.shift()!.body;
  return { lead, items };
}

function AiOverview({ text }: { text: string }) {
  const { lead, items } = useMemo(() => parseOverview(text), [text]);
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 4);
  return (
    <section aria-label="AI Overview">
      <h3 className="micro mb-2 flex items-center gap-2">AI Overview <span className="rounded-full border-2 border-ink bg-yellow px-2 py-0.5 text-[10px] font-bold text-ink">{items.length} points</span></h3>
      {lead && <p className="mb-3 border-l-8 border-ink bg-yellow/40 p-3 text-[13px] font-bold leading-relaxed">{lead}</p>}
      <ul className="space-y-2">
        {shown.map((it, i) => (
          <li key={i} className="rounded-md border-2 border-ink bg-card p-3">
            {it.title && <div className="text-[13px] font-extrabold leading-snug">{it.title}</div>}
            <p className="mt-0.5 text-[13px] leading-relaxed">{it.body}</p>
            {it.source && <span className="mt-1.5 inline-block rounded-full border-2 border-ink bg-[#D6E0FF] px-2 py-0.5 font-mono text-[10px] font-bold text-[#0B2A9C]">Source: {it.source}</span>}
          </li>
        ))}
      </ul>
      {items.length > 4 && <button type="button" onClick={() => setAll((a) => !a)} aria-expanded={all} className="btn mt-3 w-full px-3 py-2 text-xs">{all ? 'Show fewer' : `Show all ${items.length} points`}</button>}
    </section>
  );
}

export default function RegionPanel({ outcome, regionId, div, onClose }: { outcome: RegionOutcome | undefined; regionId: keyof typeof REGION_BY_ID; div?: RegionDivergence; onClose: () => void }) {
  const r = REGION_BY_ID[regionId];
  const mobile = useIsMobile();
  const d = outcome?.ok ? outcome.data : null;
  return (
    <motion.aside
      role="dialog"
      aria-label={`${r.name} details`}
      initial={mobile ? { y: '100%' } : { x: '105%', opacity: 0.6 }}
      animate={mobile ? { y: 0 } : { x: 0, opacity: 1 }}
      exit={mobile ? { y: '100%' } : { x: '105%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 150, damping: 22 }}
      className="card fixed bottom-0 right-0 top-0 z-40 flex w-full flex-col overflow-hidden md:w-[28rem] max-md:top-[12vh] max-md:rounded-b-none !rounded-r-none"
    >
      <header className="flex items-start justify-between gap-3 border-b-2 border-ink p-4">
        <div>
          <div className="micro" style={{ color: r.color }}>REGION {pad2(r.index)} // {r.name.toUpperCase()} // hl={d?.hl ?? '—'}</div>
          <motion.h2 layoutId={`name-${regionId}`} className="mt-1 flex items-center gap-2 text-2xl font-bold">
            <motion.span layoutId={`dot-${regionId}`} className="inline-block h-3 w-3 rounded-full" style={{ background: r.color, border: '2px solid #0B0B0B' }} />
            {r.name}
          </motion.h2>
          {div && (
            <div className="micro mt-1" style={{ color: heat(div.divergence) }}>
              divergence from consensus {pct(div.divergence)}
            </div>
          )}
        </div>
        <button onClick={onClose} aria-label="Close panel (Esc)" className="btn px-3 py-1 text-xs">esc ✕</button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-4 text-sm">
        {!outcome && <p className="text-mute">No data for this region.</p>}
        {outcome && !outcome.ok && <p className="text-magenta">{outcome.error}</p>}
        {d && (
          <>
            {d.answerBox && (
              <section>
                <h3 className="micro mb-1">Featured snippet</h3>
                <p className="rounded border border-black/10 bg-black/5 p-2 text-[13px]">{d.answerBox.text}</p>
              </section>
            )}
            {d.aiOverview && <AiOverview text={d.aiOverview.text} />}
            <section>
              <h3 className="micro mb-2">Top {d.organic.length} organic results</h3>
              <ol className="space-y-2.5">
                {d.organic.map((o) => {
                  const unique = div?.uniqueDomains.includes(o.domain);
                  return (
                    <li key={o.link}>
                      <a href={o.link} target="_blank" rel="noreferrer" className="font-display hover:underline">
                        <span className="text-mute">{pad2(o.position)}</span> {o.title}
                      </a>
                      <div className="text-[11px]" style={{ color: unique ? r.color : '#9aa3b8' }}>{unique ? '✦ only in this region · ' : ''}{o.domain}</div>
                    </li>
                  );
                })}
              </ol>
            </section>
            {d.relatedQuestions.length > 0 && (
              <section>
                <h3 className="micro mb-1">People also ask</h3>
                <ul className="list-inside list-disc space-y-1 text-[13px]">{d.relatedQuestions.map((q) => <li key={q}>{q}</li>)}</ul>
              </section>
            )}
            {d.news.length > 0 && (
              <section>
                <h3 className="micro mb-1">Top stories</h3>
                <ul className="space-y-2 text-[13px]">
                  {d.news.map((n, i) => (
                    <li key={i}>{n.title}<div className="text-[11px] text-mute">{n.source}{n.date ? ` · ${n.date}` : ''}</div></li>
                  ))}
                </ul>
              </section>
            )}
            {d.warnings.map((w) => <p key={w} className="text-[11px] text-amber">⚠ {w}</p>)}
          </>
        )}
      </div>
    </motion.aside>
  );
}
