'use client';
import { memo, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { normalizeUrl } from '@/lib/analysis';
import { REGION_BY_ID } from '@/lib/regions';
import type { OrganicResult, RegionData, RegionId } from '@/lib/types';
import { pad2, rgba, useIsMobile } from '@/lib/ui';

const ROW = 62;
const GAP = 110;

function List({ items, color, shared, align }: { items: OrganicResult[]; color: string; shared: Set<string>; align: 'left' | 'right' }) {
  return (
    <ol>
      {items.map((o, i) => {
        const isShared = shared.has(normalizeUrl(o.link));
        return (
          <li key={o.link} style={{ height: ROW, padding: '3px 0' }}>
            <a
              href={o.link}
              target="_blank"
              rel="noreferrer"
              className="block h-full overflow-hidden rounded-md px-2.5 py-1.5 text-[11px] leading-tight transition-colors hover:bg-black/10"
              style={{
                textAlign: align,
                border: `2px solid ${isShared ? '#0B0B0B' : color}`,
                boxShadow: isShared ? 'none' : `4px 4px 0 ${color}`,
                background: isShared ? '#FFFDF7' : rgba(color, 0.12),
              }}
            >
              <div className="line-clamp-2 font-display text-[12px]"><span className="text-mute">{pad2(i + 1)}</span> {o.title}</div>
              <div className="truncate text-[10px]" style={{ color: isShared ? '#9aa3b8' : color }}>{isShared ? '◈ shared · ' : '✦ only here · '}{o.domain}</div>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

function SplitReality({
  data,
  pair,
  onPair,
  divider,
  onDivider,
}: {
  data: Partial<Record<RegionId, RegionData>>;
  pair: [RegionId, RegionId];
  onPair: (p: [RegionId, RegionId]) => void;
  divider: number;
  onDivider: (v: number) => void;
}) {
  const mobile = useIsMobile();
  const box = useRef<HTMLDivElement>(null);
  const ids = Object.keys(data) as RegionId[];
  const A = data[pair[0]];
  const B = data[pair[1]];

  const { shared, beams } = useMemo(() => {
    const sh = new Set<string>();
    const bm: { y1: number; y2: number }[] = [];
    if (A && B) {
      const bi = new Map(B.organic.map((o, i) => [normalizeUrl(o.link), i]));
      A.organic.forEach((o, i) => {
        const k = normalizeUrl(o.link);
        if (bi.has(k)) {
          sh.add(k);
          bm.push({ y1: i * ROW + ROW / 2, y2: bi.get(k)! * ROW + ROW / 2 });
        }
      });
    }
    return { shared: sh, beams: bm };
  }, [A, B]);

  if (!A || !B) return <p className="text-sm text-mute">Need at least two regions with results to compare.</p>;
  const ca = REGION_BY_ID[pair[0]].color;
  const cb = REGION_BY_ID[pair[1]].color;
  const H = Math.max(A.organic.length, B.organic.length) * ROW;

  const drag = (e: React.PointerEvent) => {
    if (e.buttons !== 1 && e.type !== 'pointerdown') return;
    const r = box.current!.getBoundingClientRect();
    onDivider(Math.max(25, Math.min(75, ((e.clientX - r.left) / r.width) * 100)));
  };

  const Picker = ({ idx }: { idx: 0 | 1 }) => (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Choose city ${idx + 1}`}>
      {ids.map((id) => {
        const on = pair[idx] === id;
        const other = pair[1 - idx] === id;
        return (
          <button
            key={id}
            disabled={other}
            aria-pressed={on}
            onClick={() => onPair(idx === 0 ? [id, pair[1]] : [pair[0], id])}
            className="micro rounded-full border px-2.5 py-1 disabled:opacity-25"
            style={{ borderColor: '#0B0B0B', color: on ? '#fff' : '#0B0B0B', background: on ? REGION_BY_ID[id].color : '#FFFDF7' }}
          >
            {REGION_BY_ID[id].name}
          </button>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div><div className="micro mb-1.5" style={{ color: ca }}>REALITY A</div><Picker idx={0} /></div>
        <div className="md:text-right"><div className="micro mb-1.5" style={{ color: cb }}>REALITY B</div><div className="md:flex md:justify-end"><Picker idx={1} /></div></div>
      </div>

      {mobile ? (
        <div className="space-y-6">
          {([[A, ca, 'left'], [B, cb, 'left']] as const).map(([d, c], k) => (
            <div key={k}><div className="micro mb-2" style={{ color: c }}>{REGION_BY_ID[d.regionId].name} // hl={d.hl}</div><List items={d.organic} color={c} shared={shared} align="left" /></div>
          ))}
        </div>
      ) : (
        <div ref={box} className="relative select-none" style={{ height: H }} onPointerMove={(e) => e.buttons === 1 && drag(e)}>
          <div className="absolute left-0 top-0 overflow-hidden" style={{ width: `calc(${divider}% - ${GAP / 2}px)` }}>
            <div className="micro absolute -top-5" style={{ color: ca }}>{REGION_BY_ID[pair[0]].name} // hl={A.hl}</div>
            <List items={A.organic} color={ca} shared={shared} align="right" />
          </div>
          <div className="absolute right-0 top-0 overflow-hidden" style={{ width: `calc(${100 - divider}% - ${GAP / 2}px)` }}>
            <div className="micro absolute -top-5 right-0" style={{ color: cb }}>{REGION_BY_ID[pair[1]].name} // hl={B.hl}</div>
            <List items={B.organic} color={cb} shared={shared} align="left" />
          </div>

          {/* light beams across the channel */}
          <svg className="pointer-events-none absolute top-0" style={{ left: `calc(${divider}% - ${GAP / 2}px)`, width: GAP, height: H }} aria-hidden>
            <defs>
              <linearGradient id="beam" x1="0" x2="1"><stop offset="0" stopColor={ca} /><stop offset="1" stopColor={cb} /></linearGradient>
              <filter id="beamglow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            {beams.map((b, i) => (
              <motion.path key={i} d={`M0,${b.y1} C${GAP * 0.5},${b.y1} ${GAP * 0.5},${b.y2} ${GAP},${b.y2}`} fill="none" stroke="url(#beam)" strokeWidth={3} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.9 }} transition={{ delay: 0.1 + i * 0.1, duration: 0.7 }} />
            ))}
          </svg>

          {/* draggable divider */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Divider between the two cities"
            aria-valuemin={25}
            aria-valuemax={75}
            aria-valuenow={Math.round(divider)}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              drag(e);
            }}
            onPointerMove={drag}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') onDivider(Math.max(25, divider - 3));
              if (e.key === 'ArrowRight') onDivider(Math.min(75, divider + 3));
            }}
            className="absolute top-0 z-10 flex h-full w-6 -translate-x-1/2 cursor-ew-resize touch-none justify-center"
            style={{ left: `${divider}%` }}
          >
            <div className="h-full w-[3px]" style={{ background: '#0B0B0B' }} />
            <div className="card absolute top-1/2 flex h-10 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold">⇆</div>
          </div>
        </div>
      )}
      <p className="micro mt-6">{shared.size} shared result{shared.size === 1 ? '' : 's'} linked by lines · coloured cards exist in only one reality</p>
    </div>
  );
}
export default memo(SplitReality);
