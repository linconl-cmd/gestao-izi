import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { UserRole } from "@/core/domain/value-objects/user-role";
import { getContainer } from "@/infra/di/server";
import { homeFor, LOGIN_PATH } from "./routes";

/** Uma única consulta ao Auth por requisição, compartilhada entre layout e página. */
const resolveSession = cache(async () => {
  const container = await getContainer();
  const user = await container.session.getCurrentUser();
  return { container, user };
});

/** Resolve container + usuário; redireciona se a sessão sumiu ou o papel não serve. */
export async function requireUser(...roles: UserRole[]) {
  const { container, user } = await resolveSession();
  if (!user) redirect(LOGIN_PATH);
  if (roles.length > 0 && !roles.includes(user.role)) redirect(homeFor(user.role));
  return { container, user };
}
