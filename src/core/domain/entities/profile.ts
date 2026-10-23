import type { UserRole } from "../value-objects/user-role";

export interface Profile {
  readonly id: string;
  /** Null para master e para contas ainda não provisionadas. */
  readonly storeId: string | null;
  readonly role: UserRole;
  readonly fullName: string;
  readonly email: string | null;
  readonly avatarUrl: string | null;
  readonly isActive: boolean;
}
