'use client';
import { useEffect, useState } from 'react';
import { REGIONS } from '@/lib/regions';
import { useReducedMotionPref } from '@/lib/ui';

const LINES = [
  '> SEARCH OBSERVATORY v1.0 // cold start',
  '> Connecting to 6 regions...',
  ...REGIONS.map((r) => `> REGION ${String(r.index).padStart(2, '0')} // ${r.name.toUpperCase().padEnd(10, ' ')} hl=${r.nativeHl} ........ OK`),
  '> uplink established.',
];

/** Typewriter terminal intro. Click, tap or press any key to skip. */
export default function Boot({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotionPref();
  const [text, setText] = useState('');
  const full = LINES.join('\n');

  useEffect(() => {
    let i = 0;
    const speed = reduced ? 0 : 14;
    if (reduced) {
      setText(full);
      const t = setTimeout(onDone, 900);
      return () => clearTimeout(t);
    }
    const iv = setInterval(() => {
      i += 2;
      setText(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(iv);
        setTimeout(onDone, 650);
      }
    }, speed);
    return () => clearInterval(iv);
  }, [full, onDone, reduced]);

  useEffect(() => {
    const k = () => onDone();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[80] flex cursor-pointer items-center justify-center bg-ink p-6 font-mono" onClick={onDone} role="dialog" aria-label="Boot sequence. Click or press any key to skip.">
      <div className="w-full max-w-2xl">
        <pre className="font-mono whitespace-pre-wrap text-xs leading-6 text-yellow sm:text-sm">
          {text}
          <span className="caret">█</span>
        </pre>
        <button onClick={(e) => { e.stopPropagation(); onDone(); }} className="btn mt-8 px-4 py-1.5 text-xs">
          skip ▸ (click or any key)
        </button>
      </div>
    </div>
  );
}
