'use client';
import { useEffect, useRef } from 'react';
import { useIsMobile, usePageVisible, useReducedMotionPref } from '@/lib/ui';

/** Slow parallax dust on canvas 2D. Capped at 600 (desktop) / 200 (mobile) particles, paused when tab hidden. */
export default function DustField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mobile = useIsMobile();
  const visible = usePageVisible();
  const reduced = useReducedMotionPref();

  useEffect(() => {
    const c = ref.current;
    if (!c || !visible) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const count = mobile ? 200 : 600;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = c.width = Math.floor(window.innerWidth * dpr);
      h = c.height = Math.floor(window.innerHeight * dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    const colors = ['#22E4FF', '#FF2E88', '#B6FF3B', '#FFB020', '#9aa3b8'];
    const ps = Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(), z: Math.random() * 0.9 + 0.1, c: colors[(Math.random() * 5) | 0], tw: Math.random() * 6.28,
    }));
    let scrollY = window.scrollY;
    const onScroll = () => (scrollY = window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        if (!reduced) {
          p.x += dt * 0.006 * p.z;
          p.y -= dt * 0.004 * p.z;
          if (p.x > 1) p.x = 0;
          if (p.y < 0) p.y = 1;
        }
        const yy = (((p.y - (scrollY / 4000) * p.z) % 1) + 1) % 1;
        const a = (0.06 + 0.16 * Math.sin(now / 1400 + p.tw) ** 2) * p.z;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.c;
        const s = p.z * 1.8 * (w / 1400 + 0.6);
        ctx.fillRect(p.x * w, yy * h, s, s);
      }
      ctx.globalAlpha = 1;
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
    };
  }, [mobile, visible, reduced]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[1] h-full w-full" />;
}
