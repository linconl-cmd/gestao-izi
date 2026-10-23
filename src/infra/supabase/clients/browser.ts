import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/infra/config/env";

export function createSupabaseBrowserClient(): SupabaseClient {
  const { url, anonKey } = getPublicEnv();
  return createBrowserClient(url, anonKey);
}
