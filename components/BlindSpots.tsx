'use client';
import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { REGION_BY_ID } from '@/lib/regions';
import { groupBlindSpots, type GroupedBlindSpot } from '@/lib/analysis';
import type { BlindSpot } from '@/lib/types';
import { pad2, useReducedMotionPref, useScramble } from '@/lib/ui';

const bar = (n: number) => '█'.repeat(Math.max(6, Math.min(n, 34)));

function Card({ spot, idx, open, onToggle }: { spot: GroupedBlindSpot; idx: number; open: boolean; onToggle: () => void }) {
  const reduced = useReducedMotionPref();
  const title = useScramble(spot.title, open, 900, reduced);
  const domain = useScramble(spot.domain, open, 700, reduced);
  const miss = REGION_BY_ID[spot.missingIn];
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + idx * 0.08, duration: 0.5 }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={`Blind spot ${idx + 1}: ${spot.title} on ${spot.domain}, ranks ${spot.bestRank} elsewhere but absent in ${spot.missingAll.map((i) => REGION_BY_ID[i].name).join(", ")}. Activate to decrypt.`}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle())}
        className="card group h-full cursor-pointer p-4 outline-none transition-transform hover:-translate-y-1"
        style={{ borderLeft: `8px solid ${miss.color}` }}
      >
        <div className="flex items-center justify-between">
          <span className="micro">BLIND SPOT {pad2(idx + 1)}</span>
          <span className="micro" style={{ color: open ? '#12B76A' : '#E11D2E' }}>{open ? 'DECLASSIFIED' : 'CLASSIFIED'}</span>
        </div>
        <div className={`mt-3 min-h-[3.2rem] break-words font-display text-base leading-snug ${open ? 'text-ink' : 'redact-bar select-none'}`}  aria-hidden>
          {open ? title : bar(spot.title.length)}
        </div>
        <div className={`mt-1 text-xs ${open ? 'font-mono font-bold text-cyan' : 'redact-bar w-1/2 select-none'}`} aria-hidden>{open ? domain : bar(spot.domain.length)}</div>
        <div className="mt-4 space-y-1 border-t border-black/10 pt-3 text-[11px]">
          <div>
            ranks <b>#{spot.bestRank}</b> in{' '}
            {spot.rankedIn.map((id, i) => (
              <span key={id} style={{ color: REGION_BY_ID[id].color }}>{REGION_BY_ID[id].name}{i < spot.rankedIn.length - 1 ? ', ' : ''}</span>
            ))}
          </div>
          <div>
            ▸ <b style={{ color: miss.color }}>ABSENT IN {spot.missingAll.map((i) => REGION_BY_ID[i].name.toUpperCase()).join(", ")}</b>
          </div>
        </div>
        {!open && <div className="micro mt-3 opacity-60 group-hover:opacity-100">hover / focus / tap to decrypt</div>}
      </div>
    </motion.div>
  );
}

function BlindSpots({ spots, forcedOpen }: { spots: BlindSpot[]; forcedOpen?: number | null }) {
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());
  const list = groupBlindSpots(spots).slice(0, 6);
  if (!list.length) return <p className="text-sm text-mute">No widely-ranked result is fully missing from a region for this query. The regions disagree on order and detail, not on the blockbusters.</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((s, i) => (
        <div
          key={s.url}
          onMouseEnter={() => setOpenSet((o) => new Set(o).add(i))}
          onFocus={() => setOpenSet((o) => new Set(o).add(i))}
        >
          <Card spot={s} idx={i} open={openSet.has(i) || forcedOpen === i} onToggle={() => setOpenSet((o) => { const n = new Set(o); if (n.has(i)) n.delete(i); else n.add(i); return n; })} />
        </div>
      ))}
    </div>
  );
}
export default memo(BlindSpots);
