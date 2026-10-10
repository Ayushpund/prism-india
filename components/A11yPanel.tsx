'use client';
import { useEffect, useRef, useState } from 'react';

interface Prefs {
  size: 0 | 1 | 2;
  contrast: boolean;
  dyslexia: boolean;
  calm: boolean;
  spacing: boolean;
}
const DEFAULT: Prefs = { size: 0, contrast: false, dyslexia: false, calm: false, spacing: false };
const KEY = 'prism-a11y';

function apply(p: Prefs) {
  const c = document.documentElement.classList;
  c.toggle('a11y-l1', p.size === 1);
  c.toggle('a11y-l2', p.size === 2);
  c.toggle('a11y-contrast', p.contrast);
  c.toggle('a11y-dyslexia', p.dyslexia);
  c.toggle('a11y-calm', p.calm);
  c.toggle('a11y-spacing', p.spacing);
}

/** Site-wide display settings: text size, contrast, dyslexia-friendly font, calm motion, spacing. Saved in this browser only. */
export default function A11yPanel() {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<Prefs>(DEFAULT);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Prefs | null;
      if (saved) {
        setP({ ...DEFAULT, ...saved });
        apply({ ...DEFAULT, ...saved });
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const set = (patch: Partial<Prefs>) => {
    const next = { ...p, ...patch };
    setP(next);
    apply(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const Toggle = ({ k, label, hint }: { k: 'contrast' | 'dyslexia' | 'calm' | 'spacing'; label: string; hint: string }) => (
    <label className="flex cursor-pointer items-start gap-3 py-2">
      <input type="checkbox" checked={p[k]} onChange={(e) => set({ [k]: e.target.checked })} className="mt-1 h-4 w-4 accent-ink" />
      <span>
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-xs text-mute">{hint}</span>
      </span>
    </label>
  );

  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog" className="chip px-3.5 py-1.5 text-xs">
        <span aria-hidden>Aa</span> Display
      </button>
      {open && (
        <div role="dialog" aria-label="Display settings" className="card absolute right-0 z-50 mt-3 w-[min(20rem,92vw)] p-4 text-left">
          <div className="micro mb-2">Display settings · saved on this device</div>
          <div className="mb-2 flex items-center gap-2" role="group" aria-label="Text size">
            <span className="mr-1 text-sm font-bold">Text size</span>
            {([0, 1, 2] as const).map((s) => (
              <button key={s} type="button" aria-pressed={p.size === s} onClick={() => set({ size: s })} className={`h-9 w-11 rounded-md border-2 border-ink font-bold ${p.size === s ? 'bg-ink text-paper' : 'bg-card'}`} style={{ fontSize: 13 + s * 4 }}>
                A
              </button>
            ))}
          </div>
          <Toggle k="contrast" label="High contrast" hint="Pure white and black, stronger borders" />
          <Toggle k="dyslexia" label="Easy-read font" hint="Lexend: designed to help reading fluency" />
          <Toggle k="spacing" label="Roomier text" hint="More line and word spacing" />
          <Toggle k="calm" label="Calm motion" hint="Turns off animation and the scrolling ticker" />
          <button type="button" onClick={() => set(DEFAULT)} className="btn mt-2 w-full px-3 py-2 text-xs">Reset to default</button>
        </div>
      )}
    </div>
  );
}
