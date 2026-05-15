/** Stable id for demo citations API filtering */
export const DEMO_BRAND_ID = "demo-brand-001";

export const DEMO_BRAND = {
  name: "Attio",
  category: "CRM",
  metrics: {
    visibility: 63,
    sentiment: 89,
    position: 2.4,
    promptsTracked: 142,
  },
};

/** Demo multi-client list (ids stable for filtering when not in auth bypass). */
export const DEMO_BRANDS_LIST = [
  {
    id: DEMO_BRAND_ID,
    name: "Attio",
    domain: "attio.com",
    website: "https://attio.com",
    category: "CRM",
  },
  {
    id: "demo-brand-002",
    name: "Easyderma",
    domain: "easyderma.in",
    website: "https://easyderma.in",
    category: "Healthcare",
  },
  {
    id: "demo-brand-003",
    name: "Kurahomes",
    domain: "kurahomes.in",
    website: "https://kurahomes.in",
    category: "Real estate",
  },
] as const;

export const DEMO_COMPETITORS = [
  { id: "c-hubspot", name: "HubSpot", visibility: 75, sentiment: 72, position: 1.8, trend: "up" as const },
  { id: "c-salesforce", name: "Salesforce", visibility: 82, sentiment: 37, position: 1.2, trend: "neutral" as const },
  { id: "c-pipedrive", name: "Pipedrive", visibility: 41, sentiment: 65, position: 3.1, trend: "down" as const },
  { id: "c-zoho", name: "Zoho", visibility: 38, sentiment: 58, position: 3.8, trend: "up" as const },
];

export const DEMO_PROMPTS = [
  {
    id: "p1",
    text: "Best CRM for startups",
    category: "Discovery",
    visibility: true,
    sentiment: 89,
    lastRun: "2026-05-10T14:00:00Z",
  },
  {
    id: "p2",
    text: "Top CRM tools 2026",
    category: "Discovery",
    visibility: true,
    sentiment: 82,
    lastRun: "2026-05-09T11:30:00Z",
  },
  {
    id: "p3",
    text: "CRM with best integrations",
    category: "Feature",
    visibility: false,
    sentiment: null as number | null,
    lastRun: "2026-05-08T09:00:00Z",
  },
  {
    id: "p4",
    text: "HubSpot alternatives",
    category: "Comparison",
    visibility: true,
    sentiment: 91,
    lastRun: "2026-05-10T08:15:00Z",
  },
  {
    id: "p5",
    text: "Modern CRM for sales teams",
    category: "Discovery",
    visibility: true,
    sentiment: 85,
    lastRun: "2026-05-07T16:45:00Z",
  },
];

export const DEMO_PATTERNS = [
  {
    type: "low_visibility",
    severity: "high" as const,
    title: "Missing from integration-focused queries",
    evidence: "Not mentioned in 67% of 'integrations' prompts",
    recommendations: [
      "Create dedicated integrations landing page",
      "Add Zapier/Make integration documentation",
      "Publish integration case studies",
    ],
  },
  {
    type: "competitor_dominance",
    severity: "medium" as const,
    title: "HubSpot dominates in enterprise queries",
    evidence: "HubSpot appears first in 78% of enterprise-focused prompts",
    recommendations: [
      "Create HubSpot comparison page",
      "Publish enterprise migration guides",
      "Add enterprise customer testimonials",
    ],
  },
];

export const DEMO_CHART_DATA = {
  visibility: [
    { month: "Jan", attio: 45, easyderma: 32, kurahomes: 38, hubspot: 72, salesforce: 80 },
    { month: "Feb", attio: 48, easyderma: 35, kurahomes: 41, hubspot: 73, salesforce: 79 },
    { month: "Mar", attio: 52, easyderma: 39, kurahomes: 44, hubspot: 71, salesforce: 81 },
    { month: "Apr", attio: 58, easyderma: 42, kurahomes: 49, hubspot: 74, salesforce: 78 },
    { month: "May", attio: 63, easyderma: 46, kurahomes: 53, hubspot: 75, salesforce: 82 },
    { month: "Jun", attio: 67, easyderma: 48, kurahomes: 55, hubspot: 76, salesforce: 80 },
  ],
};

/** Per-client demo overview (sidebar brands). */
export const DEMO_BRAND_OVERVIEW_PROFILES: Record<
  string,
  {
    chartKey: "attio" | "easyderma" | "kurahomes";
    metrics: { visibility: number; sentiment: number; position: number; promptsTracked: number };
    googleSummary: { avgPosition: number; clicks: number; impressions: number; ctr: number };
    llmOverallOffset: number;
    modelCoverageOffset: number;
    positionHighlight: string;
    activityBrandFilter: string;
  }
> = {
  "demo-brand-001": {
    chartKey: "attio",
    metrics: { visibility: 63, sentiment: 89, position: 2.4, promptsTracked: 142 },
    googleSummary: { avgPosition: 4.2, clicks: 8420, impressions: 124000, ctr: 6.8 },
    llmOverallOffset: 0,
    modelCoverageOffset: 0,
    positionHighlight: "Attio",
    activityBrandFilter: "Attio",
  },
  "demo-brand-002": {
    chartKey: "easyderma",
    metrics: { visibility: 48, sentiment: 76, position: 3.8, promptsTracked: 67 },
    googleSummary: { avgPosition: 8.1, clicks: 2100, impressions: 42000, ctr: 5.0 },
    llmOverallOffset: -12,
    modelCoverageOffset: -8,
    positionHighlight: "Easyderma",
    activityBrandFilter: "Easyderma",
  },
  "demo-brand-003": {
    chartKey: "kurahomes",
    metrics: { visibility: 55, sentiment: 81, position: 3.1, promptsTracked: 94 },
    googleSummary: { avgPosition: 6.4, clicks: 3900, impressions: 68000, ctr: 5.7 },
    llmOverallOffset: -6,
    modelCoverageOffset: -4,
    positionHighlight: "Kurahomes",
    activityBrandFilter: "Kurahomes",
  },
};

export function resolveDemoBrandProfile(brandId: string, brandName: string) {
  return (
    DEMO_BRAND_OVERVIEW_PROFILES[brandId] ??
    DEMO_BRAND_OVERVIEW_PROFILES[DEMO_BRAND_ID] ?? {
      chartKey: "attio" as const,
      metrics: DEMO_BRAND.metrics,
      googleSummary: { avgPosition: 4.2, clicks: 8420, impressions: 124000, ctr: 6.8 },
      llmOverallOffset: 0,
      modelCoverageOffset: 0,
      positionHighlight: brandName,
      activityBrandFilter: brandName,
    }
  );
}

export const DEMO_MODEL_COVERAGE = [
  { model: "ChatGPT", visibility: 68 },
  { model: "Gemini", visibility: 52 },
  { model: "Claude", visibility: 71 },
  { model: "Perplexity", visibility: 59 },
];

export const DEMO_SENTIMENT_DIST = {
  positive: 62,
  neutral: 28,
  negative: 10,
};

export const DEMO_POSITION_RANKING = [
  { name: "Salesforce", position: 1.2, highlight: false },
  { name: "HubSpot", position: 1.8, highlight: false },
  { name: "Attio", position: 2.4, highlight: true },
  { name: "Pipedrive", position: 3.1, highlight: false },
  { name: "Zoho", position: 3.8, highlight: false },
];

export const DEMO_ACTIVITY = [
  {
    id: "a1",
    prompt: "Best CRM for startups",
    brand: "Attio",
    sentiment: 89,
    model: "ChatGPT",
    at: "2026-05-10T14:22:00Z",
    excerpt: "For startups, Attio offers a modern flexible CRM...",
  },
  {
    id: "a2",
    prompt: "HubSpot alternatives",
    brand: "Attio",
    sentiment: 91,
    model: "Claude",
    at: "2026-05-10T13:10:00Z",
    excerpt: "Alternatives include Attio, Pipedrive, and Close...",
  },
  {
    id: "a3",
    prompt: "CRM with best integrations",
    brand: "Attio",
    sentiment: null,
    model: "Gemini",
    at: "2026-05-10T12:00:00Z",
    excerpt: "HubSpot and Salesforce lead integration ecosystems...",
  },
];

export const DEMO_SOURCES = [
  {
    domain: "g2.com",
    citations: 412,
    authority: 92,
    yours: false,
  },
  {
    domain: "attio.com",
    citations: 89,
    authority: 78,
    yours: true,
  },
  {
    domain: "hubspot.com",
    citations: 356,
    authority: 95,
    yours: false,
  },
  {
    domain: "reddit.com",
    citations: 201,
    authority: 71,
    yours: false,
  },
];

export const DEMO_CITATIONS = [
  {
    id: "c1",
    brandId: DEMO_BRAND_ID,
    domain: "g2.com",
    url: "https://www.g2.com/products/crm",
    model: "openai",
    createdAt: "2026-05-10T14:00:00Z",
  },
  {
    id: "c2",
    brandId: DEMO_BRAND_ID,
    domain: "attio.com",
    url: "https://www.attio.com",
    model: "perplexity",
    createdAt: "2026-05-10T13:20:00Z",
  },
  {
    id: "c3",
    brandId: DEMO_BRAND_ID,
    domain: "hubspot.com",
    url: "https://www.hubspot.com/products/crm",
    model: "anthropic",
    createdAt: "2026-05-09T18:00:00Z",
  },
];

export const DEMO_CITED_PAGES = [
  {
    url: "hubspot.com/products/crm",
    competitor: "HubSpot",
    gap: "You don't have a single narrative page for CRM product breadth vs startup positioning.",
  },
  {
    url: "salesforce.com/crm",
    competitor: "Salesforce",
    gap: "Enterprise CRM story + trust signals referenced more often than your site.",
  },
];

export const DEMO_SOURCE_GAPS = [
  {
    topic: "Startup CRM comparisons",
    action: "Create content for this topic",
  },
  {
    topic: "Integration marketplaces (Zapier ecosystem)",
    action: "Create content for this topic",
  },
];

export const DEMO_RECOMMENDATIONS = [
  {
    id: "r1",
    pattern: "negative_sentiment",
    priority: "high" as const,
    title: 'AI frequently describes your product as "expensive" across 23 prompts',
    actions: [
      "Create pricing comparison pages",
      "Improve value messaging on homepage",
      "Add ROI calculator content",
      "Publish customer success stories",
    ],
    impact: "+15 Sentiment Score",
    status: "pending" as const,
  },
  {
    id: "r2",
    pattern: "low_visibility",
    priority: "high" as const,
    title: "Missing from integration-focused discovery queries",
    actions: [
      "Write GEO-optimized articles for integration keywords",
      "Add structured FAQ schema to integrations page",
      "Publish Zapier case study",
    ],
    impact: "+12 Visibility",
    status: "pending" as const,
  },
  {
    id: "r3",
    pattern: "competitor_dominance",
    priority: "medium" as const,
    title: "HubSpot ranks first in 78% of enterprise prompts you track",
    actions: [
      "Enterprise comparison landing page",
      "Migration guide from HubSpot",
      "Enterprise logos + security page",
    ],
    impact: "+8 Position",
    status: "done" as const,
  },
];

export const DEMO_SENTIMENT_KEYWORDS: { word: string; weight: number; sentiment: "positive" | "neutral" | "negative" }[] =
  [
    { word: "modern", weight: 32, sentiment: "positive" },
    { word: "flexible", weight: 28, sentiment: "positive" },
    { word: "startup", weight: 24, sentiment: "neutral" },
    { word: "pricing", weight: 20, sentiment: "negative" },
    { word: "integrations", weight: 18, sentiment: "neutral" },
    { word: "UX", weight: 16, sentiment: "positive" },
    { word: "SMB", weight: 14, sentiment: "neutral" },
  ];

export const DEMO_SENTENCES = [
  {
    sentence: "Attio is often praised for its flexible data model and fast UI.",
    sentiment: "positive" as const,
    confidence: 91,
    model: "ChatGPT",
  },
  {
    sentence: "Some users note Attio's pricing can feel steep for very small teams.",
    sentiment: "negative" as const,
    confidence: 84,
    model: "Claude",
  },
  {
    sentence: "Compared to HubSpot, Attio is positioned as a more modern lightweight CRM.",
    sentiment: "neutral" as const,
    confidence: 76,
    model: "Gemini",
  },
];

export type UserApiKeyProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "perplexity"
  | "google_search_console"
  | "google_analytics";

/** Demo-only API key rows (no real secrets). */
export const DEMO_USER_API_KEYS_SEED: {
  id: string;
  provider: UserApiKeyProvider;
  keyName: string;
  keyPreview: string;
  isActive: boolean;
  testStatus: "untested" | "working" | "failed";
  testError: string | null;
  createdAt: string;
  /** Fake secret for demo “test” path — never a real key */
  demoSecret: string;
}[] = [
  {
    id: "demo-key-openai",
    provider: "openai",
    keyName: "Primary OpenAI",
    keyPreview: "••••a3f9",
    isActive: true,
    testStatus: "working",
    testError: null,
    createdAt: "2026-05-08T10:00:00Z",
    demoSecret: "sk-demo-openai-replace-in-production",
  },
  {
    id: "demo-key-anthropic",
    provider: "anthropic",
    keyName: "Claude workspace",
    keyPreview: "••••b7c2",
    isActive: true,
    testStatus: "working",
    testError: null,
    createdAt: "2026-05-05T10:00:00Z",
    demoSecret: "sk-ant-demo-replace",
  },
  {
    id: "demo-key-gemini",
    provider: "gemini",
    keyName: "Gemini",
    keyPreview: "••••e1d8",
    isActive: true,
    testStatus: "untested",
    testError: null,
    createdAt: "2026-05-12T08:00:00Z",
    demoSecret: "AIza-demo-replace",
  },
  {
    id: "demo-key-gsc",
    provider: "google_search_console",
    keyName: "GSC OAuth",
    keyPreview: "••••f4a1",
    isActive: true,
    testStatus: "failed",
    testError: "Connect Google OAuth (full flow coming soon).",
    createdAt: "2026-05-01T10:00:00Z",
    demoSecret: "{}",
  },
];

export const DEMO_LLM_PLATFORM_SCORES = [
  { platform: "ChatGPT", score: 85, sentiment: "positive" as const },
  { platform: "Claude", score: 68, sentiment: "positive" as const },
  { platform: "Gemini", score: 71, sentiment: "neutral" as const },
  { platform: "Perplexity", score: 64, sentiment: "negative" as const },
];

export const DEMO_LLM_TREND = [
  { day: "May 1", chatgpt: 78, claude: 62, gemini: 65, perplexity: 58 },
  { day: "May 5", chatgpt: 80, claude: 64, gemini: 68, perplexity: 60 },
  { day: "May 10", chatgpt: 83, claude: 66, gemini: 70, perplexity: 62 },
  { day: "May 12", chatgpt: 85, claude: 68, gemini: 71, perplexity: 64 },
];

export const DEMO_GOOGLE_SUMMARY = {
  avgPosition: 12.3,
  clicks: 5234,
  impressions: 124000,
  ctr: 0.042,
};

export const DEMO_GOOGLE_KEYWORDS = [
  { keyword: "modern crm", position: 3, clicks: 432, impressions: 8234 },
  { keyword: "attio crm", position: 1, clicks: 1200, impressions: 4567 },
  { keyword: "ai crm", position: 7, clicks: 234, impressions: 5123 },
];

export const DEMO_WEBSITE_AUDIT_SUMMARY = {
  overallScore: 78,
  critical: 12,
  warnings: 45,
  totalPages: 234,
  indexed: 187,
  notIndexed: 35,
  /** Pages known in Search Console but not yet in the main index bucket */
  discoveredOnly: 12,
};

export const DEMO_WEBSITE_CRITICAL_ISSUES = [
  { issue: "Missing title tag", pages: 8 },
  { issue: "Duplicate H1", pages: 12 },
  { issue: "Page not indexed", pages: 35 },
  { issue: "Slow loading (>5s)", pages: 4 },
];

export const DEMO_WEBSITE_WARNINGS = [
  { issue: "Title too short (<30 characters)", pages: 15 },
  { issue: "Meta description missing", pages: 18 },
  { issue: "Images without alt text", pages: 47 },
  { issue: "Thin content (<300 words)", pages: 22 },
];

export type LlmPromptPlatformRow = {
  platform: string;
  position: number | null;
  mentioned: boolean;
  sentimentLabel: string;
  sentimentScore: number | null;
  excerpt: string;
  gap?: string;
};

export const DEMO_LLM_PROMPT_DETAILS: Record<
  string,
  { platforms: LlmPromptPlatformRow[]; recommendations: string[] }
> = {
  p1: {
    platforms: [
      {
        platform: "ChatGPT",
        position: 1,
        mentioned: true,
        sentimentLabel: "Positive",
        sentimentScore: 89,
        excerpt: "Attio is a modern, AI-native CRM that works well for startups that want flexible data...",
      },
      {
        platform: "Claude",
        position: 3,
        mentioned: true,
        sentimentLabel: "Neutral",
        sentimentScore: 62,
        excerpt: "Several options include HubSpot, Salesforce, and Attio for teams that prefer a lighter stack...",
      },
      {
        platform: "Gemini",
        position: 2,
        mentioned: true,
        sentimentLabel: "Positive",
        sentimentScore: 78,
        excerpt: "Attio stands out for flexibility and a fast UI compared with legacy CRMs...",
      },
      {
        platform: "Perplexity",
        position: null,
        mentioned: false,
        sentimentLabel: "Not mentioned",
        sentimentScore: null,
        excerpt: "",
        gap: "The answer cited HubSpot, Salesforce, and Pipedrive from G2-style sources instead.",
      },
    ],
    recommendations: [
      "Add a comparison page: your brand vs HubSpot for startup buyers.",
      "Improve third-party presence (G2, Capterra) so Perplexity can cite you.",
      "Publish a startup-focused landing page that answers this exact question.",
    ],
  },
  _fallback: {
    platforms: [
      {
        platform: "ChatGPT",
        position: 2,
        mentioned: true,
        sentimentLabel: "Positive",
        sentimentScore: 80,
        excerpt: "Attio appears alongside other modern CRMs with strong reviews for small teams...",
      },
      {
        platform: "Claude",
        position: 4,
        mentioned: true,
        sentimentLabel: "Neutral",
        sentimentScore: 70,
        excerpt: "Common picks include HubSpot, Salesforce, Zoho, and newer tools like Attio...",
      },
      {
        platform: "Gemini",
        position: 3,
        mentioned: true,
        sentimentLabel: "Neutral",
        sentimentScore: 72,
        excerpt: "The response lists several CRMs; Attio is mentioned mid-list with balanced pros and cons.",
      },
      {
        platform: "Perplexity",
        position: 6,
        mentioned: true,
        sentimentLabel: "Mixed",
        sentimentScore: 55,
        excerpt: "Citations lean toward large vendors; your brand is mentioned briefly near the end.",
      },
    ],
    recommendations: [
      "Refresh this prompt weekly and track position changes.",
      "Add FAQ schema on the most relevant product page.",
      "Build one authoritative guide that matches the intent behind this prompt.",
    ],
  },
};

export function getDemoLlmPromptDetail(promptId: string) {
  return DEMO_LLM_PROMPT_DETAILS[promptId] ?? DEMO_LLM_PROMPT_DETAILS._fallback;
}

export const DEMO_GOOGLE_RANK_TREND = [
  { label: "May 1", position: 14.2 },
  { label: "May 5", position: 13.1 },
  { label: "May 10", position: 12.6 },
  { label: "May 12", position: 12.3 },
];

export const DEMO_GOOGLE_PAGE2_KEYWORDS = [
  { keyword: "crm for startups", position: 18, action: "Optimize page" },
  { keyword: "sales automation", position: 23, action: "Optimize page" },
  { keyword: "customer data", position: 15, action: "Optimize page" },
];

export const DEMO_KEYWORD_DIAGNOSTIC: Record<
  string,
  {
    position: number;
    page: number;
    clicks: number;
    ctr: number;
    serp: { rank: number; site: string; why: string; action: string }[];
    diagnostics: { ok: boolean; text: string }[];
    actionPlan: { step: string; priority: "HIGH" | "MEDIUM" | "LOW" }[];
    prediction: string;
  }
> = {
  "crm for startups": {
    position: 18,
    page: 2,
    clicks: 45,
    ctr: 0.008,
    serp: [
      { rank: 1, site: "hubspot.com", why: "High authority", action: "Build backlinks" },
      { rank: 2, site: "salesforce.com", why: "Brand strength", action: "Improve content depth" },
      { rank: 3, site: "pipedrive.com", why: "FAQ schema", action: "Add FAQ schema" },
      { rank: 18, site: "attio.com (you)", why: "—", action: "—" },
    ],
    diagnostics: [
      { ok: false, text: "Content depth: your page has about 450 words vs an average of 2,100 for top results." },
      { ok: false, text: "Backlinks: about 12 referring domains vs an average of 145 for page-one URLs." },
      { ok: false, text: "Schema: FAQ schema is missing on this URL." },
      { ok: false, text: "Internal links: only 3 internal links point to this page." },
      { ok: true, text: "Page speed: 92 / 100 (good)." },
      { ok: true, text: "Mobile-friendly: yes." },
    ],
    actionPlan: [
      { step: "Expand content to 2,000+ words with clear headings.", priority: "HIGH" },
      { step: "Add FAQ schema for the top questions buyers ask.", priority: "HIGH" },
      { step: "Earn 50+ relevant backlinks over the next quarter.", priority: "MEDIUM" },
      { step: "Add 10+ internal links from related guides and product pages.", priority: "LOW" },
    ],
    prediction: "If you ship the high-priority fixes, a realistic range in about 60 days is rank 5–8 for this term (demo estimate).",
  },
};

export function getDemoKeywordDiagnostic(keyword: string) {
  const k = keyword.trim().toLowerCase();
  const direct = DEMO_KEYWORD_DIAGNOSTIC[k];
  if (direct) return direct;
  return {
    position: 11,
    page: 2,
    clicks: 120,
    ctr: 0.021,
    serp: [
      { rank: 1, site: "competitor-a.com", why: "Strong domain", action: "Study their outline" },
      { rank: 2, site: "competitor-b.com", why: "Long-form guide", action: "Match intent" },
      { rank: 11, site: "attio.com (you)", why: "—", action: "—" },
    ],
    diagnostics: [
      { ok: false, text: "Top pages are longer and more specific than your current landing page." },
      { ok: true, text: "Technical basics look healthy in this demo view." },
    ],
    actionPlan: [
      { step: "Rewrite the page around one clear buyer job-to-be-done.", priority: "HIGH" },
      { step: "Add internal links from 5 related pages.", priority: "MEDIUM" },
    ],
    prediction: "With steady improvements, many terms move one page within 30–60 days (demo estimate).",
  };
}

export type CompetitorDeepProfile = {
  authority: number;
  contentPages: number;
  backlinks: string;
  strengths: string[];
  llmBullets: string[];
  topPages: { path: string; position: number; traffic: string }[];
  learnings: string[];
};

export const DEMO_COMPETITOR_DEEP_PROFILES: Record<string, CompetitorDeepProfile> = {
  "c-hubspot": {
    authority: 95,
    contentPages: 2400,
    backlinks: "1.2M+",
    strengths: [
      "Very large content library with templates and playbooks.",
      "Strong backlink profile from news, partners, and integrations.",
      "FAQ and product schema on many high-traffic URLs.",
      "Long-form guides (often 3,000+ words) for core topics.",
    ],
    llmBullets: [
      "Mentioned in most CRM-related prompts in this demo dataset.",
      "Often described as “comprehensive” and “mature”.",
      "Frequently listed at position 1 or 2 in list-style answers.",
    ],
    topPages: [
      { path: "/products/crm", position: 1, traffic: "~120K/mo" },
      { path: "/crm/what-is-crm", position: 1, traffic: "~85K/mo" },
      { path: "/crm/free-crm", position: 2, traffic: "~60K/mo" },
    ],
    learnings: [
      "Publish definitive “what is X” guides for your category.",
      "Ship free tools or templates that earn backlinks naturally.",
      "Add FAQ schema on your top money pages.",
    ],
  },
  "c-salesforce": {
    authority: 98,
    contentPages: 5200,
    backlinks: "2.0M+",
    strengths: [
      "Enterprise trust signals everywhere (security, compliance, logos).",
      "Huge partner and app ecosystem content.",
      "Dominates head terms for “enterprise CRM”.",
    ],
    llmBullets: [
      "Shows up whenever “enterprise” or “scale” is in the prompt.",
      "Mixed sentiment on complexity, strong on reliability.",
    ],
    topPages: [
      { path: "/crm", position: 1, traffic: "~200K/mo" },
      { path: "/products/sales-cloud", position: 2, traffic: "~95K/mo" },
    ],
    learnings: [
      "If you serve mid-market, own “fast to implement” narratives Salesforce cannot match.",
      "Publish migration and security comparison pages.",
    ],
  },
  "c-pipedrive": {
    authority: 78,
    contentPages: 890,
    backlinks: "180K+",
    strengths: [
      "Clear SMB positioning and simple product storytelling.",
      "Strong localized landing pages.",
    ],
    llmBullets: ["Often recommended for small sales teams and pipeline-first workflows."],
    topPages: [
      { path: "/crm", position: 3, traffic: "~40K/mo" },
      { path: "/blog/sales", position: 5, traffic: "~22K/mo" },
    ],
    learnings: ["Double down on crisp product screenshots and workflow-led pages."],
  },
  "c-zoho": {
    authority: 72,
    contentPages: 3100,
    backlinks: "600K+",
    strengths: ["Breadth of products creates many entry paths from search."],
    llmBullets: ["Frequently mentioned as a budget-friendly suite option."],
    topPages: [
      { path: "/crm", position: 4, traffic: "~35K/mo" },
      { path: "/crm/free-crm", position: 3, traffic: "~28K/mo" },
    ],
    learnings: ["Compete on focus: fewer products, clearer story beats a giant suite page."],
  },
};

export function getDemoCompetitorProfile(id: string): CompetitorDeepProfile {
  return (
    DEMO_COMPETITOR_DEEP_PROFILES[id] ?? {
      authority: 50,
      contentPages: 120,
      backlinks: "Unknown",
      strengths: ["Add real crawl data to see strengths automatically."],
      llmBullets: ["Connect LLM tracking to see how often this competitor is mentioned."],
      topPages: [],
      learnings: ["Save this competitor and rerun analysis after your next content sprint."],
    }
  );
}

/** Simple demo forecast curve for LLM visibility (predictive tab). */
export const DEMO_LLM_FORECAST_SERIES = [
  { label: "Now", score: 72 },
  { label: "30 days", score: 76 },
  { label: "60 days", score: 81 },
  { label: "90 days", score: 87 },
];

export const DEMO_KEYWORD_RANK_FORECAST = [
  { keyword: "modern crm", now: 3, d30: 2, d60: 1 },
  { keyword: "crm for startups", now: 18, d30: 12, d60: 6 },
  { keyword: "ai crm", now: 7, d30: 5, d60: 3 },
];

export const DEMO_NON_INDEXED_PAGES = [
  { url: "/blog/crm-trends-2026", reason: "Crawled, not indexed", hint: "Improve internal links and content depth." },
  { url: "/features/ai-assistant", reason: "Discovered only", hint: "Add links from high-traffic pages." },
  { url: "/old-page", reason: "Excluded (noindex)", hint: "Remove noindex if page should rank." },
  { url: "/duplicate-page", reason: "Duplicate", hint: "Canonical points elsewhere; merge or redirect." },
];
