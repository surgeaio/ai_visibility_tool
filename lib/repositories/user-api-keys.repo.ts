import { isAuthBypassMode } from "@/lib/config";
import { decryptApiKey, encryptApiKey, getKeyPreview } from "@/lib/crypto/encryption";
import { DEMO_USER_API_KEYS_SEED } from "@/lib/demo/seed-data";
import { DatabaseError } from "@/lib/repositories/errors";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiKeyProvider } from "@/lib/validators/api-keys.schema";

type LlmKeyProvider = Extract<
  ApiKeyProvider,
  "openai" | "anthropic" | "gemini"
>;

const LLM_KEY_PROVIDERS: readonly LlmKeyProvider[] = ["openai", "anthropic", "gemini"];

function isLlmKeyProvider(p: ApiKeyProvider): p is LlmKeyProvider {
  return (LLM_KEY_PROVIDERS as readonly string[]).includes(p);
}

export interface UserApiKeyListItem {
  id: string;
  provider: ApiKeyProvider;
  keyName: string;
  keyPreview: string;
  isActive: boolean;
  lastUsedAt: string | null;
  testStatus: "untested" | "working" | "failed";
  testError: string | null;
  createdAt: string;
}

interface DemoStoredKey extends UserApiKeyListItem {
  encryptedKey: string;
}

let demoKeyStore: DemoStoredKey[] | null = null;

function getDemoStore(): DemoStoredKey[] {
  if (!demoKeyStore) {
    demoKeyStore = DEMO_USER_API_KEYS_SEED.map((row) => ({
      id: row.id,
      provider: row.provider,
      keyName: row.keyName,
      keyPreview: row.keyPreview,
      isActive: row.isActive,
      lastUsedAt: null,
      testStatus: row.testStatus,
      testError: row.testError,
      createdAt: row.createdAt,
      encryptedKey: encryptApiKey(row.demoSecret),
    }));
  }
  return demoKeyStore;
}

function toListItem(row: DemoStoredKey): UserApiKeyListItem {
  return {
    id: row.id,
    provider: row.provider,
    keyName: row.keyName,
    keyPreview: row.keyPreview,
    isActive: row.isActive,
    lastUsedAt: row.lastUsedAt,
    testStatus: row.testStatus,
    testError: row.testError,
    createdAt: row.createdAt,
  };
}

type UserApiKeyRow = {
  id: string;
  user_id: string;
  provider: string;
  key_name: string;
  encrypted_key: string;
  key_preview: string;
  is_active: boolean | null;
  last_used_at: string | null;
  test_status: string | null;
  test_error: string | null;
  created_at: string;
};

function mapDbRow(r: UserApiKeyRow): UserApiKeyListItem {
  return {
    id: r.id,
    provider: r.provider as ApiKeyProvider,
    keyName: r.key_name,
    keyPreview: r.key_preview,
    isActive: r.is_active ?? true,
    lastUsedAt: r.last_used_at,
    testStatus: (r.test_status ?? "untested") as UserApiKeyListItem["testStatus"],
    testError: r.test_error,
    createdAt: r.created_at,
  };
}

export class UserApiKeysRepository {
  async list(userId: string): Promise<UserApiKeyListItem[]> {
    void userId;
    if (isAuthBypassMode()) {
      return getDemoStore().map(toListItem);
    }
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("user_api_keys")
      .select(
        "id, user_id, provider, key_name, encrypted_key, key_preview, is_active, last_used_at, test_status, test_error, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new DatabaseError(error.message);
    return (data as UserApiKeyRow[]).map(mapDbRow);
  }

  async create(
    userId: string,
    input: { provider: ApiKeyProvider; keyName: string; apiKey: string },
  ): Promise<UserApiKeyListItem> {
    const preview = getKeyPreview(input.apiKey);
    const encrypted = encryptApiKey(input.apiKey);
    if (isAuthBypassMode()) {
      const row: DemoStoredKey = {
        id: crypto.randomUUID(),
        provider: input.provider,
        keyName: input.keyName,
        keyPreview: preview,
        isActive: true,
        lastUsedAt: null,
        testStatus: "untested",
        testError: null,
        createdAt: new Date().toISOString(),
        encryptedKey: encrypted,
      };
      getDemoStore().unshift(row);
      return toListItem(row);
    }
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("user_api_keys")
      .insert({
        user_id: userId,
        provider: input.provider,
        key_name: input.keyName,
        encrypted_key: encrypted,
        key_preview: preview,
        is_active: true,
        test_status: "untested",
      })
      .select(
        "id, user_id, provider, key_name, encrypted_key, key_preview, is_active, last_used_at, test_status, test_error, created_at",
      )
      .single();
    if (error) throw new DatabaseError(error.message);
    return mapDbRow(data as UserApiKeyRow);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    if (isAuthBypassMode()) {
      const store = getDemoStore();
      const idx = store.findIndex((k) => k.id === id);
      if (idx === -1) return false;
      store.splice(idx, 1);
      return true;
    }
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("user_api_keys").delete().eq("id", id).eq("user_id", userId);
    if (error) throw new DatabaseError(error.message);
    return true;
  }

  async getEncryptedSecret(userId: string, id: string): Promise<string | null> {
    if (isAuthBypassMode()) {
      const row = getDemoStore().find((k) => k.id === id);
      return row?.encryptedKey ?? null;
    }
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("user_api_keys")
      .select("encrypted_key")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message);
    const rec = data as { encrypted_key: string } | null;
    return rec?.encrypted_key ?? null;
  }

  async updateTestStatus(
    userId: string,
    id: string,
    status: "untested" | "working" | "failed",
    testError: string | null,
  ): Promise<void> {
    if (isAuthBypassMode()) {
      const row = getDemoStore().find((k) => k.id === id);
      if (row) {
        row.testStatus = status;
        row.testError = testError;
      }
      return;
    }
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("user_api_keys")
      .update({ test_status: status, test_error: testError, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw new DatabaseError(error.message);
  }

  /** At least one active LLM provider key (for prompt runs). */
  async hasAnyActiveLlmKey(userId: string): Promise<boolean> {
    const keys = await this.listActiveLlmKeysDecrypted(userId);
    return keys.length > 0;
  }

  /**
   * Decrypted keys for workers (service role). Demo mode uses in-memory demo store.
   */
  async listActiveLlmKeysDecrypted(userId: string): Promise<Array<{ provider: LlmKeyProvider; apiKey: string }>> {
    if (isAuthBypassMode()) {
      const out: Array<{ provider: LlmKeyProvider; apiKey: string }> = [];
      for (const k of getDemoStore()) {
        if (!k.isActive || !isLlmKeyProvider(k.provider)) continue;
        out.push({ provider: k.provider, apiKey: decryptApiKey(k.encryptedKey) });
      }
      return out;
    }
    const admin = tryCreateAdminSupabaseClient();
    if (!admin) {
      return [];
    }
    const { data, error } = await admin
      .from("user_api_keys")
      .select("provider, encrypted_key, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .in("provider", [...LLM_KEY_PROVIDERS]);
    if (error) throw new DatabaseError(error.message);
    const rows = (data ?? []) as { provider: string; encrypted_key: string }[];
    return rows
      .filter((r) => isLlmKeyProvider(r.provider as ApiKeyProvider))
      .map((r) => ({
        provider: r.provider as LlmKeyProvider,
        apiKey: decryptApiKey(r.encrypted_key),
      }));
  }
}
