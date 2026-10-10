'use client';
import { useEffect, useRef, useState } from 'react';

export const PALETTE = { void: '#F2EEE3', ink: '#0B0B0B', cyan: '#1F4BFF', magenta: '#FF2E3B', lime: '#12B76A', amber: '#FF9F1C', yellow: '#FFD60A', alert: '#E11D2E' };

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export function mixColor(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  const k = Math.max(0, Math.min(1, t));
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
export const rgba = (c: string, a: number) => {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
};
/** divergence 0..1 -> cyan..magenta */
export const heat = (d: number) => mixColor(PALETTE.cyan, PALETTE.magenta, d);

export function useMedia(query: string, initial = false): boolean {
  const [m, setM] = useState(initial);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}
export const useIsMobile = () => useMedia('(max-width: 768px)');
export function useReducedMotionPref(): boolean {
  const media = useMedia('(prefers-reduced-motion: reduce)');
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const on = () => setCalm(el.classList.contains('a11y-calm'));
    on();
    const mo = new MutationObserver(on);
    mo.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  return media || calm;
}

export function usePageVisible(): boolean {
  const [v, setV] = useState(true);
  useEffect(() => {
    const on = () => setV(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return v;
}

const GLYPHS = '█▓▒░#@%&$01<>/\\|{}[]';
/** Character-scramble reveal. Returns the display text for `target` while `active`; settles over `ms`. */
export function useScramble(target: string, active: boolean, ms = 900, instant = false): string {
  const [out, setOut] = useState(() => (active ? target : ''));
  const raf = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (!active || instant) {
      setOut(active ? target : '');
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const settled = Math.floor(p * target.length);
      let s = '';
      for (let i = 0; i < target.length; i++) s += i < settled || target[i] === ' ' ? target[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      setOut(s);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, active, ms, instant]);
  return out;
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
export const pct = (x: number) => `${Math.round(x * 100)}%`;
