import { getUsage } from './cache';
import { REGION_BY_ID } from './regions';
import { domainOf, serpCall } from './serpapi';
import type { ToolId } from './toolsMeta';
import type { ToolGroup, ToolItem, ToolOptions, ToolResult } from './toolsTypes';
import type { RegionId } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

const H = 3600_000;
const TTL: Record<string, number> = { learn: 7 * 24 * H, scholar: 7 * 24 * H, patents: 7 * 24 * H, civic: 7 * 24 * H, factcheck: 24 * H, jobs: 6 * H };

const FACT_CHECKERS = ['altnews.in', 'boomlive.in', 'factly.in', 'newschecker.in', 'vishvasnews.com', 'thequint.com', 'factcheck.org', 'snopes.com', 'reuters.com', 'afp.com', 'factchecker.in', 'indiatoday.in', 'pib.gov.in', 'logically.ai', 'digiteye.in', 'thehindu.com', 'newsmobile.in', 'teyit.org', 'fullfact.org', 'politifact.com', 'poynter.org'];
const FACT_ONLY = ['altnews.in', 'boomlive.in', 'factly.in', 'newschecker.in', 'vishvasnews.com', 'factcheck.org', 'snopes.com', 'factchecker.in', 'digiteye.in', 'newsmobile.in', 'fullfact.org', 'politifact.com', 'logically.ai', 'poynter.org'];
const SOCIAL = ['x.com', 'twitter.com', 'facebook.com', 'instagram.com', 'reddit.com', 'quora.com', 'tiktok.com'];
const LEARN_PLATFORMS = ['swayam.gov.in', 'nptel.ac.in', 'diksha.gov.in', 'ncert.nic.in', 'khanacademy.org', 'coursera.org', 'edx.org', 'ndl.iitkgp.ac.in', 'ocw.mit.edu', 'youtube.com'];
const DEBUNK = /\b(false|fake|misleading|hoax|baseless|no evidence|unproven|doctored|old video|fabricated|myth|debunk)/i;
const CONFIRM = /\b(true|correct|confirmed|verified|accurate)\b/i;

const isOfficial = (d: string) => /(^|\.)(gov\.in|nic\.in)$/.test(d);
const isEdu = (d: string) => /(^|\.)(ac\.in|edu\.in|edu)$/.test(d);
const inList = (d: string, list: string[]) => list.some((x) => d === x || d.endsWith('.' + x));
const clip = (s: unknown, n = 240) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

function organic(json: Json): { title: string; link: string; snippet: string; domain: string }[] {
  return ((json.organic_results as Json[]) ?? [])
    .filter((r) => r.link && r.title)
    .slice(0, 10)
    .map((r) => ({ title: String(r.title), link: String(r.link), snippet: clip(r.snippet), domain: domainOf(String(r.link)) }));
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '0%');

async function learn(q: string, o: ToolOptions): Promise<Pick<ToolResult, 'groups' | 'stats' | 'notes'>> {
  const scope = 'site:gov.in OR site:nic.in OR site:ac.in';
  const { json } = await serpCall({ engine: 'google', q: `${q} (${scope})`, gl: 'in', hl: o.lang ?? 'en', google_domain: 'google.co.in', num: '10', location: 'India' }, { ttlMs: TTL.learn });
  const items: ToolItem[] = organic(json).map((r) => {
    const gov = isOfficial(r.domain) || isEdu(r.domain);
    const known = inList(r.domain, LEARN_PLATFORMS);
    return { title: r.title, link: r.link, source: r.domain, snippet: r.snippet, open: gov, badges: [gov ? { label: isEdu(r.domain) ? 'Academic' : 'Government', tone: 'good' as const } : r.domain.endsWith('youtube.com') ? { label: 'Video lesson', tone: 'info' as const } : known ? { label: 'Course platform', tone: 'info' as const } : { label: 'Check source', tone: 'warn' as const }], facts: [] };
  });
  const gov = items.filter((i) => i.open).length;
  return { groups: [{ label: 'Learning resources', items }], stats: [{ label: 'Results', value: String(items.length) }, { label: 'Government / academic', value: pct(gov, items.length), hint: 'gov.in, nic.in, ac.in sources' }], notes: items.length ? [] : ['No results from trusted learning sites. Try a broader topic.'] };
}

async function scholar(q: string, o: ToolOptions) {
  const p: Record<string, string> = { engine: 'google_scholar', q, hl: 'en', num: '10' };
  if (o.year) p.as_ylo = o.year;
  const { json } = await serpCall(p, { ttlMs: TTL.scholar });
  const items: ToolItem[] = ((json.organic_results as Json[]) ?? []).slice(0, 10).map((r) => {
    const cites = Number(r.inline_links?.cited_by?.total ?? 0);
    const pdf = (r.resources as Json[] | undefined)?.find((x) => x.link);
    const link = String(pdf?.link ?? r.link ?? '');
    return {
      title: String(r.title ?? ''),
      link: link || undefined,
      source: clip(r.publication_info?.summary, 120),
      snippet: clip(r.snippet),
      open: !!pdf,
      badges: [...(pdf ? [{ label: `${pdf.file_format ?? 'PDF'} free`, tone: 'good' as const }] : []), ...(cites >= 100 ? [{ label: 'Highly cited', tone: 'info' as const }] : [])],
      facts: [{ label: 'Cited by', value: String(cites) }],
    };
  });
  const total = items.reduce((s, i) => s + Number(i.facts[0]?.value ?? 0), 0);
  const free = items.filter((i) => i.open).length;
  return { groups: [{ label: 'Papers', items }], stats: [{ label: 'Papers', value: String(items.length) }, { label: 'Total citations', value: total.toLocaleString('en-IN') }, { label: 'Free to read', value: pct(free, items.length) }], notes: [] };
}

async function jobs(q: string, o: ToolOptions) {
  const ids = ((o.cities?.length ? o.cities : ['bengaluru']) as RegionId[]).filter((c) => REGION_BY_ID[c]).slice(0, 6);
  const settled = await Promise.allSettled(
    ids.map((id) => serpCall({ engine: 'google_jobs', q, location: REGION_BY_ID[id].location, hl: 'en', gl: 'in' }, { ttlMs: TTL.jobs }).then((r) => ({ id, json: r.json }))),
  );
  const notes: string[] = [];
  const groups: ToolGroup[] = settled.map((s, i) => {
    if (s.status === 'rejected') {
      notes.push(`${REGION_BY_ID[ids[i]].name}: ${(s.reason as Error).message}`);
      return { label: REGION_BY_ID[ids[i]].name, items: [] };
    }
    const items: ToolItem[] = ((s.value.json.jobs_results as Json[]) ?? []).slice(0, 8).map((j) => {
      const ext = j.detected_extensions ?? {};
      const apply = (j.apply_options as Json[] | undefined)?.[0]?.link ?? j.share_link;
      return {
        title: String(j.title ?? ''),
        link: apply ? String(apply) : undefined,
        source: `${j.company_name ?? ''} · ${j.location ?? ''}`,
        snippet: clip(j.description, 200),
        badges: [...(ext.work_from_home ? [{ label: 'Remote', tone: 'info' as const }] : []), ...(ext.salary ? [{ label: 'Pay listed', tone: 'good' as const }] : [])],
        facts: [ext.posted_at && { label: 'Posted', value: String(ext.posted_at) }, ext.schedule_type && { label: 'Type', value: String(ext.schedule_type) }, ext.salary && { label: 'Pay', value: String(ext.salary) }, j.via && { label: 'Via', value: String(j.via).replace(/^via /i, '') }].filter(Boolean) as ToolItem['facts'],
      };
    });
    return { label: REGION_BY_ID[ids[i]].name, items };
  });
  const all = groups.flatMap((g) => g.items);
  return { groups, stats: [{ label: 'Listings', value: String(all.length) }, { label: 'With pay listed', value: pct(all.filter((i) => i.badges.some((b) => b.label === 'Pay listed')).length, all.length) }, { label: 'Cities', value: String(groups.length) }], notes };
}

async function factcheck(q: string) {
  const { json } = await serpCall({ engine: 'google', q: `${q} fact check`, gl: 'in', hl: 'en', google_domain: 'google.co.in', num: '10', location: 'India' }, { ttlMs: TTL.factcheck });
  let debunk = 0;
  let confirm = 0;
  const items: ToolItem[] = organic(json).map((r) => {
    const checker = inList(r.domain, FACT_ONLY);
    const text = `${r.title} ${r.snippet}`;
    const d = DEBUNK.test(text);
    const c = !d && CONFIRM.test(text);
    if (checker && d) debunk++;
    if (checker && c) confirm++;
    return { title: r.title, link: r.link, source: r.domain, snippet: r.snippet, badges: [...(checker ? [{ label: 'Fact-checker', tone: 'good' as const }] : inList(r.domain, FACT_CHECKERS) ? [{ label: 'Newsroom', tone: 'info' as const }] : []), ...(isOfficial(r.domain) ? [{ label: 'Official', tone: 'good' as const }] : []), ...(inList(r.domain, SOCIAL) ? [{ label: 'Social post: verify', tone: 'warn' as const }] : []), ...(d ? [{ label: 'Debunk words', tone: 'warn' as const }] : c ? [{ label: 'Confirm words', tone: 'info' as const }] : [])], facts: [] };
  });
  const checkers = items.filter((i) => i.badges.some((b) => b.label === 'Fact-checker')).length;
  return {
    groups: [{ label: 'What fact-checkers and newsrooms say', items }],
    stats: [{ label: 'Fact-checker results', value: String(checkers), hint: 'Known fact-checking organisations' }, { label: 'Debunk signals', value: String(debunk), hint: 'Keywords like "false", "misleading"' }, { label: 'Confirm signals', value: String(confirm) }],
    notes: checkers === 0 ? ['No known fact-checker has covered this claim in the results. That is not proof it is true. Verify with two independent sources.'] : ['Keyword signals are hints only. Open the article to read the actual verdict.'],
  };
}

async function civic(q: string, o: ToolOptions) {
  const { json } = await serpCall({ engine: 'google', q: `${q} (site:gov.in OR site:nic.in)`, gl: 'in', hl: o.lang ?? 'en', google_domain: 'google.co.in', num: '10', location: 'India' }, { ttlMs: TTL.civic });
  const items: ToolItem[] = organic(json).map((r) => ({ title: r.title, link: r.link, source: r.domain, snippet: r.snippet, open: true, badges: [isOfficial(r.domain) ? { label: 'Official .gov.in / .nic.in', tone: 'good' as const } : { label: 'Verify', tone: 'warn' as const }], facts: [] }));
  const off = items.filter((i) => i.badges[0]?.tone === 'good').length;
  return { groups: [{ label: 'Official sources', items }], stats: [{ label: 'Results', value: String(items.length) }, { label: 'Official domains', value: pct(off, items.length) }], notes: items.length ? ['Apply only on official sites. Government services never need an agent.'] : ['No official pages found. Try different words or English.'] };
}

async function patents(q: string, o: ToolOptions) {
  const p: Record<string, string> = { engine: 'google_patents', q, num: '10' };
  if (o.india) p.country = 'IN';
  if (o.sort === 'new') p.sort = 'new';
  const { json } = await serpCall(p, { ttlMs: TTL.patents });
  const items: ToolItem[] = ((json.organic_results as Json[]) ?? []).slice(0, 10).map((r) => {
    const id = String(r.publication_number ?? r.patent_id ?? '').replace(/^patent\//, '').replace(/\/en$/, '');
    const link = r.patent_link ?? (r.patent_id ? `https://patents.google.com/${r.patent_id}` : r.pdf);
    return {
      title: String(r.title ?? '').replace(/<[^>]+>/g, ''),
      link: link ? String(link) : undefined,
      source: [r.assignee, r.inventor].filter(Boolean).join(' · '),
      snippet: clip(String(r.snippet ?? '').replace(/<[^>]+>/g, '')),
      open: !!r.pdf,
      badges: [...(r.grant_date ? [{ label: 'Granted', tone: 'good' as const }] : [{ label: 'Application', tone: 'info' as const }]), ...(String(id).startsWith('IN') ? [{ label: 'India', tone: 'info' as const }] : [])],
      facts: [id && { label: 'Number', value: id }, r.priority_date && { label: 'Priority', value: String(r.priority_date) }, r.filing_date && { label: 'Filed', value: String(r.filing_date) }, r.grant_date && { label: 'Granted', value: String(r.grant_date) }].filter(Boolean) as ToolItem['facts'],
    };
  });
  const granted = items.filter((i) => i.badges.some((b) => b.label === 'Granted')).length;
  return { groups: [{ label: 'Patents and applications', items }], stats: [{ label: 'Patents found', value: String(items.length) }, { label: 'Granted', value: pct(granted, items.length) }], notes: items.length >= 8 ? ['Many close matches: your idea may need a clearer difference. Consult a patent attorney.'] : ['Few close matches here. That is a starting signal, not proof of novelty.'] };
}

export async function runTool(tool: ToolId, query: string, options: ToolOptions): Promise<ToolResult> {
  const before = (await getUsage()).used;
  let part: Pick<ToolResult, 'groups' | 'stats' | 'notes'>;
  switch (tool) {
    case 'learn': part = await learn(query, options); break;
    case 'scholar': part = await scholar(query, options); break;
    case 'jobs': part = await jobs(query, options); break;
    case 'factcheck': part = await factcheck(query); break;
    case 'civic': part = await civic(query, options); break;
    case 'patents': part = await patents(query, options); break;
    default: throw new Error('This tool runs in your browser.');
  }
  return { tool, query, ...part, creditsUsed: (await getUsage()).used - before, demo: false, createdAt: new Date().toISOString() };
}
