'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TOOLS } from '@/lib/toolsMeta';
import A11yPanel from './A11yPanel';

const NAV = [
  { href: '/', label: 'Compare cities' },
  { href: '/language-gap', label: 'Language gap' },
  { href: '/tools', label: 'Public tools' },
];

export function SiteHeader({ right, strip }: { right?: React.ReactNode; strip?: React.ReactNode }) {
  const path = usePathname();
  const on = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  return (
    <header className="relative z-30 border-b-2 border-ink bg-card">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-yellow focus:p-2 focus:font-bold">Skip to content</a>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Prism India home">
          <span className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-yellow font-display text-lg font-extrabold" style={{ boxShadow: '3px 3px 0 #0B0B0B', borderRadius: 8 }} aria-hidden>P</span>
          <span className="leading-none">
            <span className="block font-display text-lg font-extrabold">Prism India</span>
            <span className="mt-1 block font-mono text-[11px] text-mute">Same search, different India</span>
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={on(n.href) ? 'page' : undefined} className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold ${on(n.href) ? 'border-ink bg-ink text-paper' : 'border-transparent hover:border-ink'}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          {right}
          <A11yPanel />
        </div>
      </div>
      {strip}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-2 border-ink bg-ink text-paper">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.3fr_1fr_1fr] md:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-paper bg-yellow font-display text-xl font-extrabold text-ink" aria-hidden>P</span>
            <span className="font-display text-2xl font-extrabold">Prism India</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/75">
            Prism splits one Google search into six Indian realities, and adds free public-interest tools for learning, research, jobs, news literacy, civic information, patents and accessibility.
          </p>
          <p className="mt-4 inline-block border-2 border-paper px-2 py-1 font-mono text-[11px] uppercase tracking-wider">Built to use few credits</p>
        </div>
        <div>
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-yellow">Public tools</h3>
          <ul className="mt-4 space-y-2 text-sm text-paper/80">
            {TOOLS.map((t) => (
              <li key={t.id}>
                <Link href={`/tools/${t.id}`} className="hover:text-yellow hover:underline">{t.title}</Link> <span className="text-paper/50">· {t.need}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-yellow">Good to know</h3>
          <ul className="mt-4 space-y-2 text-sm text-paper/80">
            <li>Most tools use one search. Repeats are cached, and Demo mode uses none.</li>
            <li>Results shift with personalization, time and device. Treat each run as a snapshot.</li>
            <li>Not legal, medical or financial advice. Use official sources to act.</li>
            <li>Shortcuts on the compare page: <kbd className="font-mono">/</kbd> search · <kbd className="font-mono">1–6</kbd> cities · <kbd className="font-mono">Esc</kbd></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-paper/20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 font-mono text-[11px] uppercase tracking-wider text-paper/60 md:px-8">
          <span>© 2026 Prism India · MIT licensed</span>
          <span>Search data by SerpApi</span>
        </div>
      </div>
    </footer>
  );
}
