import { z } from 'zod';
import { ALL_REGION_IDS } from './regions';

export const searchSchema = z.object({
  query: z.string().trim().min(2, 'Query must be at least 2 characters').max(120, 'Query must be 120 characters or fewer'),
  regions: z.array(z.enum(ALL_REGION_IDS)).min(2, 'Select at least 2 regions to compare').max(6),
  langMode: z.enum(['native', 'english']).default('native'),
  includeNews: z.boolean().default(false),
  demo: z.boolean().default(false),
});
export type SearchInput = z.infer<typeof searchSchema>;
