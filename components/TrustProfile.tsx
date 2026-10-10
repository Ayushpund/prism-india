'use client';
import { memo, useMemo } from 'react';
import { REGION_BY_ID } from '@/lib/regions';
import { trustOf } from '@/lib/trust';
import type { RegionData, RegionId } from '@/lib/types';
import TrustBar, { TrustLegend } from './TrustBar';

/** Per-city source-trust profile of the top 10 results: official, academic, news, commercial, social… */
function TrustProfile({ data, order }: { data: Partial<Record<RegionId, RegionData>>; order: RegionId[] }) {
  const rows = useMemo(
    () => order.filter((id) => data[id]).map((id) => ({ id, p: trustOf(data[id]!.organic.map((o) => o.domain)) })).sort((a, b) => b.p.score - a.p.score),
    [data, order],
  );
  if (!rows.length) return null;
  const best = rows[0];
  const worst = rows[rows.length - 1];
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-extrabold md:text-3xl">Source trust by city</h2>
          <p className="micro mt-1">what kind of sources fill each city’s top 10</p>
        </div>
        {rows.length > 1 && (
          <p className="max-w-md text-sm">
            <b>{REGION_BY_ID[best.id].name}</b> gets the most authoritative mix ({best.p.score}/100); <b>{REGION_BY_ID[worst.id].name}</b> the least ({worst.p.score}/100).
          </p>
        )}
      </div>
      <ul className="space-y-3">
        {rows.map(({ id, p }) => (
          <li key={id} className="grid items-center gap-3 sm:grid-cols-[8rem_1fr_3.5rem]">
            <span className="text-sm font-bold" style={{ color: REGION_BY_ID[id].color }}>{REGION_BY_ID[id].name} <span className="font-mono text-[11px] text-mute">hl={data[id]!.hl}</span></span>
            <TrustBar profile={p} label={REGION_BY_ID[id].name} />
            <span className="text-right font-display text-xl font-extrabold">{p.score}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t-2 border-dashed border-black/20 pt-3"><TrustLegend /></div>
      <p className="micro mt-3">Trust rates the type of source (official, academic, news, commercial, social), not whether a page is correct.</p>
    </div>
  );
}
export default memo(TrustProfile);
