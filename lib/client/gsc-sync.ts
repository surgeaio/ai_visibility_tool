import { fetchJson, sleep } from "@/lib/client/fetch-json";

export type GscSyncResponse =
  | {
      status: "queued";
      jobId: string;
      message?: string;
    }
  | {
      status: "completed";
      results: Array<{
        connectionId: string;
        status: string;
        dailyRows?: number;
        queryRows?: number;
        error?: string;
      }>;
    };

export type GscJobStatusResponse = {
  status: "completed" | "failed" | "active" | "waiting" | "delayed" | "not_found" | "unknown";
  result?: { dailyRows?: number; queryRows?: number };
  failedReason?: string | null;
  error?: string;
};

/**
 * Triggers GSC sync via Next.js API (never calls Google directly).
 * When Redis/workers are available, polls until the background job completes.
 */
export async function runGscSyncForBrand(brandId: string): Promise<GscSyncResponse> {
  const started = await fetchJson<GscSyncResponse>("/api/gsc/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brandId }),
  });

  if (!started.ok) {
    if (started.status === 400 && started.error.toLowerCase().includes("connect")) {
      throw new Error("Connect Google Search Console for this client first.");
    }
    throw new Error(started.error);
  }

  const data = started.data;
  if (data.status === "completed") {
    return data;
  }

  if (data.status === "queued" && data.jobId) {
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      await sleep(2500);
      const poll = await fetchJson<GscJobStatusResponse>(`/api/gsc/sync?jobId=${encodeURIComponent(data.jobId)}`);
      if (!poll.ok) {
        throw new Error(poll.error);
      }
      const st = poll.data.status;
      if (st === "completed") {
        return {
          status: "completed",
          results: [
            {
              connectionId: "worker",
              status: "ok",
              dailyRows: poll.data.result?.dailyRows,
              queryRows: poll.data.result?.queryRows,
            },
          ],
        };
      }
      if (st === "failed") {
        throw new Error(poll.data.failedReason ?? poll.data.error ?? "Background sync failed");
      }
    }
    throw new Error("Sync is still running — refresh the page in a minute.");
  }

  return data;
}
