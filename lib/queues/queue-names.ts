/** BullMQ queue names — keep in sync with workers and enqueue sites. */
export const PROMPT_EXECUTION_QUEUE_NAME = "prompt-execution";
export const SENTIMENT_ANALYSIS_QUEUE_NAME = "sentiment-analysis";
export const RECOMMENDATION_QUEUE_NAME = "recommendation-generation";
export const CITATION_EXTRACTION_QUEUE_NAME = "citation-extraction";
export const TREND_ANALYSIS_QUEUE_NAME = "trend-analysis";

export const WEBSITE_CRAWL_QUEUE_NAME = "website-crawl";
export const SERPER_RANKING_QUEUE_NAME = "serper-ranking";
export const PLATFORM_SCHEDULER_QUEUE_NAME = "platform-scheduler";

export const BULL_QUEUE_NAMES = [
  PROMPT_EXECUTION_QUEUE_NAME,
  SENTIMENT_ANALYSIS_QUEUE_NAME,
  RECOMMENDATION_QUEUE_NAME,
  CITATION_EXTRACTION_QUEUE_NAME,
  TREND_ANALYSIS_QUEUE_NAME,
  WEBSITE_CRAWL_QUEUE_NAME,
  SERPER_RANKING_QUEUE_NAME,
  PLATFORM_SCHEDULER_QUEUE_NAME,
] as const;
