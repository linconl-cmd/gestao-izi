import type { UserRole } from "@/core/domain/value-objects/user-role";

export interface AuthUser {
  readonly id: string;
  readonly role: UserRole;
  /** Null para master. */
  readonly storeId: string | null;
  readonly email: string | null;
}

export interface SessionProvider {
  getCurrentUser(): Promise<AuthUser | null>;
}
