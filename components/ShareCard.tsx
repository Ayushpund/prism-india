'use client';
import { forwardRef } from 'react';
import { groupBlindSpots, scoreLabel } from '@/lib/analysis';
import { REGION_BY_ID } from '@/lib/regions';
import type { SearchResponse, RegionOutcome } from '@/lib/types';
import { heat } from '@/lib/ui';
import IndiaMap from './IndiaMap';

export const CARD_W = 1200;
export const CARD_H = 630;
const noop = () => {};

/** Fixed 1200x630 "Divergence Report" poster. No backdrop-filter / animation so it exports cleanly. */
const ShareCard = forwardRef<HTMLDivElement, { report: SearchResponse }>(function ShareCard({ report }, ref) {
  const a = report.analysis;
  const outcomes: Partial<Record<keyof typeof REGION_BY_ID, RegionOutcome>> = {};
  for (const o of report.outcomes) outcomes[o.ok ? o.data.regionId : o.regionId] = o;
  const ids = a ? a.regions : [];
  const div = Object.fromEntries((a?.perRegion ?? []).map((r) => [r.regionId, r.divergence]));
  const score = a?.score ?? 0;
  const hot = heat(score / 100);
  return (
    <div ref={ref} style={{ width: CARD_W, height: CARD_H, background: '#F2EEE3', position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-mono), monospace', color: '#0B0B0B' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(11,11,11,0.12) 1px, transparent 1.2px)', backgroundSize: '22px 22px' }} />
      <div style={{ position: 'absolute', left: 30, top: 28, width: 540 }}>
        <IndiaMap selected={ids} statuses={{}} divergence={div} pairs={a?.pairs ?? []} outcomes={outcomes} running={false} runId={0} hovered={null} onHover={noop} active={null} onSelect={noop} isStatic />
      </div>
      <div style={{ position: 'absolute', left: 590, top: 40, right: 44 }}>
        <div style={{ fontSize: 12, letterSpacing: '0.2em', color: '#1F4BFF', fontWeight: 700 }}>PRISM INDIA // DIVERGENCE REPORT</div>
        <div style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 36, fontWeight: 800, marginTop: 14, lineHeight: 1.15 }}>“{report.query}”</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 14 }}>
          <span style={{ fontFamily: 'var(--font-display), sans-serif', fontSize: 160, fontWeight: 800, lineHeight: 1, color: hot }}>{score}</span>
          <div>
            <div style={{ fontSize: 13, color: '#5B5B55', letterSpacing: '0.14em' }}>/ 100 DIVERGENCE</div>
            <div style={{ fontSize: 18, color: hot, marginTop: 4 }}>{scoreLabel(score).toUpperCase()}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', color: '#5B5B55', marginTop: 20 }}>TOP BLIND SPOTS</div>
        <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
          {groupBlindSpots(a?.blindSpots ?? []).slice(0, 3).map((b) => (
            <div key={b.url} style={{ borderLeft: `6px solid ${REGION_BY_ID[b.missingIn].color}`, paddingLeft: 10, fontSize: 13, lineHeight: 1.3 }}>
              <div style={{ fontFamily: 'var(--font-display), sans-serif' }}>{b.title.length > 62 ? b.title.slice(0, 61) + '…' : b.title}</div>
              <div style={{ fontSize: 11, color: REGION_BY_ID[b.missingIn].color }}>absent in {b.missingAll.map((i) => REGION_BY_ID[i].name.toUpperCase()).join(', ')} · {b.domain}</div>
            </div>
          ))}
          {!a?.blindSpots.length && <div style={{ fontSize: 13, color: '#5B5B55' }}>No fully-missing blockbusters. Regions differ in order and detail.</div>}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 30, right: 30, bottom: 18, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#5B5B55', letterSpacing: '0.12em' }}>
        <span>{ids.map((id) => REGION_BY_ID[id].name.toUpperCase()).join(' · ')}</span>
        <span>LIVE DATA VIA SERPAPI · {new Date(report.createdAt).toISOString().slice(0, 10)}{report.demo ? ' · DEMO DATA' : ''}</span>
      </div>
    </div>
  );
});
export default ShareCard;
