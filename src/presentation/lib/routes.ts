import { isUserRole, type UserRole } from "@/core/domain/value-objects/user-role";

export const LOGIN_PATH = "/login";

export function homeFor(role: UserRole): string {
  switch (role) {
    case "master":
      return "/master/stores";
    case "owner":
    case "manager":
      return "/owner";
    case "seller":
      return "/pos";
  }
}

/** Prefixo de rota -> papéis que podem acessar. */
const GUARDS: ReadonlyArray<readonly [string, readonly UserRole[]]> = [
  ["/master", ["master"]],
  ["/owner", ["owner", "manager"]],
  ["/pos", ["owner", "manager", "seller"]],
];

export function isAllowed(pathname: string, role: UserRole): boolean {
  const guard = GUARDS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return guard ? guard[1].includes(role) : true;
}

export function roleFromClaims(claims: unknown): UserRole | null {
  const role = (claims as { app_metadata?: { role?: unknown } } | null)?.app_metadata?.role;
  return isUserRole(role) ? role : null;
}
