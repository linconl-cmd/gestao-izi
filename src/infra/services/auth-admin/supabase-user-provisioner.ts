import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProvisionUserInput, UserProvisioner } from "@/core/application/ports/user-provisioner";
import { ConflictError, InfrastructureError } from "@/core/domain/errors/domain-error";

/** role/store_id vão em app_metadata (só o servidor escreve); o trigger cria o profile. */
export class SupabaseUserProvisioner implements UserProvisioner {
  constructor(private readonly adminFactory: () => SupabaseClient) {}

  async createUser(input: ProvisionUserInput): Promise<{ id: string }> {
    const { data, error } = await this.adminFactory().auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      app_metadata: { role: input.role, store_id: input.storeId },
      user_metadata: { full_name: input.fullName },
    });
    if (error || !data.user) {
      if (error?.code === "email_exists") throw new ConflictError("E-mail already registered");
      throw new InfrastructureError(error?.message ?? "Could not create user");
    }
    return { id: data.user.id };
  }
}
