'use client';
import { useEffect, useRef } from 'react';
import { useMedia } from '@/lib/ui';

/** Trailing-glow cursor. Fine pointers only; adds .has-cursor to <body> to hide the native cursor. */
export default function GlowCursor() {
  const fine = useMedia('(pointer: fine)');
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const dot = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!fine) return;
    document.body.classList.add('has-cursor');
    let x = -100;
    let y = -100;
    const pts = Array.from({ length: 8 }, () => ({ x, y }));
    const move = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
    };
    window.addEventListener('mousemove', move, { passive: true });
    let raf = 0;
    const tick = () => {
      if (dot.current) dot.current.style.transform = `translate(${x}px,${y}px)`;
      let px = x;
      let py = y;
      pts.forEach((p, i) => {
        p.x += (px - p.x) * (reduced ? 1 : 0.35);
        p.y += (py - p.y) * (reduced ? 1 : 0.35);
        px = p.x;
        py = p.y;
        const el = trail.current[i];
        if (el) el.style.transform = `translate(${p.x}px,${p.y}px) scale(${1 - i * 0.09})`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      document.body.classList.remove('has-cursor');
      window.removeEventListener('mousemove', move);
      cancelAnimationFrame(raf);
    };
  }, [fine, reduced]);

  if (!fine) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed left-0 top-0 z-[70]">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) trail.current[i] = el;
          }}
          className="absolute -left-2 -top-2 h-4 w-4 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,228,255,0.55), transparent 70%)', opacity: 0.5 - i * 0.05 }}
        />
      ))}
      <div ref={dot} className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 rounded-full bg-white" style={{ boxShadow: '0 0 10px #22E4FF, 0 0 20px #22E4FF' }} />
    </div>
  );
}
