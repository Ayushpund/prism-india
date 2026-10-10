import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { SearchResponse } from './types';

const dir = path.join(process.cwd(), '.cache', 'reports');
const mem = new Map<string, SearchResponse>();

export const reportId = (r: SearchResponse) => createHash('sha256').update(r.query + r.createdAt + r.langMode).digest('hex').slice(0, 10);

export async function saveReport(r: SearchResponse): Promise<string> {
  const id = reportId(r);
  mem.set(id, r);
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify(r));
  } catch {
    /* memory fallback */
  }
  return id;
}

export async function loadReport(id: string): Promise<SearchResponse | null> {
  if (!/^[a-f0-9]{10}$/.test(id)) return null;
  if (mem.has(id)) return mem.get(id)!;
  try {
    return JSON.parse(await fs.readFile(path.join(dir, `${id}.json`), 'utf8')) as SearchResponse;
  } catch {
    return null;
  }
}
