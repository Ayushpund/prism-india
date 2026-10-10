'use client';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { geoMercator, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import { REGIONS, REGION_BY_ID } from '@/lib/regions';
import type { PairOverlap, RegionId, RegionOutcome } from '@/lib/types';
import type { RegionStatus } from '@/lib/useSearch';
import { heat, pad2, PALETTE, rgba, useIsMobile, usePageVisible, useReducedMotionPref } from '@/lib/ui';

export const MAP_W = 600;
export const MAP_H = 660;
const SPACING = 6;
const ORB_LL: [number, number] = [79.09, 21.15]; // geographic centre of India (Nagpur): the query radiates from here

interface Dot { x: number; y: number }
interface Geo { dots: Dot[]; project: (ll: [number, number]) => [number, number] }

let geoPromise: Promise<Geo> | null = null;
function loadGeo(): Promise<Geo> {
  geoPromise ??= fetch('/india.topo.json')
    .then((r) => r.json() as Promise<Topology>)
    .then((topo) => {
      const fc = feature(topo, topo.objects.india as never) as unknown as GeoPermissibleObjects;
      const proj = geoMercator().fitExtent([[26, 22], [MAP_W - 26, MAP_H - 22]], fc);
      // rasterise the outline offscreen, then sample a regular grid: dot-matrix clipped to India
      const off = document.createElement('canvas');
      off.width = MAP_W;
      off.height = MAP_H;
      const ctx = off.getContext('2d', { willReadFrequently: true })!;
      ctx.fillStyle = '#fff';
      const coords: number[][][][] = [];
      const g = (fc as unknown as { geometry?: { type: string; coordinates: unknown } }).geometry ?? ((fc as unknown as { features: { geometry: { type: string; coordinates: unknown } }[] }).features?.[0]?.geometry);
      if (g.type === 'MultiPolygon') coords.push(...(g.coordinates as number[][][][]));
      else coords.push(g.coordinates as number[][][]);
      ctx.beginPath();
      for (const poly of coords)
        for (const ring of poly) {
          ring.forEach((p, i) => {
            const [x, y] = proj(p as [number, number])!;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
        }
      ctx.fill('evenodd');
      const data = ctx.getImageData(0, 0, MAP_W, MAP_H).data;
      const dots: Dot[] = [];
      for (let y = SPACING / 2; y < MAP_H; y += SPACING)
        for (let x = SPACING / 2; x < MAP_W; x += SPACING) {
          if (data[((y | 0) * MAP_W + (x | 0)) * 4 + 3] > 128) dots.push({ x: x + (((y / SPACING) | 0) % 2 ? SPACING / 4 : 0), y });
        }
      return { dots, project: (ll) => proj(ll) as [number, number] };
    });
  return geoPromise;
}

export interface IndiaMapProps {
  selected: RegionId[];
  statuses: Partial<Record<RegionId, RegionStatus>>;
  divergence: Partial<Record<RegionId, number>>;
  pairs: PairOverlap[];
  outcomes: Partial<Record<RegionId, RegionOutcome>>;
  running: boolean;
  runId: number;
  query?: string;
  hovered: RegionId | null;
  onHover: (id: RegionId | null) => void;
  active: RegionId | null;
  onSelect: (id: RegionId | null) => void;
  highlightPair?: [RegionId, RegionId] | null;
  isStatic?: boolean;
}

function IndiaMap(p: IndiaMapProps) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mobile = useIsMobile();
  const visible = usePageVisible();
  const reduced = useReducedMotionPref();
  useEffect(() => {
    let live = true;
    loadGeo().then((g) => live && setGeo(g));
    return () => void (live = false);
  }, []);

  const pts = useMemo(() => {
    const o: Partial<Record<RegionId, [number, number]>> = {};
    if (geo) for (const r of REGIONS) o[r.id] = geo.project(r.coords);
    return o;
  }, [geo]);
  const orb = useMemo(() => (geo ? geo.project(ORB_LL) : null), [geo]);

  // live refs so the rAF loop never re-subscribes
  const live = useRef(p);
  live.current = p;
  const ripple0 = useRef(0);
  useEffect(() => {
    ripple0.current = performance.now();
  }, [p.runId]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !geo || !orb) return;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    c.width = MAP_W * dpr;
    c.height = MAP_H * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const rgb = (hexc: string) => [1, 3, 5].map((i) => parseInt(hexc.slice(i, i + 2), 16));
    const colors = Object.fromEntries(REGIONS.map((r) => [r.id, rgb(r.color)])) as Record<RegionId, number[]>;
    const dotsArr = geo.dots;
    let raf = 0;
    const frame = (now: number) => {
      const s = live.current;
      ctx.clearRect(0, 0, MAP_W, MAP_H);
      const beacons = s.selected.filter((id) => s.statuses[id] === 'ok' || s.isStatic).map((id) => ({ id, pt: pts[id]!, col: colors[id] }));
      const elapsed = (now - ripple0.current) / 1000;
      const rings: number[] = [];
      if (!s.isStatic && !reduced && (s.running || elapsed < 2.4)) {
        const period = 1.15;
        const n = s.running ? 4 : 3;
        for (let k = 0; k < n; k++) {
          const t = elapsed - k * period * (s.running ? 1 : 0.35);
          if (t > 0 && t < 2.4) rings.push(t * 330);
          if (s.running && t > 2.4) rings.push(((t % (period * 2.2)) * 330) / 1);
        }
      }
      const pulse = reduced || s.isStatic ? 0 : 0.5 + 0.5 * Math.sin(now / 900);
      for (const d of dotsArr) {
        let r = 11, g = 11, b = 11, a = 0.2;
        // ripple shockwave through the dot grid
        if (rings.length) {
          const dist = Math.hypot(d.x - orb[0], d.y - orb[1]);
          for (const rad of rings) {
            const k = Math.max(0, 1 - Math.abs(dist - rad) / 16);
            if (k > 0) {
              a += k * 0.65;
              r += (31 - r) * k; g += (75 - g) * k; b += (255 - b) * k;
            }
          }
        }
        for (const bc of beacons) {
          const dd = (d.x - bc.pt[0]) ** 2 + (d.y - bc.pt[1]) ** 2;
          const sig = 2600 + pulse * 700;
          if (dd < sig) {
            const k = 1 - dd / sig;
            a += k * 0.75;
            r += (bc.col[0] - r) * k; g += (bc.col[1] - g) * k; b += (bc.col[2] - b) * k;
          }
        }
        ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${Math.min(1, a)})`;
        const sz = a > 0.6 ? 3 : 2.4;
        ctx.fillRect(d.x - sz / 2, d.y - sz / 2, sz, sz);
      }
      for (const rad of rings) {
        ctx.strokeStyle = `rgba(31,75,255,${Math.max(0, 0.7 - rad / 700)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(orb[0], orb[1], rad, 0, Math.PI * 2);
        ctx.stroke();
      }
      const animating = !s.isStatic && !reduced;
      if (animating && visible) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [geo, orb, pts, mobile, visible, reduced, p.statuses, p.isStatic, p.selected]);

  // zoom on selected beacon
  const zoom = p.active && pts[p.active] ? { s: 1.9, x: (0.5 - (pts[p.active]![0] / MAP_W) * 1.9) * 100, y: (0.5 - (pts[p.active]![1] / MAP_H) * 1.9) * 100 } : { s: 1, x: 0, y: 0 };

  const tipRegion = p.hovered && pts[p.hovered] ? p.hovered : null;
  const tipOutcome = tipRegion ? p.outcomes[tipRegion] : undefined;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: `${MAP_W}/${MAP_H}` }}>
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: '0 0' }}
        animate={{ scale: zoom.s, x: `${zoom.x}%`, y: `${zoom.y}%` }}
        transition={{ type: 'spring', stiffness: 90, damping: 20 }}
      >
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden />
        {geo && orb && (
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 h-full w-full" role="group" aria-label="Map of India with six city beacons">
            <defs>
              <filter id="bloom" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {p.pairs.map((pr) => (
                <linearGradient key={pr.a + pr.b} id={`g-${pr.a}-${pr.b}`} gradientUnits="userSpaceOnUse" x1={pts[pr.a]?.[0]} y1={pts[pr.a]?.[1]} x2={pts[pr.b]?.[0]} y2={pts[pr.b]?.[1]}>
                  <stop offset="0" stopColor={REGION_BY_ID[pr.a].color} />
                  <stop offset="1" stopColor={REGION_BY_ID[pr.b].color} />
                </linearGradient>
              ))}
            </defs>

            {/* connection web */}
            {p.pairs.map((pr, i) => {
              const A = pts[pr.a];
              const B = pts[pr.b];
              if (!A || !B) return null;
              const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
              const dx = B[0] - A[0], dy = B[1] - A[1];
              const len = Math.hypot(dx, dy) || 1;
              const bend = Math.min(90, len * 0.28);
              const cx = mx + (dy / len) * bend * (i % 2 ? 1 : -1) - 0, cy = my - (dx / len) * bend * (i % 2 ? 1 : -1) - bend * 0.35;
              const d = `M${A[0]},${A[1]} Q${cx},${cy} ${B[0]},${B[1]}`;
              const j = pr.urlJaccard;
              const low = j < 0.2;
              const hi = p.highlightPair && ((p.highlightPair[0] === pr.a && p.highlightPair[1] === pr.b) || (p.highlightPair[0] === pr.b && p.highlightPair[1] === pr.a));
              const strength = Math.min(1, j * 2);
              return (
                <motion.path
                  key={pr.a + pr.b}
                  d={d}
                  fill="none"
                  strokeLinecap="round"
                  className={low ? 'arc-flow' : undefined}
                  stroke={low ? PALETTE.alert : `url(#g-${pr.a}-${pr.b})`}
                  strokeDasharray={low ? '5 7' : undefined}
                  strokeWidth={hi ? 4 : low ? 1 : 1 + strength * 4}
                  initial={{ opacity: 0, ...(low ? {} : { pathLength: 0 }) }}
                  animate={{ opacity: hi ? 1 : low ? 0.55 : 0.35 + strength * 0.65, ...(low ? {} : { pathLength: 1 }) }}
                  transition={{ duration: 1.1, delay: 0.2 + i * 0.06 }}
                  
                />
              );
            })}

            {/* query orb */}
            {(p.running || p.runId > 0) && (
              <g transform={`translate(${orb[0]},${orb[1]})`} aria-hidden>
                <circle r={p.running ? 10 : 6} fill="#FFD60A" stroke="#0B0B0B" strokeWidth={2.5} />
                <circle r={p.running ? 20 : 11} fill="none" stroke={PALETTE.cyan} strokeOpacity={0.5} />
                {p.query && (
                  <text y={p.running ? 36 : 24} textAnchor="middle" fontSize="9" fill="#0B0B0B" fontWeight="700" letterSpacing="2" style={{ fontFamily: 'var(--font-mono)' }}>
                    {`▸ ${p.query.slice(0, 28).toUpperCase()}`}
                  </text>
                )}
              </g>
            )}

            {/* beacons */}
            {p.selected.map((id) => {
              const pt = pts[id];
              if (!pt) return null;
              const reg = REGION_BY_ID[id];
              const st = p.statuses[id] ?? (p.isStatic ? 'ok' : 'idle');
              const dv = p.divergence[id] ?? 0;
              const ringCol = heat(dv);
              const speed = 2.6 - dv * 1.9; // higher divergence -> faster pulse
              const isOn = p.hovered === id || p.active === id;
              return (
                <g
                  key={id}
                  transform={`translate(${pt[0]},${pt[1]})`}
                  role={p.isStatic ? undefined : 'button'}
                  tabIndex={p.isStatic ? -1 : 0}
                  aria-label={`${reg.name}: ${st === 'ok' ? `divergence ${Math.round(dv * 100)} percent. Open details` : st}`}
                  onMouseEnter={() => p.onHover(id)}
                  onMouseLeave={() => p.onHover(null)}
                  onFocus={() => p.onHover(id)}
                  onBlur={() => p.onHover(null)}
                  onClick={() => p.onSelect(p.active === id ? null : id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), p.onSelect(p.active === id ? null : id))}
                  style={{ cursor: 'pointer', outline: 'none' }}
                >
                  <circle r={18} fill="transparent" />
                  {st === 'ok' && !reduced && !p.isStatic && (
                    <circle r={7} fill="none" stroke={ringCol} strokeWidth={1.5} style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `beacon ${speed}s ease-out infinite` }} />
                  )}
                  {st === "ok" && <circle r={isOn ? 9 : 7} fill={reg.color} stroke="#0B0B0B" strokeWidth={2.5} />}
                  
                  {st === 'pending' && (
                    <circle r={7} fill="none" stroke={reg.color} strokeDasharray="3 3" strokeOpacity={0.7}>
                      {!reduced && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="2s" repeatCount="indefinite" />}
                    </circle>
                  )}
                  {st === 'error' && <path d="M-5,-5 L5,5 M5,-5 L-5,5" stroke={PALETTE.alert} strokeWidth={2} />}
                  {st === 'idle' && <circle r={3} fill={reg.color} opacity={0.35} />}
                  <text x={11} y={4} fontSize="10" fill="#0B0B0B" fontWeight="700" letterSpacing="1" style={{ fontFamily: 'var(--font-mono)', paintOrder: 'stroke' }} stroke="#F2EEE3" strokeWidth={4}>
                    {reg.name.toUpperCase()}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </motion.div>

      {/* holographic tooltip (top 3 results) */}
      <AnimatePresence>
        {tipRegion && !p.isStatic && !p.active && (
          <motion.div
            key={tipRegion}
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="card pointer-events-none absolute z-20 w-64 p-3 text-xs"
            style={{
              left: `${(pts[tipRegion]![0] / MAP_W) * 100}%`,
              top: `${(pts[tipRegion]![1] / MAP_H) * 100}%`,
              transform: `translate(${pts[tipRegion]![0] > MAP_W * 0.55 ? 'calc(-100% - 18px)' : '18px'}, -50%)`,
            }}
          >
            <div className="micro" style={{ color: REGION_BY_ID[tipRegion].color }}>
              REGION {pad2(REGION_BY_ID[tipRegion].index)} // {REGION_BY_ID[tipRegion].name} // hl={tipOutcome?.ok ? tipOutcome.data.hl : '…'}
            </div>
            {tipOutcome?.ok ? (
              <>
                <ol className="mt-2 space-y-1.5">
                  {tipOutcome.data.organic.slice(0, 3).map((o) => (
                    <li key={o.link} className="leading-snug">
                      <span className="text-mute">{o.position}.</span> {o.title.slice(0, 64)}
                      <div className="text-[10px] text-mute">{o.domain}</div>
                    </li>
                  ))}
                </ol>
                <div className="micro mt-2" style={{ color: heat(p.divergence[tipRegion] ?? 0) }}>
                  divergence {Math.round((p.divergence[tipRegion] ?? 0) * 100)}% · click to open
                </div>
              </>
            ) : tipOutcome ? (
              <div className="mt-2 text-magenta">{tipOutcome.error}</div>
            ) : (
              <div className="mt-2 text-mute">awaiting signal…</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(IndiaMap);
