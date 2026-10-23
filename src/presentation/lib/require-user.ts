import "server-only";
import { redirect } from "next/navigation";
import type { AuthUser } from "@/core/application/ports/session-provider";
import type { UserRole } from "@/core/domain/value-objects/user-role";
import { getContainer } from "@/infra/di/server";
import { homeFor, LOGIN_PATH } from "./routes";

/** Resolve container + usuário; redireciona se a sessão sumiu ou o papel não serve. */
export async function requireUser(...roles: UserRole[]) {
  const container = await getContainer();
  const user = await container.session.getCurrentUser();
  if (!user) redirect(LOGIN_PATH);
  if (roles.length > 0 && !roles.includes(user.role)) redirect(homeFor(user.role));
  return { container, user: user as AuthUser };
}
