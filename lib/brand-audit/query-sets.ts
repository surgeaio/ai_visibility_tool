import type { LlmQueryCategory } from "@/lib/brand-audit/types";

export interface BrandQueryDefinition {
  brandName: string;
  brandUrl: string;
  brandAliases: string[];
  competitors: string[];
  queries: { text: string; category: LlmQueryCategory }[];
}

export const SHIFTHUB_QUERIES: BrandQueryDefinition = {
  brandName: "Shifthub",
  brandUrl: "https://shifthub.io",
  brandAliases: ["shifthub", "shift hub", "shifthub.io"],
  competitors: ["When I Work", "Deputy", "Shiftboard", "7shifts", "Planday"],
  queries: [
    { text: "What is Shifthub and what does it do?", category: "direct" },
    { text: "Is Shifthub a good workforce management tool for contact centres?", category: "direct" },
    { text: "Shifthub WFM review — what are the pros and cons?", category: "direct" },
    { text: "What are the best workforce management tools for call centres in 2024?", category: "category" },
    { text: "Best employee scheduling software for contact centres in Australia", category: "category" },
    { text: "Alternatives to When I Work for contact centre scheduling", category: "category" },
    { text: "Top WFM software for small contact centres", category: "category" },
    { text: "How to manage shift scheduling in a call centre?", category: "category" },
    { text: "Shifthub vs Deputy — which is better for contact centres?", category: "competitor" },
    { text: "Compare Shifthub, 7shifts, and Shiftboard for call centre management", category: "competitor" },
  ],
};

export const CIRCLE_HEALTHCARE_QUERIES: BrandQueryDefinition = {
  brandName: "Circle Healthcare",
  brandUrl: "https://circle.healthcare",
  brandAliases: ["circle healthcare", "circle.healthcare", "circle health"],
  competitors: ["Welldoc", "Validic", "Azara Healthcare", "Health Catalyst", "Innovaccer"],
  queries: [
    { text: "What is Circle Healthcare and what services do they offer?", category: "direct" },
    { text: "Circle Health care management platform — is it good?", category: "direct" },
    { text: "Circle Healthcare CCM RPM platform review", category: "direct" },
    { text: "Best chronic care management software for physician groups in 2024", category: "category" },
    { text: "Top AI-powered care management platforms for value-based care", category: "category" },
    { text: "Best remote patient monitoring software for medical practices", category: "category" },
    { text: "CCM software that integrates with EHR systems", category: "category" },
    { text: "How to implement chronic care management in a small medical practice?", category: "category" },
    { text: "Best care coordination platforms for ACOs", category: "category" },
    { text: "HIPAA compliant care management software comparison", category: "category" },
    { text: "Circle Health vs Welldoc vs Validic for remote patient monitoring", category: "competitor" },
    { text: "Best alternatives to Azara Healthcare for care management", category: "competitor" },
  ],
};

export function getBrandQuerySet(brandKey: string): BrandQueryDefinition | null {
  const key = brandKey.toLowerCase();
  if (key.includes("shift")) return SHIFTHUB_QUERIES;
  if (key.includes("circle")) return CIRCLE_HEALTHCARE_QUERIES;
  return null;
}
