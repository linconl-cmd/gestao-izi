import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category } from "@/core/domain/entities/category";
import type { CategoryRepository } from "@/core/domain/repositories/category-repository";
import { toCategory } from "../mappers/mappers";
import type { CategoryRow } from "../types/rows";
import { assertNoError, requireRow } from "./errors";

export class SupabaseCategoryRepository implements CategoryRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(): Promise<Category[]> {
    const { data, error } = await this.db.from("categories").select("*").order("name").returns<CategoryRow[]>();
    assertNoError(error);
    return (data ?? []).map(toCategory);
  }

  async create(input: { storeId: string; name: string; parentId?: string | null }): Promise<Category> {
    const { data, error } = await this.db
      .from("categories")
      .insert({ store_id: input.storeId, name: input.name, parent_id: input.parentId ?? null })
      .select("*")
      .single<CategoryRow>();
    return toCategory(requireRow(data, error, "Category"));
  }

  async rename(id: string, name: string): Promise<Category> {
    const { data, error } = await this.db
      .from("categories")
      .update({ name })
      .eq("id", id)
      .select("*")
      .maybeSingle<CategoryRow>();
    return toCategory(requireRow(data, error, "Category"));
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("categories").delete().eq("id", id);
    assertNoError(error);
  }
}
