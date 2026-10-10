import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { SDG_NAMES, TOOLS, TOOL_SDG } from '@/lib/toolsMeta';

export const metadata: Metadata = {
  title: 'Public tools · Prism India',
  description: 'Free tools for learning, research, jobs, news literacy, civic information, patents and accessibility. Built to use very few search credits.',
};

export default function ToolsHub() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="relative z-10 mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-16">
        <p className="micro">Public tools · 7 ways to use search for public good</p>
        <h1 className="mt-3 max-w-4xl font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-6xl md:text-7xl">
          Search that <span className="marker">serves</span> people<span className="text-red">.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed md:text-lg">
          Practical tools for students, job seekers, researchers, inventors, citizens and anyone who needs trustworthy information. Each one runs <b>one search</b> at most, repeats are cached, and Demo mode needs <b>none</b>.
        </p>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <li key={t.id}>
              <Link href={`/tools/${t.id}`} className="card group flex h-full flex-col overflow-hidden transition-transform hover:-translate-y-1">
                <div className="flex items-center justify-between border-b-2 border-ink px-5 py-3" style={{ background: t.color }}>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: t.color === '#FFD60A' ? '#0B0B0B' : '#fff' }}>{t.need}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-ink bg-card font-display text-sm font-extrabold">{t.icon}</span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-display text-2xl font-extrabold">{t.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed">{t.blurb}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border-2 border-ink bg-yellow px-2.5 py-0.5 text-[11px] font-bold">{t.credits === 0 ? '0 credits' : t.id === 'jobs' ? '1 credit per city' : '1 credit'}</span>
                    <span className="font-mono text-[11px] text-mute">{t.engine}</span>
                    {TOOL_SDG[t.id].map((n) => <span key={n} title={SDG_NAMES[n]} className="rounded-full border-2 border-ink bg-card px-2 py-0.5 text-[11px] font-bold">SDG {n}</span>)}
                  </div>
                  <span className="mt-4 text-sm font-bold group-hover:underline">Open tool →</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <section className="card mt-14 grid gap-6 p-6 md:grid-cols-3" aria-label="How credits are saved">
          {[
            ['One search per tool', 'No fan-out. Only the Job Compass asks for more, and only if you add cities.'],
            ['Cached by data type', 'Papers and patents stay cached for 7 days, fact-checks 24 hours, jobs 6 hours. Repeats cost nothing.'],
            ['No AI tokens', 'Results are ranked, labelled and summarised with plain code. No language-model calls are needed.'],
          ].map(([h, p]) => (
            <div key={h}>
              <h2 className="font-display text-lg font-extrabold">{h}</h2>
              <p className="mt-1 text-sm leading-relaxed">{p}</p>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
