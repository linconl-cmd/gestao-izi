import type { Store } from "../entities/store";

export interface NewStoreInput {
  name: string;
  slug: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
}

export type StorePatch = Partial<
  NewStoreInput & { address: Record<string, unknown>; isActive: boolean }
>;

export interface StoreRepository {
  findById(id: string): Promise<Store | null>;
  list(): Promise<Store[]>;
  create(input: NewStoreInput): Promise<Store>;
  update(id: string, patch: StorePatch): Promise<Store>;
  delete(id: string): Promise<void>;
}
