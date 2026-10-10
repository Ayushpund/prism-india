'use client';
import { memo, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { REGION_BY_ID } from '@/lib/regions';
import type { PairOverlap, RegionId } from '@/lib/types';
import { pct, rgba, PALETTE, useReducedMotionPref } from '@/lib/ui';

type Metric = 'url' | 'domain';

function OverlapMatrix({
  regions,
  pairs,
  forced,
  onPair,
  runId,
}: {
  regions: RegionId[];
  pairs: PairOverlap[];
  forced?: [number, number] | null;
  onPair?: (p: [RegionId, RegionId] | null) => void;
  runId: number;
}) {
  const [metric, setMetric] = useState<Metric>('url');
  const [hover, setHover] = useState<[number, number] | null>(null);
  const reduced = useReducedMotionPref();
  const cur = forced ?? hover;
  const n = regions.length;

  const lookup = useMemo(() => {
    const m = new Map<string, PairOverlap>();
    for (const p of pairs) {
      m.set(`${p.a}|${p.b}`, p);
      m.set(`${p.b}|${p.a}`, p);
    }
    return m;
  }, [pairs]);

  const set = (v: [number, number] | null) => {
    setHover(v);
    onPair?.(v && v[0] !== v[1] ? [regions[v[0]], regions[v[1]]] : null);
  };
  const tipPair = cur && cur[0] !== cur[1] ? lookup.get(`${regions[cur[0]]}|${regions[cur[1]]}`) : null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="micro">Overlap matrix // {metric === 'url' ? 'shared URLs' : 'shared domains'} (Jaccard)</div>
        <div className="flex gap-1" role="group" aria-label="Matrix metric">
          {(['url', 'domain'] as Metric[]).map((m) => (
            <button key={m} onClick={() => setMetric(m)} aria-pressed={metric === m} className={`micro rounded-full border px-3 py-1 ${metric === m ? 'border-ink bg-ink text-paper' : 'border-ink bg-card'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="relative mx-auto max-w-xl" onMouseLeave={() => set(null)}>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `3.2rem repeat(${n}, 1fr)` }}>
          <div />
          {regions.map((id, j) => (
            <div key={id} className="micro truncate text-center transition-opacity" style={{ color: REGION_BY_ID[id].color, opacity: cur && cur[1] !== j ? 0.45 : 1 }}>
              {REGION_BY_ID[id].name.slice(0, 3)}
            </div>
          ))}
          {regions.map((ri, i) => (
            <Row key={ri}>
              <div className="micro flex items-center truncate" style={{ color: REGION_BY_ID[ri].color, opacity: cur && cur[0] !== i ? 0.45 : 1 }}>
                {REGION_BY_ID[ri].name.slice(0, 3)}
              </div>
              {regions.map((rj, j) => {
                const diag = i === j;
                const pr = diag ? null : lookup.get(`${ri}|${rj}`);
                const v = diag ? 1 : pr ? (metric === 'url' ? pr.urlJaccard : pr.domainJaccard) : 0;
                const col = diag ? REGION_BY_ID[ri].color : PALETTE.cyan;
                const inCross = cur && (cur[0] === i || cur[1] === j);
                const exact = cur && cur[0] === i && cur[1] === j;
                return (
                  <motion.button
                    key={rj}
                    type="button"
                    initial={reduced ? false : { opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: reduced ? 0 : (i + j) * 0.07 + 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                    onMouseEnter={() => set([i, j])}
                    onFocus={() => set([i, j])}
                    onBlur={() => set(null)}
                    aria-label={diag ? `${REGION_BY_ID[ri].name} with itself` : `${REGION_BY_ID[ri].name} versus ${REGION_BY_ID[rj].name}: ${pct(v)} overlap`}
                    className="relative aspect-square rounded-sm text-[10px] font-bold"
                    style={{
                      background: diag ? rgba(col, 0.28) : rgba(col, 0.05 + v * 0.8),
                      boxShadow: exact ? `inset 0 0 0 3px #0B0B0B` : inCross ? 'inset 0 0 0 2px rgba(11,11,11,0.55)' : 'inset 0 0 0 1.5px rgba(11,11,11,0.18)',
                      color: v > 0.5 ? '#fff' : '#0B0B0B',
                    }}
                  >
                    {diag ? '·' : pct(v)}
                  </motion.button>
                );
              })}
            </Row>
          ))}
        </div>

        {tipPair && cur && (
          <div role="status" className="card pointer-events-none mt-4 p-3 text-xs">
            <div className="micro">
              <span style={{ color: REGION_BY_ID[tipPair.a].color }}>{REGION_BY_ID[tipPair.a].name}</span> ↔ <span style={{ color: REGION_BY_ID[tipPair.b].color }}>{REGION_BY_ID[tipPair.b].name}</span>
            </div>
            <div className="mt-1 text-ink">
              {pct(tipPair.urlJaccard)} of URLs shared · {pct(tipPair.domainJaccard)} of domains shared · {tipPair.sharedUrls} common result{tipPair.sharedUrls === 1 ? '' : 's'}
              {tipPair.rankCorrelation !== null ? ` · rank correlation ${tipPair.rankCorrelation.toFixed(2)}` : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Row = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export default memo(OverlapMatrix);
