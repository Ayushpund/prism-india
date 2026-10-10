/** Source-trust classification. Pure, client-safe, transparent: a domain list plus suffix rules. */
export type TrustCat = 'official' | 'academic' | 'factcheck' | 'reference' | 'news' | 'commercial' | 'social';

export const TRUST_META: Record<TrustCat, { label: string; score: number; color: string; blurb: string }> = {
  official: { label: 'Official', score: 100, color: '#12B76A', blurb: 'Government and intergovernmental bodies (.gov.in, .nic.in, who.int…)' },
  academic: { label: 'Academic', score: 90, color: '#1F4BFF', blurb: 'Universities and journals (.ac.in, .edu, Nature…)' },
  factcheck: { label: 'Fact-check', score: 90, color: '#7B2CFF', blurb: 'Known fact-checking organisations' },
  reference: { label: 'Reference', score: 70, color: '#00A3C4', blurb: 'Encyclopedias and medical references' },
  news: { label: 'News', score: 60, color: '#FF9F1C', blurb: 'Established news publishers' },
  commercial: { label: 'Commercial', score: 30, color: '#9AA0A6', blurb: 'Businesses, blogs, coaching sites, SEO pages' },
  social: { label: 'Social / UGC', score: 20, color: '#FF2E63', blurb: 'Social posts, forums, user-generated video' },
};
export const TRUST_ORDER: TrustCat[] = ['official', 'academic', 'factcheck', 'reference', 'news', 'commercial', 'social'];

const FACT = ['altnews.in', 'boomlive.in', 'factly.in', 'newschecker.in', 'vishvasnews.com', 'factcheck.org', 'snopes.com', 'factchecker.in', 'digiteye.in', 'newsmobile.in', 'fullfact.org', 'politifact.com', 'logically.ai', 'poynter.org'];
const OFFICIAL_HOSTS = ['who.int', 'un.org', 'europa.eu', 'nhs.uk', 'worldbank.org', 'unicef.org', 'unesco.org', 'cdc.gov', 'nih.gov'];
const ACADEMIC_HOSTS = ['nature.com', 'sciencedirect.com', 'springer.com', 'jstor.org', 'researchgate.net', 'ncbi.nlm.nih.gov', 'pubmed.ncbi.nlm.nih.gov', 'thelancet.com', 'bmj.com', 'plos.org', 'arxiv.org', 'ssrn.com', 'wiley.com', 'tandfonline.com', 'ieee.org', 'acm.org'];
const REFERENCE = ['wikipedia.org', 'britannica.com', 'mayoclinic.org', 'clevelandclinic.org', 'webmd.com', 'investopedia.com'];
const NEWS = [
  'thehindu.com', 'indianexpress.com', 'ndtv.com', 'hindustantimes.com', 'indiatimes.com', 'livemint.com', 'business-standard.com', 'news18.com', 'indiatoday.in', 'aajtak.in', 'bhaskar.com', 'jagran.com', 'amarujala.com', 'livehindustan.com', 'abplive.com', 'zeenews.india.com', 'dinamalar.com', 'dailythanthi.com', 'vikatan.com', 'anandabazar.com', 'eenadu.net', 'sakshi.com', 'bbc.com', 'bbc.co.uk', 'reuters.com', 'apnews.com', 'theguardian.com', 'nytimes.com', 'aljazeera.com', 'dw.com', 'scroll.in', 'thewire.in', 'theprint.in', 'firstpost.com', 'deccanherald.com', 'tribuneindia.com', 'telegraphindia.com', 'newindianexpress.com', 'thequint.com', 'indiatvnews.com', 'prabhatkhabar.com', 'navbharattimes.indiatimes.com', 'manoramaonline.com', 'mathrubhumi.com', 'lokmat.com', 'loksatta.com', 'sandesh.com', 'divyabhaskar.co.in', 'asianetnews.com', 'oneindia.com', 'ptinews.com', 'pib.gov.in',
];
const SOCIAL = ['x.com', 'twitter.com', 'facebook.com', 'instagram.com', 'youtube.com', 'youtu.be', 'reddit.com', 'quora.com', 'pinterest.com', 'linkedin.com', 'tiktok.com', 'medium.com', 'telegram.org', 'tumblr.com', 'threads.net'];

const inList = (d: string, list: string[]) => list.some((x) => d === x || d.endsWith('.' + x));

export function classify(rawDomain: string): TrustCat {
  const d = rawDomain.toLowerCase().replace(/^www\./, '');
  if (inList(d, FACT)) return 'factcheck';
  if (/(^|\.)(gov\.in|nic\.in|gov|mil|gov\.uk)$/.test(d) || inList(d, OFFICIAL_HOSTS)) return 'official';
  if (/(^|\.)(ac\.in|edu\.in|edu|ac\.uk)$/.test(d) || inList(d, ACADEMIC_HOSTS)) return 'academic';
  if (inList(d, REFERENCE)) return 'reference';
  if (inList(d, SOCIAL)) return 'social';
  if (inList(d, NEWS)) return 'news';
  return 'commercial';
}

export interface TrustProfile {
  /** 0..100, mean authority of the results */
  score: number;
  mix: Record<TrustCat, number>;
  count: number;
}

export function trustOf(domains: string[]): TrustProfile {
  const mix = Object.fromEntries(TRUST_ORDER.map((c) => [c, 0])) as Record<TrustCat, number>;
  let sum = 0;
  for (const d of domains) {
    const c = classify(d);
    mix[c]++;
    sum += TRUST_META[c].score;
  }
  return { score: domains.length ? Math.round(sum / domains.length) : 0, mix, count: domains.length };
}
