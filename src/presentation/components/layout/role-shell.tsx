import type { ReactNode } from "react";
import type { UserRole } from "@/core/domain/value-objects/user-role";
import { navFor, ROLE_LABELS } from "@/presentation/lib/nav";
import { requireUser } from "@/presentation/lib/require-user";
import { AppShell } from "./app-shell";

/** Casca única do app: menu e identificação vêm do usuário logado, qualquer que seja a rota. */
export async function RoleShell({
  roles,
  wide,
  children,
}: {
  roles: UserRole[];
  wide?: boolean;
  children: ReactNode;
}) {
  const { container, user } = await requireUser(...roles);
  const profile = await container.repositories.profiles.findById(user.id).catch(() => null);
  const name = profile?.fullName ?? user.email ?? ROLE_LABELS[user.role];

  return (
    <AppShell
      title="Gestão Izi"
      nav={navFor(user.role)}
      user={{ name, roleLabel: ROLE_LABELS[user.role] }}
      wide={wide}
    >
      {children}
    </AppShell>
  );
}
