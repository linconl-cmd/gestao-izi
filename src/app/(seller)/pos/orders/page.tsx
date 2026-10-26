import { Flash, PageHeader } from "@/presentation/components/layout/app-shell";
import { OrderQr } from "@/presentation/components/pos/order-qr";
import { inputClass, listClass } from "@/presentation/components/shared/styles";
import { Badge } from "@/presentation/components/ui/badge";
import { cancelOrderAction } from "@/presentation/actions/orders";
import { orderSubtotal } from "@/core/domain/entities/order";
import { ORDER_STATUS_LABELS } from "@/presentation/lib/labels";
import { requireUser } from "@/presentation/lib/require-user";

const when = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
});

export default async function MyOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, { container, user }] = await Promise.all([
    searchParams,
    requireUser("owner", "manager", "seller"),
  ]);
  // RLS: vendedor só enxerga as próprias; dono/gerente veem todas em /owner/orders.
  const orders = await container.repositories.orders.list({ sellerId: user.id, limit: 40 });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Minhas comandas" description="Acompanhe o que enviou ao caixa. Comandas não recebidas expiram no fim do dia." />
      <Flash error={error} ok={ok} />
      {orders.length === 0 ? (
        <p className="text-muted-foreground">Você ainda não enviou nenhuma comanda.</p>
      ) : (
        <ul className={listClass}>
          {orders.map((o) => {
            const subtotal = orderSubtotal(o);
            const total = subtotal.subtract(o.suggestedDiscount);
            return (
              <li key={o.id} className="space-y-3 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-lg font-semibold tabular-nums">#{o.number}</p>
                  <Badge
                    variant={o.status === "paid" ? "default" : o.status === "open" ? "secondary" : "destructive"}
                    className="rounded-full"
                  >
                    {ORDER_STATUS_LABELS[o.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {when.format(o.createdAt)} ·{" "}
                  {o.items.map((i) => `${i.quantity}× ${i.productName}${i.size ? ` ${i.size}` : ""}`).join(", ")}
                </p>
                <p className="text-sm">
                  Estimado <strong className="tabular-nums">{total.format()}</strong>
                  {o.suggestedDiscount.cents > 0 && (
                    <span className="text-muted-foreground"> (desconto sugerido {o.suggestedDiscount.format()})</span>
                  )}
                </p>

                {o.status === "open" && (
                  <div className="flex flex-wrap items-start gap-3">
                    <OrderQr id={o.id} number={o.number} />
                    <form action={cancelOrderAction} className="flex flex-wrap gap-2">
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="returnTo" value="/pos/orders" />
                      <input name="reason" placeholder="Motivo (opcional)" aria-label="Motivo do cancelamento" className={`${inputClass} w-48`} />
                      <button type="submit" className="inline-flex h-11 items-center rounded-xl border border-destructive/40 px-4 text-sm font-medium text-destructive hover:bg-destructive/10">
                        Cancelar
                      </button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
