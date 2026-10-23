import type { SupabaseClient } from "@supabase/supabase-js";
import type { Store } from "@/core/domain/entities/store";
import type {
  NewStoreInput,
  StorePatch,
  StoreRepository,
} from "@/core/domain/repositories/store-repository";
import { toStore } from "../mappers/mappers";
import type { StoreRow } from "../types/rows";
import { assertNoError, requireRow } from "./errors";
import { compact } from "./utils";

export class SupabaseStoreRepository implements StoreRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: string): Promise<Store | null> {
    const { data, error } = await this.db.from("stores").select("*").eq("id", id).maybeSingle<StoreRow>();
    assertNoError(error);
    return data ? toStore(data) : null;
  }

  async list(): Promise<Store[]> {
    const { data, error } = await this.db.from("stores").select("*").order("name").returns<StoreRow[]>();
    assertNoError(error);
    return (data ?? []).map(toStore);
  }

  async create(input: NewStoreInput): Promise<Store> {
    const { data, error } = await this.db
      .from("stores")
      .insert({
        name: input.name,
        slug: input.slug,
        document: input.document ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
      })
      .select("*")
      .single<StoreRow>();
    return toStore(requireRow(data, error, "Store"));
  }

  async update(id: string, patch: StorePatch): Promise<Store> {
    const { data, error } = await this.db
      .from("stores")
      .update(
        compact({
          name: patch.name,
          slug: patch.slug,
          document: patch.document,
          email: patch.email,
          phone: patch.phone,
          address: patch.address,
          is_active: patch.isActive,
        }),
      )
      .eq("id", id)
      .select("*")
      .maybeSingle<StoreRow>();
    return toStore(requireRow(data, error, "Store"));
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("stores").delete().eq("id", id);
    assertNoError(error);
  }
}
