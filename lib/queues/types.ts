import type { BULL_QUEUE_NAMES } from "@/lib/queues/queue-names";

export type BullQueueName = (typeof BULL_QUEUE_NAMES)[number];

export interface PromptExecutionJobData {
  promptId: string;
  brandId?: string;
  requestId?: string;
}

export interface SentimentAnalysisJobData {
  brandId: string;
  mentionBatchId?: string;
}

export interface RecommendationJobData {
  brandId: string;
  patternIds?: string[];
}

export interface CitationExtractionJobData {
  responseId: string;
  brandId?: string;
}

export interface TrendAnalysisJobData {
  brandId: string;
  windowDays?: number;
}
