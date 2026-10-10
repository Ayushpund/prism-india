'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toPng } from 'html-to-image';
import type { SearchResponse } from '@/lib/types';
import ShareCard, { CARD_H, CARD_W } from './ShareCard';

export default function ReportClient({ report, id }: { report: SearchResponse; id: string }) {
  const card = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (wrap.current?.clientWidth ?? CARD_W) / CARD_W));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const download = async () => {
    if (!card.current) return;
    setBusy(true);
    setErr(null);
    try {
      await new Promise((r) => setTimeout(r, 150)); // let the map canvas paint
      const url = await toPng(card.current, { width: CARD_W, height: CARD_H, pixelRatio: 1, cacheBust: true, style: { transform: 'none' } });
      const a = document.createElement('a');
      a.href = url;
      a.download = `divergence-report-${id}.png`;
      a.click();
    } catch (e) {
      setErr(`Export failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1240px] p-4 md:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="btn px-4 py-2 text-sm">◂ back to observatory</Link>
        <button onClick={download} disabled={busy} className="btn-primary rounded-lg px-5 py-2 text-sm disabled:opacity-60">
          {busy ? 'Rendering…' : 'Download PNG (1200×630)'}
        </button>
      </div>
      {err && <p role="alert" className="mb-3 text-sm text-magenta">{err}</p>}
      <div ref={wrap} className="w-full overflow-hidden border-2 border-ink" style={{ height: CARD_H * scale }}>
        <div style={{ width: CARD_W, height: CARD_H, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          <ShareCard ref={card} report={report} />
        </div>
      </div>
    </main>
  );
}
