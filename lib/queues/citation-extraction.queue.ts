import { Queue } from "bullmq";
import { createBullMQConnection } from "@/lib/redis/client";
import { CITATION_EXTRACTION_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { CitationExtractionJobData } from "@/lib/queues/types";

export { CITATION_EXTRACTION_QUEUE_NAME };

let queue: Queue<CitationExtractionJobData> | null | undefined;

export function getCitationExtractionQueue(): Queue<CitationExtractionJobData> | null {
  if (queue === undefined) {
    const connection = createBullMQConnection();
    queue = connection ? new Queue(CITATION_EXTRACTION_QUEUE_NAME, { connection }) : null;
  }
  return queue;
}
