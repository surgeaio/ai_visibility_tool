import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { syncGscConnectionRow, syncGscData } from "@/lib/services/gsc/sync";

type GscRow = Database["public"]["Tables"]["gsc_connections"]["Row"];

export { syncGscData };

export async function syncGscConnection(row: GscRow): Promise<{ rowsWritten: number }> {
  return syncGscConnectionRow(row);
}

export async function syncAllActiveGscConnections(): Promise<{ connections: number; rows: number }> {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) return { connections: 0, rows: 0 };

  const { data, error } = await admin.from("gsc_connections").select("*").eq("is_active", true);
  if (error || !data?.length) return { connections: 0, rows: 0 };

  let rows = 0;
  for (const row of data as GscRow[]) {
    try {
      const r = await syncGscConnection(row);
      rows += r.rowsWritten;
    } catch (e) {
      console.error("[gsc-sync] connection", row.id, e);
    }
  }
  return { connections: data.length, rows };
}
