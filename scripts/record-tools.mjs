// Records one live sample per tool into data/demo/tools/*.json (1 credit each, 6 total; cached repeats are free).
// Usage: start `npm run dev`, then `node scripts/record-tools.mjs [baseUrl]`
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:3000';
const samples = [
  { tool: 'learn', query: 'class 12 physics', options: { lang: 'en' } },
  { tool: 'scholar', query: 'groundwater depletion india', options: {} },
  { tool: 'jobs', query: 'data analyst', options: { cities: ['bengaluru'] } },
  { tool: 'factcheck', query: 'hot water cures covid', options: {} },
  { tool: 'civic', query: 'voter id correction', options: { lang: 'en' } },
  { tool: 'patents', query: 'solar water purifier', options: {} },
];
mkdirSync('data/demo/tools', { recursive: true });
for (const s of samples) {
  const res = await fetch(`${base}/api/tool`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...s, demo: false }) });
  const data = await res.json();
  if (!res.ok) {
    console.error(`FAILED ${s.tool}:`, data.error);
    continue;
  }
  data.demo = true;
  data.creditsUsed = 0;
  writeFileSync(`data/demo/tools/${s.tool}.json`, JSON.stringify(data, null, 1));
  const n = data.groups.reduce((a, g) => a + g.items.length, 0);
  console.log(`saved ${s.tool}: ${n} items, stats=${data.stats.map((x) => `${x.label}=${x.value}`).join(', ')}`);
  await new Promise((r) => setTimeout(r, 1200));
}
