import type { Profile } from "../entities/profile";

export interface ProfileRepository {
  findById(id: string): Promise<Profile | null>;
  /** Equipe da loja (RLS limita ao store_id do owner; master informa a loja). */
  listByStore(storeId: string): Promise<Profile[]>;
  setActive(id: string, isActive: boolean): Promise<Profile>;
  updateName(id: string, fullName: string): Promise<Profile>;
}
