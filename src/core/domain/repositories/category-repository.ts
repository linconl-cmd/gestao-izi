import type { Category } from "../entities/category";

export interface CategoryRepository {
  list(): Promise<Category[]>;
  create(input: { storeId: string; name: string; parentId?: string | null }): Promise<Category>;
  rename(id: string, name: string): Promise<Category>;
  delete(id: string): Promise<void>;
}
