import { NextRequest } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/ratelimit';
import { loadReport, saveReport } from '@/lib/reports';
import type { SearchResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Light structural validation; the payload is a snapshot of a SearchResponse the client already received.
const bodySchema = z.object({
  query: z.string().min(1).max(120),
  langMode: z.enum(['native', 'english']),
  outcomes: z.array(z.object({ ok: z.boolean() }).passthrough()).max(6),
  analysis: z.object({ score: z.number() }).passthrough().nullable(),
  insightSource: z.enum(['llm', 'template']),
  usage: z.object({ used: z.number(), limit: z.number(), month: z.string() }),
  demo: z.boolean(),
  createdAt: z.string(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const wait = rateLimit(`report:${ip}`, 20);
  if (wait) return json({ error: `Rate limit reached. Try again in ${wait}s.` }, 429);
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: 'Invalid report payload.' }, 400);
  const id = await saveReport(parsed.data as unknown as SearchResponse);
  return json({ id, url: `/report/${id}` });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  const report = await loadReport(id);
  return report ? json(report) : json({ error: 'Report not found.' }, 404);
}
