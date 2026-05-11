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

export const DEMO_COMPETITORS = [
  { name: "HubSpot", visibility: 75, sentiment: 72, position: 1.8, trend: "up" as const },
  { name: "Salesforce", visibility: 82, sentiment: 37, position: 1.2, trend: "neutral" as const },
  { name: "Pipedrive", visibility: 41, sentiment: 65, position: 3.1, trend: "down" as const },
  { name: "Zoho", visibility: 38, sentiment: 58, position: 3.8, trend: "up" as const },
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
    { month: "Jan", attio: 45, hubspot: 72, salesforce: 80 },
    { month: "Feb", attio: 48, hubspot: 73, salesforce: 79 },
    { month: "Mar", attio: 52, hubspot: 71, salesforce: 81 },
    { month: "Apr", attio: 58, hubspot: 74, salesforce: 78 },
    { month: "May", attio: 63, hubspot: 75, salesforce: 82 },
    { month: "Jun", attio: 67, hubspot: 76, salesforce: 80 },
  ],
};

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
