import { promises as fs } from 'fs';
import path from 'path';
import type { SearchResponse } from './types';

export const DEMO_QUERIES = ['best career after 12th', 'is tap water safe to drink', 'how to start a business', 'monsoon health tips'];

export const slugify = (q: string) => q.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const dir = path.join(process.cwd(), 'data', 'demo');

export async function loadDemo(query: string, langMode: 'native' | 'english' = 'native'): Promise<SearchResponse | null> {
  try {
    const file = langMode === 'english' ? `${slugify(query)}.en.json` : `${slugify(query)}.json`;
    return JSON.parse(await fs.readFile(path.join(dir, file), 'utf8')) as SearchResponse;
  } catch {
    return null;
  }
}

export async function listDemos(): Promise<string[]> {
  try {
    const files = await fs.readdir(dir);
    const names: string[] = [];
    for (const f of files.filter((x) => x.endsWith('.json') && !x.endsWith('.en.json'))) {
      const d = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8')) as SearchResponse;
      names.push(d.query);
    }
    return names;
  } catch {
    return [];
  }
}
