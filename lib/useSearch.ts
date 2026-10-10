'use client';
import { useCallback, useRef, useState } from 'react';
import type { LangMode, RegionId, RegionOutcome, SearchResponse, UsageInfo } from './types';

export type RegionStatus = 'idle' | 'pending' | 'ok' | 'error';

export interface SearchState {
  phase: 'idle' | 'loading' | 'done' | 'error';
  query: string;
  statuses: Partial<Record<RegionId, RegionStatus>>;
  outcomes: Partial<Record<RegionId, RegionOutcome>>;
  response: SearchResponse | null;
  error: string | null;
  /** monotonically increasing id for each run (used to trigger one-shot effects) */
  runId: number;
}

export interface RunOptions {
  query: string;
  regions: RegionId[];
  langMode: LangMode;
  includeNews: boolean;
  demo: boolean;
}

const initial: SearchState = { phase: 'idle', query: '', statuses: {}, outcomes: {}, response: null, error: null, runId: 0 };

/** Parses an SSE stream from POST /api/search and exposes REAL per-region loading state. */
export function useSearch() {
  const [state, setState] = useState<SearchState>(initial);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [demoQueries, setDemoQueries] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const refreshUsage = useCallback(async () => {
    try {
      const r = await fetch('/api/search');
      const j = await r.json();
      setUsage(j.usage);
      setDemoQueries(j.demoQueries ?? []);
    } catch {
      /* counter is non-critical */
    }
  }, []);

  const run = useCallback(async (opts: RunOptions) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const statuses: SearchState['statuses'] = {};
    opts.regions.forEach((r) => (statuses[r] = 'pending'));
    setState((s) => ({ phase: 'loading', query: opts.query, statuses, outcomes: {}, response: null, error: null, runId: s.runId + 1 }));

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(opts),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (HTTP ${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const ev = /^event: (.+)$/m.exec(block)?.[1];
          const data = /^data: (.+)$/m.exec(block)?.[1];
          if (!ev || !data) continue;
          const payload = JSON.parse(data);
          if (ev === 'region') {
            const o = payload as RegionOutcome;
            const id = o.ok ? o.data.regionId : o.regionId;
            setState((s) => ({ ...s, statuses: { ...s.statuses, [id]: o.ok ? 'ok' : 'error' }, outcomes: { ...s.outcomes, [id]: o } }));
          } else if (ev === 'done') {
            const r = payload as SearchResponse;
            setUsage(r.usage);
            setState((s) => ({ ...s, phase: 'done', response: r }));
          } else if (ev === 'error') {
            throw new Error(payload.message);
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setState((s) => ({ ...s, phase: 'error', error: (e as Error).message }));
    }
  }, []);

  return { state, usage, demoQueries, run, refreshUsage };
}
