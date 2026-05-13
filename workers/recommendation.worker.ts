import type IORedis from "ioredis";
import { Worker } from "bullmq";
import { RECOMMENDATION_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { RecommendationJobData } from "@/lib/queues/types";
import { RecommendationEngine } from "@/lib/services/recommendation-engine";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

export function registerRecommendationWorker(connection: IORedis) {
  return new Worker<RecommendationJobData>(
    RECOMMENDATION_QUEUE_NAME,
    async (job) => {
      const { brandId, userId, brandName } = job.data;
      const engine = new RecommendationEngine(userId);
      const name = brandName ?? "Your brand";
      const recs = await engine.generateAll(brandId, name);
      const admin = tryCreateAdminSupabaseClient();
      if (admin) {
        const storageCategory: Record<
          "llm" | "google" | "website" | "content" | "competitor",
          "geo" | "authority" | "technical" | "content" | "positioning"
        > = {
          llm: "geo",
          google: "authority",
          website: "technical",
          content: "content",
          competitor: "positioning",
        };
        for (const r of recs) {
          const { error } = await admin.from("recommendations").insert({
            brand_id: brandId,
            pattern_type: r.category,
            action: r.title,
            description: r.summary,
            priority: r.priority,
            category: storageCategory[r.category],
            status: "pending",
          });
          if (error) console.error("[recommendation-worker]", error.message);
        }
      }
      return { ok: true as const, generated: recs.length };
    },
    { connection, concurrency: 1 },
  );
}
