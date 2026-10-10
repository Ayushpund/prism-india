/** Client-safe tool registry (no server imports). */
export type ToolId = 'learn' | 'scholar' | 'jobs' | 'factcheck' | 'civic' | 'patents' | 'access';
export type OptionKey = 'lang' | 'year' | 'india' | 'sort' | 'cities';

export interface OfficialLink {
  name: string;
  url: string;
  note: string;
}

export interface ToolMeta {
  id: ToolId;
  title: string;
  icon: string;
  color: string;
  blurb: string;
  need: string;
  engine: string;
  /** credits one run costs (jobs: per selected city) */
  credits: number;
  placeholder: string;
  examples: string[];
  options: OptionKey[];
  tips: string[];
  official: OfficialLink[];
}

export const LANGS: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी Hindi' },
  { code: 'ta', label: 'தமிழ் Tamil' },
  { code: 'bn', label: 'বাংলা Bengali' },
  { code: 'te', label: 'తెలుగు Telugu' },
  { code: 'mr', label: 'मराठी Marathi' },
  { code: 'gu', label: 'ગુજરાતી Gujarati' },
  { code: 'kn', label: 'ಕನ್ನಡ Kannada' },
  { code: 'ml', label: 'മലയാളം Malayalam' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ Punjabi' },
];

export const TOOLS: ToolMeta[] = [
  {
    id: 'learn',
    title: 'Learn Finder',
    icon: 'Ed',
    color: '#FFD60A',
    need: 'Education',
    blurb: 'Find free and government-backed courses, notes and exam prep on any topic, ranked from trusted learning platforms only.',
    engine: 'google (scoped to learning sites)',
    credits: 1,
    placeholder: 'e.g. class 12 physics, python basics, UPSC prelims',
    examples: ['class 12 physics', 'python for beginners'],
    options: ['lang'],
    tips: ['Prefer SWAYAM, NPTEL, DIKSHA and NCERT for syllabus-aligned material.', 'Check the platform before you sign up: free to audit is not always free to certify.'],
    official: [
      { name: 'SWAYAM', url: 'https://swayam.gov.in', note: 'Free national MOOC platform' },
      { name: 'NPTEL', url: 'https://nptel.ac.in', note: 'IIT/IISc video and web courses' },
      { name: 'DIKSHA', url: 'https://diksha.gov.in', note: 'School learning content' },
      { name: 'NCERT', url: 'https://ncert.nic.in', note: 'Official textbooks' },
    ],
  },
  {
    id: 'scholar',
    title: 'Research Radar',
    icon: 'Rs',
    color: '#1F4BFF',
    need: 'Research',
    blurb: 'Search scholarly papers with citation counts and open-access PDF links, so students can start from real literature, not blog summaries.',
    engine: 'google_scholar',
    credits: 1,
    placeholder: 'e.g. groundwater depletion india, tuberculosis drug resistance',
    examples: ['groundwater depletion india', 'millet nutrition'],
    options: ['year'],
    tips: ['High citations mean influence, not correctness. Read the abstract and the journal.', 'Look for a PDF badge to read for free.'],
    official: [
      { name: 'Shodhganga', url: 'https://shodhganga.inflibnet.ac.in', note: 'Indian theses repository' },
      { name: 'National Digital Library', url: 'https://ndl.iitkgp.ac.in', note: 'Free academic resources' },
      { name: 'INFLIBNET', url: 'https://inflibnet.ac.in', note: 'University library network' },
    ],
  },
  {
    id: 'jobs',
    title: 'Job Compass',
    icon: 'Jb',
    color: '#12B76A',
    need: 'Jobs',
    blurb: 'See live job listings by city with posting date, schedule and pay when listed. Compare cities to see where your skills are in demand.',
    engine: 'google_jobs',
    credits: 1,
    placeholder: 'e.g. data analyst, electrician, nurse',
    examples: ['data analyst', 'electrician'],
    options: ['cities'],
    tips: ['Each city you add costs 1 credit, so start with one or two.', 'Never pay a fee to apply. Genuine employers do not charge candidates.'],
    official: [
      { name: 'National Career Service', url: 'https://www.ncs.gov.in', note: 'Government job portal' },
      { name: 'Skill India Digital', url: 'https://www.skillindiadigital.gov.in', note: 'Training and certification' },
      { name: 'Apprenticeship India', url: 'https://www.apprenticeshipindia.gov.in', note: 'Apprenticeship openings' },
    ],
  },
  {
    id: 'factcheck',
    title: 'Claim Check',
    icon: 'Fc',
    color: '#FF2E63',
    need: 'News literacy',
    blurb: 'Paste a viral claim. We surface what fact-checkers have already said and flag which sources are known fact-checking organisations.',
    engine: 'google (claim + "fact check")',
    credits: 1,
    placeholder: 'e.g. drinking hot water cures covid',
    examples: ['hot water cures covid', 'free laptop scheme whatsapp'],
    options: [],
    tips: ['Read laterally: open a second source before you trust the first.', 'Check the date. Old videos are often re-shared as new events.', 'Keyword signals below are hints, not verdicts. Open the article.'],
    official: [
      { name: 'Alt News', url: 'https://www.altnews.in', note: 'Independent fact-checker' },
      { name: 'BOOM', url: 'https://www.boomlive.in', note: 'Fact-checking and verification' },
      { name: 'Factly', url: 'https://factly.in', note: 'Data-driven fact checks' },
      { name: 'Newschecker', url: 'https://newschecker.in', note: 'Multilingual fact checks' },
    ],
  },
  {
    id: 'civic',
    title: 'Civic Guide',
    icon: 'Cv',
    color: '#FF9F1C',
    need: 'Civic information',
    blurb: 'Get answers about government services, documents and rights from official .gov.in and .nic.in sources only, in your language.',
    engine: 'google (scoped to gov.in, nic.in)',
    credits: 1,
    placeholder: 'e.g. how to apply for passport, voter id correction',
    examples: ['voter id correction', 'passport application'],
    options: ['lang'],
    tips: ['Official services end in .gov.in or .nic.in. Agents who charge extra are not required.', 'Apply only on the official site, and keep your reference number.'],
    official: [
      { name: 'MyGov', url: 'https://www.mygov.in', note: 'Citizen engagement platform' },
      { name: 'UMANG', url: 'https://web.umang.gov.in', note: 'Many services in one app' },
      { name: 'DigiLocker', url: 'https://www.digilocker.gov.in', note: 'Verified digital documents' },
      { name: 'RTI Online', url: 'https://rtionline.gov.in', note: 'File a Right to Information request' },
      { name: 'Voter Services', url: 'https://voters.eci.gov.in', note: 'Election Commission of India' },
      { name: 'Passport Seva', url: 'https://www.passportindia.gov.in', note: 'Passport applications' },
      { name: 'Cyber Crime Portal', url: 'https://cybercrime.gov.in', note: 'Report online fraud' },
      { name: 'Consumer Helpline', url: 'https://consumerhelpline.gov.in', note: 'Consumer complaints' },
      { name: 'National Scholarship Portal', url: 'https://scholarships.gov.in', note: 'Scholarships' },
      { name: 'data.gov.in', url: 'https://data.gov.in', note: 'Open government data' },
    ],
  },
  {
    id: 'patents',
    title: 'Patent Scout',
    icon: 'Pt',
    color: '#7B2CFF',
    need: 'Patents',
    blurb: 'Check whether an idea already has patents. See filing dates, inventors, assignees and PDF links before you invest in building it.',
    engine: 'google_patents',
    credits: 1,
    placeholder: 'e.g. solar powered water purifier',
    examples: ['solar water purifier', 'low cost prosthetic hand'],
    options: ['india', 'sort'],
    tips: ['A search is not a legal opinion. Talk to a patent attorney before filing.', 'Priority date matters more than publication date for novelty.'],
    official: [
      { name: 'IP India', url: 'https://ipindia.gov.in', note: 'Controller General of Patents' },
      { name: 'InPASS', url: 'https://iprsearch.ipindia.gov.in/PublicSearch', note: 'Indian patent public search' },
      { name: 'Google Patents', url: 'https://patents.google.com', note: 'Global patent search' },
    ],
  },
  {
    id: 'access',
    title: 'Access Lab',
    icon: 'Ax',
    color: '#00A3C4',
    need: 'Accessibility',
    blurb: 'Paste any official text. Check its reading level, find long sentences to simplify, and listen to it read aloud in Indian languages. Runs in your browser: 0 credits.',
    engine: 'none (runs in your browser)',
    credits: 0,
    placeholder: 'Paste a notice, form instruction or news paragraph',
    examples: [],
    options: [],
    tips: ['Aim for sentences under 20 words and everyday words.', 'Use the Display settings in the header for larger text, high contrast and a dyslexia-friendly font.'],
    official: [{ name: 'GIGW guidelines', url: 'https://guidelines.india.gov.in', note: 'Government web accessibility guidelines' }],
  },
];

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<ToolId, ToolMeta>;

/** UN Sustainable Development Goals each tool supports. */
export const SDG_NAMES: Record<number, string> = {
  4: 'Quality Education',
  8: 'Decent Work and Economic Growth',
  9: 'Industry, Innovation and Infrastructure',
  10: 'Reduced Inequalities',
  16: 'Peace, Justice and Strong Institutions',
};
export const TOOL_SDG: Record<ToolId, number[]> = {
  learn: [4],
  scholar: [4, 9],
  jobs: [8],
  factcheck: [16],
  civic: [16, 10],
  patents: [9],
  access: [10, 4],
};
