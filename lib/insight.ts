import { insightPayload } from './analysis';
import type { Analysis } from './types';

/** 3-sentence plain-language insight from structured analysis only. Returns null when no key / on failure. */
export async function llmInsight(a: Analysis, names: Record<string, string>, query: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-5-5',
        max_tokens: 250,
        system:
          'You explain how Google search results differ across Indian cities. Use ONLY the JSON facts provided. Write exactly 3 plain-language sentences. No hype, no invented facts, no bullet points.',
        messages: [{ role: 'user', content: JSON.stringify(insightPayload(a, names, query)) }],
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text = j?.content?.[0]?.text;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}
