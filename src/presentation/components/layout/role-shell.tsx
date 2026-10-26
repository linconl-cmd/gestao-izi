import type { ReactNode } from "react";
import type { UserRole } from "@/core/domain/value-objects/user-role";
import { navFor, ROLE_LABELS } from "@/presentation/lib/nav";
import { requireUser } from "@/presentation/lib/require-user";
import { AppShell } from "./app-shell";
import { AutoRefresh } from "./auto-refresh";
import { NotificationBanner } from "./notification-banner";

const isStoreAdmin = (role: UserRole) => role === "owner" || role === "manager";

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
  const { profiles, orders, notifications } = container.repositories;
  const admin = isStoreAdmin(user.role);

  const profile = await profiles.findById(user.id).catch(() => null);
  const name = profile?.fullName ?? user.email ?? ROLE_LABELS[user.role];

  // Dono/gerente: expira comandas de dias anteriores (gera alerta) e mostra pendências.
  let pendingOrders = 0;
  let alerts: Awaited<ReturnType<typeof notifications.listUnread>> = [];
  if (admin) {
    await orders.expireStale().catch(() => 0);
    [pendingOrders, alerts] = await Promise.all([
      orders.countOpen().catch(() => 0),
      notifications.listUnread(5).catch(() => []),
    ]);
  }

  return (
    <AppShell
      title="Gestão Izi"
      nav={navFor(user.role, { pendingOrders })}
      user={{ name, roleLabel: ROLE_LABELS[user.role] }}
      wide={wide}
    >
      {admin && <AutoRefresh />}
      {admin && (
        <NotificationBanner
          items={alerts.map((n) => ({ id: n.id, title: n.title, body: n.body, createdAt: n.createdAt.toISOString() }))}
        />
      )}
      {children}
    </AppShell>
  );
}
