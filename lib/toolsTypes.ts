import type { ToolId } from './toolsMeta';

export type Tone = 'good' | 'warn' | 'info';

export interface ToolItem {
  title: string;
  link?: string;
  source?: string;
  snippet?: string;
  badges: { label: string; tone: Tone }[];
  facts: { label: string; value: string }[];
  /** open-access / free to read */
  open?: boolean;
}

export interface ToolGroup {
  label: string;
  items: ToolItem[];
}

export interface ToolResult {
  tool: ToolId;
  query: string;
  groups: ToolGroup[];
  stats: { label: string; value: string; hint?: string }[];
  notes: string[];
  creditsUsed: number;
  demo: boolean;
  createdAt: string;
}

export interface ToolOptions {
  lang?: string;
  year?: string;
  india?: boolean;
  sort?: 'relevance' | 'new';
  cities?: string[];
}
