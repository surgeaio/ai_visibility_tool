export type QueueName = "prompt-execution";

export interface PromptExecutionJobData {
  promptId: string;
  brandId?: string;
  requestId?: string;
}
