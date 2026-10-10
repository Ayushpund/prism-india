'use client';
import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { useReducedMotionPref } from '@/lib/ui';

/** Animated number ticker. */
export default function Ticker({ value, duration = 1.4, className, suffix = '' }: { value: number; duration?: number; className?: string; suffix?: string }) {
  const reduced = useReducedMotionPref();
  const [n, setN] = useState(reduced ? value : 0);
  const prev = useRef(0);
  useEffect(() => {
    if (reduced) {
      setN(value);
      return;
    }
    const c = animate(prev.current, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setN(Math.round(v)) });
    prev.current = value;
    return () => c.stop();
  }, [value, duration, reduced]);
  return (
    <span className={className}>
      {n}
      {suffix}
    </span>
  );
}
