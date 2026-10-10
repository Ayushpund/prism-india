import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AccessLab from '@/components/AccessLab';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import ToolWorkbench from '@/components/ToolWorkbench';
import { SDG_NAMES, TOOLS, TOOL_BY_ID, TOOL_SDG, type ToolId } from '@/lib/toolsMeta';

export function generateStaticParams() {
  return TOOLS.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const t = TOOL_BY_ID[id as ToolId];
  return t ? { title: `${t.title} · Prism India`, description: t.blurb } : {};
}

export default async function ToolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tool = TOOL_BY_ID[id as ToolId];
  if (!tool) notFound();
  return (
    <>
      <SiteHeader />
      <main id="main" className="relative z-10 mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <nav aria-label="Breadcrumb" className="micro mb-4"><Link href="/tools" className="hover:underline">Public tools</Link> / {tool.need}</nav>
        <div className="mb-8 flex flex-wrap items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-ink font-display text-xl font-extrabold" style={{ background: tool.color, color: tool.color === '#FFD60A' ? '#0B0B0B' : '#fff', boxShadow: '4px 4px 0 #0B0B0B' }} aria-hidden>{tool.icon}</span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">{tool.title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-relaxed md:text-lg">{tool.blurb}</p>
            <p className="mt-3 flex flex-wrap gap-2" aria-label="UN Sustainable Development Goals supported">{TOOL_SDG[tool.id].map((n) => <span key={n} className="rounded-full border-2 border-ink bg-card px-3 py-0.5 text-xs font-bold">SDG {n} · {SDG_NAMES[n]}</span>)}</p>
          </div>
        </div>
        {tool.id === 'access' ? <AccessLab tool={tool} /> : <ToolWorkbench tool={tool} />}
      </main>
      <SiteFooter />
    </>
  );
}
