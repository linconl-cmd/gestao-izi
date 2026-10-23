import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthUser, SessionProvider } from "@/core/application/ports/session-provider";
import { isUserRole } from "@/core/domain/value-objects/user-role";

export class SupabaseSessionProvider implements SessionProvider {
  constructor(private readonly db: SupabaseClient) {}

  async getCurrentUser(): Promise<AuthUser | null> {
    // getUser valida o token no Auth server (não confia só no cookie).
    const { data, error } = await this.db.auth.getUser();
    if (error || !data.user) return null;

    const meta = data.user.app_metadata as { role?: unknown; store_id?: unknown };
    if (!isUserRole(meta.role)) return null;
    return {
      id: data.user.id,
      role: meta.role,
      storeId: typeof meta.store_id === "string" ? meta.store_id : null,
      email: data.user.email ?? null,
    };
  }
}
