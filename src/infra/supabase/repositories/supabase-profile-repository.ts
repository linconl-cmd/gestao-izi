import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/core/domain/entities/profile";
import type { ProfileRepository } from "@/core/domain/repositories/profile-repository";
import { toProfile } from "../mappers/mappers";
import type { ProfileRow } from "../types/rows";
import { assertNoError, requireRow } from "./errors";

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await this.db.from("profiles").select("*").eq("id", id).maybeSingle<ProfileRow>();
    assertNoError(error);
    return data ? toProfile(data) : null;
  }

  async listByStore(storeId: string): Promise<Profile[]> {
    const { data, error } = await this.db
      .from("profiles")
      .select("*")
      .eq("store_id", storeId)
      .order("full_name")
      .returns<ProfileRow[]>();
    assertNoError(error);
    return (data ?? []).map(toProfile);
  }

  async setActive(id: string, isActive: boolean): Promise<Profile> {
    return this.patch(id, { is_active: isActive });
  }

  async updateName(id: string, fullName: string): Promise<Profile> {
    return this.patch(id, { full_name: fullName });
  }

  private async patch(id: string, values: Record<string, unknown>): Promise<Profile> {
    const { data, error } = await this.db
      .from("profiles")
      .update(values)
      .eq("id", id)
      .select("*")
      .maybeSingle<ProfileRow>();
    return toProfile(requireRow(data, error, "Profile"));
  }
}
