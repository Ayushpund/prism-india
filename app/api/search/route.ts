import { NextRequest } from 'next/server';
import { fetchAllRegions } from '@/lib/serpapi';
import { getUsage } from '@/lib/cache';
import { rateLimit } from '@/lib/ratelimit';
import { searchSchema } from '@/lib/schema';
import { analyze, successful, templateSummary } from '@/lib/analysis';
import { llmInsight } from '@/lib/insight';
import { listDemos, loadDemo } from '@/lib/demo';
import { REGION_BY_ID } from '@/lib/regions';
import type { RegionOutcome, SearchResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const json = (body: unknown, status: number, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const names = Object.fromEntries(Object.values(REGION_BY_ID).map((r) => [r.id, r.name]));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET -> credit usage (for the "searches used" counter) + available demo queries. */
export async function GET() {
  return json({ usage: await getUsage(), demoQueries: await listDemos() }, 200);
}

/**
 * POST -> Server-Sent Events stream.
 *  event: start   {regions}
 *  event: region  RegionOutcome       (one per region, as each REALLY finishes)
 *  event: done    SearchResponse
 *  event: error   {message}
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const wait = rateLimit(ip);
  if (wait) return json({ error: `Rate limit reached. Try again in ${wait}s.` }, 429, { 'retry-after': String(wait) });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.issues.map((i) => i.message).join('; ') }, 400);
  const input = parsed.data;

  const demo = input.demo ? await loadDemo(input.query, input.langMode) : null;
  if (input.demo && !demo) return json({ error: `No saved ${input.langMode === 'english' ? 'English' : 'native-language'} demo for "${input.query}". Pick one of the example queries, or turn off Demo Mode.` }, 404);

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        const usedBefore = (await getUsage()).used;
        send('start', { regions: input.regions });
        let outcomes: RegionOutcome[];
        if (demo) {
          // Replay saved data with staggered timing so the UI reacts like a live run.
          outcomes = demo.outcomes.filter((o) => input.regions.includes(o.ok ? o.data.regionId : o.regionId));
          for (const [i, o] of outcomes.entries()) {
            await sleep(350 + i * 450);
            send('region', o);
          }
        } else {
          outcomes = await fetchAllRegions(input, (o) => send('region', o));
        }

        const analysis = analyze(successful(outcomes));
        let insightSource: SearchResponse['insightSource'] = 'template';
        if (analysis) {
          analysis.summary = templateSummary(analysis, names);
          const llm = demo ? null : await llmInsight(analysis, names, input.query);
          if (llm) {
            analysis.summary = llm;
            insightSource = 'llm';
          }
        }
        const response: SearchResponse = {
          query: input.query,
          langMode: demo ? demo.langMode : input.langMode,
          outcomes,
          analysis,
          insightSource,
          usage: await getUsage(),
          creditsUsed: demo ? 0 : (await getUsage()).used - usedBefore,
          demo: !!demo,
          createdAt: demo ? demo.createdAt : new Date().toISOString(),
        };
        send('done', response);
      } catch (e) {
        send('error', { message: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive' } });
}
