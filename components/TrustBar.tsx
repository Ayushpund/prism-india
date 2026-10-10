import { TRUST_META, TRUST_ORDER, type TrustProfile } from '@/lib/trust';

/** Stacked bar of source categories (official, academic, news, social…). Pattern-free but labelled for screen readers. */
export default function TrustBar({ profile, label }: { profile: TrustProfile; label: string }) {
  const parts = TRUST_ORDER.filter((c) => profile.mix[c] > 0);
  const desc = parts.map((c) => `${profile.mix[c]} ${TRUST_META[c].label}`).join(', ');
  return (
    <div role="img" aria-label={`${label}: trust ${profile.score} of 100. ${desc}`}>
      <div className="flex h-5 w-full overflow-hidden rounded-sm border-2 border-ink bg-card">
        {parts.map((c) => (
          <div key={c} title={`${TRUST_META[c].label}: ${profile.mix[c]}`} style={{ width: `${(profile.mix[c] / Math.max(1, profile.count)) * 100}%`, background: TRUST_META[c].color, borderRight: '2px solid #0B0B0B' }} />
        ))}
      </div>
    </div>
  );
}

export function TrustLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs" aria-label="Legend">
      {TRUST_ORDER.map((c) => (
        <li key={c} className="flex items-center gap-1.5" title={TRUST_META[c].blurb}>
          <span className="inline-block h-3 w-3 border-2 border-ink" style={{ background: TRUST_META[c].color }} aria-hidden />
          <span className="font-bold">{TRUST_META[c].label}</span>
          <span className="text-mute">{TRUST_META[c].score}</span>
        </li>
      ))}
    </ul>
  );
}
