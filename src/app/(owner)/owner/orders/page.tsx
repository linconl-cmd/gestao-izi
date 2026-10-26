import Link from "next/link";
import { requireStoreId } from "@/core/application/authorization";
import { orderSubtotal } from "@/core/domain/entities/order";
import { Flash, PageHeader } from "@/presentation/components/layout/app-shell";
import { OrderLookup } from "@/presentation/components/pos/order-lookup";
import { buttonClass, listClass } from "@/presentation/components/shared/styles";
import { Badge } from "@/presentation/components/ui/badge";
import { Card } from "@/presentation/components/ui/card";
import { ORDER_STATUS_LABELS } from "@/presentation/lib/labels";
import { requireUser } from "@/presentation/lib/require-user";

const when = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
});

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, { container, user }] = await Promise.all([searchParams, requireUser("owner", "manager")]);
  const { orders, profiles } = container.repositories;

  const [open, recent, team] = await Promise.all([
    orders.list({ status: "open", limit: 100 }),
    orders.list({ from: new Date(Date.now() - 2 * 24 * 3600 * 1000), limit: 60 }),
    profiles.listByStore(requireStoreId(user)),
  ]);
  const names = new Map(team.map((p) => [p.id, p.fullName]));
  const closed = recent.filter((o) => o.status !== "open").slice(0, 20);
  // Mais antigas primeiro: quem chegou antes é atendido antes.
  const queue = [...open].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <div>
      <PageHeader title="Comandas" description="Pré-vendas enviadas pelos vendedores, aguardando o recebimento." />
      <Flash error={error} ok={ok} />

      <div className="mb-8">
        <OrderLookup />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Aguardando caixa ({queue.length})</h2>
      {queue.length === 0 ? (
        <Card className="mb-8 rounded-2xl p-8 text-center text-sm text-muted-foreground">Nenhuma comanda aguardando.</Card>
      ) : (
        <ul className={`${listClass} mb-8`}>
          {queue.map((o) => {
            const total = orderSubtotal(o).subtract(o.suggestedDiscount);
            return (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <div className="min-w-0">
                  <p className="font-semibold tabular-nums">
                    #{o.number} <span className="font-normal text-muted-foreground">· {names.get(o.sellerId) ?? "—"}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {when.format(o.createdAt)} · {o.items.reduce((n, i) => n + i.quantity, 0)} item(ns)
                    {o.suggestedDiscount.cents > 0 && ` · desconto sugerido ${o.suggestedDiscount.format()}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-lg font-semibold tabular-nums">{total.format()}</p>
                  <Link href={`/owner/orders/${o.id}`} className={buttonClass}>Receber</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {closed.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Recentes</h2>
          <ul className={listClass}>
            {closed.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <strong className="tabular-nums">#{o.number}</strong>{" "}
                  <span className="text-muted-foreground">
                    · {names.get(o.sellerId) ?? "—"} · {when.format(o.createdAt)}
                  </span>
                </span>
                <Link href={`/owner/orders/${o.id}`} className="inline-flex">
                  <Badge variant={o.status === "paid" ? "default" : "destructive"} className="rounded-full">
                    {ORDER_STATUS_LABELS[o.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
