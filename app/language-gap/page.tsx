import type { Metadata } from 'next';
import LanguageGapLab from '@/components/LanguageGapLab';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';

export const metadata: Metadata = {
  title: 'Language Gap Lab · Prism India',
  description: 'Does searching in Hindi, Tamil, Bengali or Telugu change which sources you see? Measure the language gap in Google results.',
};

export default function LanguageGapPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="relative z-10 mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
        <span className="sticker">New feature</span>
        <h1 className="mt-4 max-w-5xl font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-6xl md:text-7xl">
          Does your <span className="marker">language</span> limit your internet<span className="text-red">?</span>
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-relaxed md:text-lg">
          Millions of Indians search in Hindi, Tamil, Bengali, Telugu and more. We run the <b>same question twice</b> from the same city, once in the local language and once in English, then compare the pages, the sources and how authoritative they are.
        </p>
        <div className="mt-10"><LanguageGapLab /></div>
      </main>
      <SiteFooter />
    </>
  );
}
