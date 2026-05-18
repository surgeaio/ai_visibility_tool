import { syncGscData } from "@/lib/services/gsc/sync";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import type { GscSyncJobData } from "@/lib/queues/types";

export async function executeGscSyncJob(data: GscSyncJobData): Promise<{
  connectionId: string;
  dailyRows: number;
  queryRows: number;
}> {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured on worker");
  }

  let connectionId = data.connectionId;
  if (!connectionId) {
    const { data: conn, error } = await admin
      .from("gsc_connections")
      .select("id")
      .eq("brand_id", data.brandId)
      .eq("is_active", true)
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Connection lookup failed: ${error.message}`);
    if (!conn) throw new Error("No active GSC connection for this brand");
    connectionId = conn.id;
  }

  const result = await syncGscData({
    connectionId,
    daysBack: data.daysBack ?? 28,
  });

  return { connectionId, ...result };
}
