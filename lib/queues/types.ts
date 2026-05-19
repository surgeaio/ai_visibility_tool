import type { BULL_QUEUE_NAMES } from "@/lib/queues/queue-names";

export type BullQueueName = (typeof BULL_QUEUE_NAMES)[number];

export interface PromptExecutionJobData {
  promptId: string;
  userId: string;
  brandId: string;
  requestId?: string;
}

export interface SentimentAnalysisJobData {
  brandId: string;
  mentionBatchId?: string;
}

export interface RecommendationJobData {
  brandId: string;
  userId: string;
  brandName?: string;
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

export interface WebsiteCrawlJobData {
  brandId: string;
  siteUrl: string;
  maxPages: number;
}

export interface SerperRankingJobData {
  brandId: string;
  userId: string;
  keywords?: string[];
  includeCompetitors?: boolean;
  gl?: string;
  hl?: string;
  requestId?: string;
}

export interface GscSyncJobData {
  brandId: string;
  userId: string;
  connectionId?: string;
  daysBack?: number;
  requestId?: string;
}

export type PlatformSchedulerJobName =
  | "prompt-schedules"
  | "gsc-sync"
  | "visibility-daily-run";

export interface VisibilityRunJobData {
  brandId: string;
  userId?: string;
  triggeredBy?: "manual" | "scheduled" | "on_demand";
}
