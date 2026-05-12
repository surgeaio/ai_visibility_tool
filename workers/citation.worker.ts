import type IORedis from "ioredis";
import { Worker } from "bullmq";
import { CITATION_EXTRACTION_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { CitationExtractionJobData } from "@/lib/queues/types";

export function registerCitationWorker(connection: IORedis) {
  return new Worker<CitationExtractionJobData>(
    CITATION_EXTRACTION_QUEUE_NAME,
    async (job) => {
      console.log("[citation-extraction]", job.id, job.data);
      return { ok: true as const };
    },
    { connection, concurrency: 4 },
  );
}
