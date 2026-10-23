import type { AuthUser } from "./ports/session-provider";
import { ForbiddenError } from "@/core/domain/errors/domain-error";
import type { UserRole } from "@/core/domain/value-objects/user-role";

export function assertRole(actor: AuthUser, ...allowed: UserRole[]): void {
  if (!allowed.includes(actor.role)) throw new ForbiddenError();
}

/** Garante que o ator tem loja e a devolve (owner/seller sempre têm). */
export function requireStoreId(actor: AuthUser): string {
  if (!actor.storeId) throw new ForbiddenError("User is not linked to a store");
  return actor.storeId;
}
