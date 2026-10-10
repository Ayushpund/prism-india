import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { getUsage } from '@/lib/cache';
import { rateLimit } from '@/lib/ratelimit';
import { ALL_REGION_IDS } from '@/lib/regions';
import { runTool } from '@/lib/toolsServer';
import type { ToolResult } from '@/lib/toolsTypes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const json = (body: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const schema = z.object({
  tool: z.enum(['learn', 'scholar', 'jobs', 'factcheck', 'civic', 'patents']),
  query: z.string().trim().min(2, 'Enter at least 2 characters').max(160, 'Keep it under 160 characters'),
  demo: z.boolean().default(false),
  options: z
    .object({
      lang: z.enum(['en', 'hi', 'ta', 'bn', 'te', 'mr', 'gu', 'kn', 'ml', 'pa']).optional(),
      year: z.enum(['2024', '2020', '2015', '2010']).optional(),
      india: z.boolean().optional(),
      sort: z.enum(['relevance', 'new']).optional(),
      cities: z.array(z.enum(ALL_REGION_IDS)).max(3, 'Pick up to 3 cities to save credits').optional(),
    })
    .default({}),
});

const demoPath = (tool: string) => path.join(process.cwd(), 'data', 'demo', 'tools', `${tool}.json`);

/** GET ?demo=<tool> -> the saved sample query for that tool (so the UI can pre-fill it). */
export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('demo');
  if (!t || !/^[a-z]+$/.test(t)) return json({ usage: await getUsage() });
  try {
    const d = JSON.parse(await fs.readFile(demoPath(t), 'utf8')) as ToolResult;
    return json({ query: d.query, usage: await getUsage() });
  } catch {
    return json({ query: null, usage: await getUsage() });
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const wait = rateLimit(`tool:${ip}`, 12);
  if (wait) return json({ error: `Rate limit reached. Try again in ${wait}s.` }, 429, { 'retry-after': String(wait) });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.issues.map((i) => i.message).join('; ') }, 400);
  const { tool, query, demo, options } = parsed.data;

  if (demo) {
    try {
      const d = JSON.parse(await fs.readFile(demoPath(tool), 'utf8')) as ToolResult;
      if (d.query.toLowerCase() !== query.toLowerCase()) return json({ error: `Demo mode has one saved search for this tool: "${d.query}". Use it, or turn off Demo Mode.` }, 404);
      return json({ ...d, demo: true, creditsUsed: 0 });
    } catch {
      return json({ error: 'No saved demo for this tool yet. Turn off Demo Mode to run a live search.' }, 404);
    }
  }

  try {
    return json({ result: await runTool(tool, query, options), usage: await getUsage() }.result);
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
}
