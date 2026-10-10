# Prism India: hackathon pitch

> **Same search, different India.** The internet you see depends on where you live and which language you search in. Prism makes that gap visible, measurable and actionable.

## The 20-second pitch

Millions of Indians search in Hindi, Tamil, Bengali or Telugu. The same question can return completely different pages, and sometimes much weaker sources, depending on the language and the city. Nobody measures this. Prism does it live: it runs the same query from six Indian cities and in two languages, scores the gap, shows exactly which authoritative pages a searcher is missing, and then gives people free tools to act on trusted information.

## The problem

- **Information inequality:** results differ by city and language, so people are not given the same access to health, civic and career information.
- **Local bias:** a city's top 10 can be filled by sources that never appear elsewhere.
- **Misinformation exposure:** where official or fact-check sources are absent, low-quality and social content fills the space.

## What makes it different (USPs)

| # | USP | Why it matters |
|---|---|---|
| 1 | **Language Gap Lab** (`/language-gap`) | Same city, same query, native language vs English. Scores page difference, domain difference and **authority shortfall**, and lists the official/academic pages one group sees and the other misses. Real data: the Tamil search "how to start a business" scored source trust **25 vs 70** in English. |
| 2 | **Divergence Score with a transparent formula** | One 0-100 number across six cities, with a visible breakdown and tooltip. No black box and no AI-written verdicts. |
| 3 | **Source Trust Profile** | Every result is classified as official, academic, fact-check, reference, news, commercial or social, using an auditable domain list. Trust is shown per city. |
| 4 | **7 public-interest tools** (`/tools`) | Education, research, jobs, news literacy, civic information, patents and accessibility, each mapped to a UN SDG. |
| 5 | **Built for India's reality** | Voice search in 6 Indian languages, civic answers in 10 languages, read-aloud, one-tap WhatsApp sharing, and a site-wide accessibility panel (text size, high contrast, easy-read font, calm motion). |
| 6 | **Credit-frugal by design** | At most one search per tool. Cache lifetimes per data type. A full offline Demo mode. No LLM calls required. A jury can try it with 0 credits. |

## SDG alignment

SDG 4 Quality Education (Learn Finder, Research Radar, Access Lab) · SDG 8 Decent Work (Job Compass) · SDG 9 Innovation (Patent Scout, Research Radar) · SDG 10 Reduced Inequalities (Language Gap Lab, Civic Guide, Access Lab) · SDG 16 Strong Institutions (Claim Check, Civic Guide).

## Mapping to typical judging criteria

| Criterion | Evidence in the project |
|---|---|
| **Innovation** | Measuring *language* inequality in search results, with an authority dimension, is a new lens. |
| **Social impact** | Targets underserved language communities; tools aimed at students, job seekers, citizens and inventors. |
| **Technical depth** | 3 SerpApi engines plus scholar, jobs and patents; SSE streaming per region; Jaccard, Spearman, blind-spot and trust analysis; 17 unit tests. |
| **Usability and accessibility** | Keyboard-first, skip link, ARIA labels, voice input, read-aloud, display settings, responsive layout. |
| **Feasibility and cost** | Runs on the SerpApi free tier. Cached, one search per tool, offline demo. |
| **Presentation** | Cinematic demo button, shareable 1200x630 report poster, WhatsApp share. |

## 3-minute demo script

1. **(0:00)** Open `/`. "Same question, six cities." Click **Watch the demo**: the pulse, the beacons lighting up as real data arrives, the divergence score.
2. **(0:50)** Open the **Source trust by city** section. "Chennai's top 10 has far more reference and official sources than Mumbai's."
3. **(1:10)** Open **Language gap** → "how to start a business". "Same city, two languages. Tamil trust 25, English 70. English searchers see the Government of India's business portal and a World Bank page. Tamil searchers don't."
4. **(1:50)** Click **Share on WhatsApp**. "Information inequality, shared where Indians actually talk."
5. **(2:05)** Open **Public tools** → **Claim Check** with "hot water cures covid", then **Civic Guide** in Hindi, then **Access Lab** with Read aloud. "One search each, official sources only, 0 credits in Demo mode."
6. **(2:45)** Open **Aa Display**, switch on high contrast and the easy-read font. Close with the SDG slide.

## Honest limitations (say these before a judge asks)

- Results vary with personalization, time and device; each run is a snapshot, not a verdict.
- SerpApi simulates a location; it approximates a local searcher.
- Trust scores rate the **type** of source, not whether a page is correct.
- The language gap is shown in both directions: sometimes the local language gets better sources. We report the direction and don't assume a deficit.

## Roadmap

Add more languages and cities, a scheduled public "Language Gap Index" tracker over time, a PWA/offline mode for low-bandwidth users, and partnerships with fact-checkers and civic-tech groups.
