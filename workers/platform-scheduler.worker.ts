import type IORedis from "ioredis";
import { Worker } from "bullmq";
import { withWorkerSettings } from "@/lib/redis/bullmq-options";
import { PLATFORM_SCHEDULER_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { PlatformSchedulerJobName } from "@/lib/queues/types";
import { runDuePromptSchedules } from "@/lib/services/prompt-schedule-runner";
import { syncAllActiveGscConnections } from "@/lib/services/gsc-sync";
import { runAllPromptsForBrand } from "@/lib/services/visibility-orchestrator";
import { generateVisibilityRecommendationsForBrand } from "@/lib/services/visibility-recommendations-engine";
import { tryGetWorkerSupabaseClient } from "@/lib/supabase/worker-client";

export function registerPlatformSchedulerWorker(connection: IORedis) {
  const worker = new Worker<unknown, unknown, PlatformSchedulerJobName>(
    PLATFORM_SCHEDULER_QUEUE_NAME,
    async (job) => {
      if (job.name === "prompt-schedules") {
        const result = await runDuePromptSchedules();
        console.log("[platform-scheduler] prompt-schedules", result);
        return result;
      }
      if (job.name === "gsc-sync") {
        const result = await syncAllActiveGscConnections();
        console.log("[platform-scheduler] gsc-sync", result);
        return result;
      }
      if (job.name === "visibility-daily-run") {
        const supabase = tryGetWorkerSupabaseClient();
        if (!supabase) {
          console.warn("[platform-scheduler] visibility-daily-run skipped — no Supabase");
          return { skipped: true };
        }
        const { data: brands } = await supabase.from("brands").select("id");
        let ok = 0;
        let failed = 0;
        for (const b of brands ?? []) {
          try {
            await runAllPromptsForBrand(b.id as string, "scheduled");
            await generateVisibilityRecommendationsForBrand(b.id as string);
            ok += 1;
          } catch (err) {
            failed += 1;
            console.error("[platform-scheduler] visibility-daily-run brand failed", b.id, err);
          }
        }
        const summary = { ok, failed };
        console.log("[platform-scheduler] visibility-daily-run", summary);
        return summary;
      }
      throw new Error(`Unknown scheduler job: ${job.name}`);
    },
    withWorkerSettings({ connection, concurrency: 1 }),
  );

  worker.on("failed", (job, err) => {
    console.error("[platform-scheduler] failed", job?.name, job?.id, err);
  });

  return worker;
}
