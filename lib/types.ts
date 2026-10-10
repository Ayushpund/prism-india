export type RegionId = 'mumbai' | 'delhi' | 'chennai' | 'kolkata' | 'hyderabad' | 'bengaluru';

export interface Region {
  id: RegionId;
  index: number;
  name: string;
  location: string; // SerpApi canonical location
  nativeHl: string;
  color: string;
  /** [lon, lat] */
  coords: [number, number];
}

export interface OrganicResult {
  position: number;
  title: string;
  link: string;
  domain: string;
  snippet: string;
}

export interface AnswerBox {
  type: string;
  title?: string;
  text: string;
  source?: string;
}

export interface AiOverview {
  text: string;
  sources: { title: string; link: string }[];
}

export interface NewsItem {
  title: string;
  source: string;
  date: string;
  link?: string;
}

export interface RegionData {
  regionId: RegionId;
  hl: string;
  organic: OrganicResult[];
  answerBox: AnswerBox | null;
  aiOverview: AiOverview | null;
  relatedQuestions: string[];
  news: NewsItem[];
  fromCache: boolean;
  warnings: string[];
}

export type RegionOutcome =
  | { ok: true; data: RegionData }
  | { ok: false; regionId: RegionId; hl: string; error: string };

export type LangMode = 'native' | 'english';

export interface SearchRequest {
  query: string;
  regions: RegionId[];
  langMode: LangMode;
  includeNews: boolean;
}

export interface PairOverlap {
  a: RegionId;
  b: RegionId;
  urlJaccard: number;
  domainJaccard: number;
  rankCorrelation: number | null; // Spearman over shared URLs, null if <2 shared
  sharedUrls: number;
}

export interface BlindSpot {
  url: string;
  title: string;
  domain: string;
  bestRank: number;
  rankedIn: RegionId[];
  missingIn: RegionId;
}

export interface RegionDivergence {
  regionId: RegionId;
  /** 0..1 distance from consensus (1 - mean URL/domain similarity to others) */
  divergence: number;
  uniqueDomains: string[];
}

export interface Analysis {
  regions: RegionId[];
  pairs: PairOverlap[];
  perRegion: RegionDivergence[];
  blindSpots: BlindSpot[];
  answerDivergence: { snippetDiffers: boolean; aiOverviewDiffers: boolean; value: number };
  score: number;
  breakdown: { urlDistance: number; domainDistance: number; rankDisagreement: number; blindSpotPressure: number; answerDivergence: number };
  summary: string;
}

export interface SearchResponse {
  query: string;
  langMode: LangMode;
  outcomes: RegionOutcome[];
  analysis: Analysis | null;
  insightSource: 'llm' | 'template';
  usage: UsageInfo;
  demo: boolean;
  creditsUsed?: number;
  createdAt: string;
}

export interface UsageInfo {
  used: number;
  limit: number;
  month: string;
}
