"use client";

import { BellRing } from "lucide-react";
import { usePathname } from "next/navigation";
import { markNotificationsReadAction } from "@/presentation/actions/orders";

export interface BannerNotification {
  id: string;
  title: string;
  body: string | null;
  createdAt: string; // ISO
}

const when = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
});

/** Alertas para dono/gerente (ex.: caixa fechado com comandas pendentes). Aparece em todas as telas. */
export function NotificationBanner({ items }: { items: BannerNotification[] }) {
  const pathname = usePathname();
  if (items.length === 0) return null;

  return (
    <section aria-label="Alertas" className="mb-6 space-y-2 print:hidden">
      {items.map((n) => (
        <div key={n.id} role="alert" className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <BellRing className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">{n.title}</p>
            {n.body && <p className="mt-0.5 text-muted-foreground">{n.body}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{when.format(new Date(n.createdAt))}</p>
          </div>
          <form action={markNotificationsReadAction}>
            <input type="hidden" name="id" value={n.id} />
            <input type="hidden" name="returnTo" value={pathname} />
            <button type="submit" className="min-h-10 shrink-0 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              Ciente
            </button>
          </form>
        </div>
      ))}
      {items.length > 1 && (
        <form action={markNotificationsReadAction} className="text-right">
          <input type="hidden" name="returnTo" value={pathname} />
          <button type="submit" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Marcar todas como lidas
          </button>
        </form>
      )}
    </section>
  );
}
