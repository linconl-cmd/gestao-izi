import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv, getServiceRoleKey } from "@/infra/config/env";

/** Service role IGNORA o RLS. Use somente em adapters de servidor após checar o ator. */
export function createSupabaseAdminClient(): SupabaseClient {
  return createClient(getPublicEnv().url, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
