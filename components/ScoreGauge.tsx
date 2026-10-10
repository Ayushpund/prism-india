'use client';
import { memo, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, animate, useTransform } from 'framer-motion';
import { FORMULA_TEXT, SCORE_WEIGHTS, scoreLabel } from '@/lib/analysis';
import type { Analysis } from '@/lib/types';
import { heat, pct, useIsMobile, useReducedMotionPref } from '@/lib/ui';
import Ticker from './ui/Ticker';

const R = 104;
const C = 2 * Math.PI * R;
const ARC = 0.75; // 270° gauge

const ROWS: { key: keyof Analysis['breakdown']; label: string; w: number }[] = [
  { key: 'urlDistance', label: 'URL distance', w: SCORE_WEIGHTS.urlDistance },
  { key: 'domainDistance', label: 'Domain distance', w: SCORE_WEIGHTS.domainDistance },
  { key: 'rankDisagreement', label: 'Rank disagreement', w: SCORE_WEIGHTS.rankDisagreement },
  { key: 'blindSpotPressure', label: 'Blind-spot pressure', w: SCORE_WEIGHTS.blindSpotPressure },
  { key: 'answerDivergence', label: 'Answer divergence', w: SCORE_WEIGHTS.answerDivergence },
];

function ScoreGauge({ analysis, runId, onTear }: { analysis: Analysis; runId: number; onTear?: (on: boolean) => void }) {
  const score = analysis.score;
  const reduced = useReducedMotionPref();
  const mobile = useIsMobile();
  const mv = useMotionValue(0);
  const dash = useTransform(mv, (v) => `${(v / 100) * C * ARC} ${C}`);
  const color = useTransform(mv, [0, 100], ['#1F4BFF', '#FF2E3B']);
  const [tearing, setTearing] = useState(false);
  const [tip, setTip] = useState(false);
  const tornFor = useRef(-1);

  useEffect(() => {
    const c = animate(mv, score, { duration: reduced ? 0 : 1.8, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [score, runId, mv, reduced]);

  // Reality Tear: once per result, only when divergence is high (and motion is welcome)
  useEffect(() => {
    if (score < 65 || reduced || mobile || tornFor.current === runId) return;
    tornFor.current = runId;
    const t0 = setTimeout(() => {
      setTearing(true);
      onTear?.(true);
    }, 1500);
    const t1 = setTimeout(() => {
      setTearing(false);
      onTear?.(false);
    }, 1500 + 1250);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
    };
  }, [score, runId, reduced, mobile, onTear]);

  const hot = heat(score / 100);
  return (
    <div className="relative">
      <div className="relative mx-auto" style={{ width: 260, height: 260 }}>
        <svg viewBox="0 0 260 260" className="absolute inset-0" aria-hidden>
          <defs>
            <filter id="gbloom" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g transform="rotate(135 130 130)">
            <circle cx="130" cy="130" r={R} fill="none" stroke="rgba(11,11,11,0.1)" strokeWidth="18" strokeDasharray={`${C * ARC} ${C}`} strokeLinecap="butt" />
            <motion.circle cx="130" cy="130" r={R} fill="none" strokeWidth="18" strokeLinecap="butt" style={{ strokeDasharray: dash, stroke: color }} />
          </g>
          {Array.from({ length: 28 }, (_, i) => {
            const a = ((135 + (i / 27) * 270) * Math.PI) / 180;
            return <line key={i} x1={130 + Math.cos(a) * 82} y1={130 + Math.sin(a) * 82} x2={130 + Math.cos(a) * (i % 9 === 0 ? 70 : 76)} y2={130 + Math.sin(a) * (i % 9 === 0 ? 70 : 76)} stroke="rgba(11,11,11,0.45)" />;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="micro">Divergence Score</span>
          <span className={`tear mt-1 font-display text-7xl font-bold leading-none ${tearing ? 'tearing' : ''}`} style={{ color: hot }} aria-label={`Divergence score ${score} out of 100`}>
            <Ticker value={score} duration={reduced ? 0 : 1.8} />
            <span className="tear-r font-display" aria-hidden>{score}</span>
            <span className="tear-c font-display" aria-hidden>{score}</span>
          </span>
          <span className="micro mt-1" style={{ color: hot }}>{scoreLabel(score)}</span>
        </div>
      </div>

      <div className="relative mt-2 flex justify-center">
        <button
          type="button"
          className="chip micro px-3 py-1"
          aria-describedby="formula-tip"
          onMouseEnter={() => setTip(true)}
          onMouseLeave={() => setTip(false)}
          onFocus={() => setTip(true)}
          onBlur={() => setTip(false)}
          onClick={() => setTip((t) => !t)}
        >
          ⓘ how is this calculated?
        </button>
        {tip && (
          <div id="formula-tip" role="tooltip" className="card absolute bottom-full z-30 mb-2 w-[min(22rem,88vw)] p-3 text-left text-[11px] leading-relaxed">
            <p className="text-ink">{FORMULA_TEXT}</p>
            <ul className="mt-2 space-y-1">
              {ROWS.map((r) => (
                <li key={r.key} className="flex items-center gap-2">
                  <span className="w-36 shrink-0 text-mute">{r.label} ×{r.w}</span>
                  <span className="h-1.5 flex-1 rounded bg-black/10">
                    <span className="block h-full rounded" style={{ width: pct(analysis.breakdown[r.key]), background: heat(analysis.breakdown[r.key]) }} />
                  </span>
                  <span className="w-9 text-right">{pct(analysis.breakdown[r.key])}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
export default memo(ScoreGauge);
