import { Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStoreId } from "@/core/application/authorization";
import { itemsWithoutStock, orderSubtotal } from "@/core/domain/entities/order";
import { cancelOrderAction, setOrderItemAction } from "@/presentation/actions/orders";
import { Flash, PageHeader } from "@/presentation/components/layout/app-shell";
import { ReceiveForm } from "@/presentation/components/pos/receive-form";
import { inputClass, linkButtonClass, listClass } from "@/presentation/components/shared/styles";
import { Badge } from "@/presentation/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/presentation/lib/labels";
import { requireUser } from "@/presentation/lib/require-user";

const when = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
});

function StepForm({ orderId, variantId, quantity, label, children }: {
  orderId: string; variantId: string; quantity: number; label: string; children: React.ReactNode;
}) {
  return (
    <form action={setOrderItemAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="quantity" value={quantity} />
      <button type="submit" aria-label={label} className="grid size-11 place-items-center rounded-xl border hover:bg-muted">
        {children}
      </button>
    </form>
  );
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ id }, { error, ok }, { container, user }] = await Promise.all([
    params,
    searchParams,
    requireUser("owner", "manager"),
  ]);
  const order = await container.repositories.orders.findById(id).catch(() => null);
  if (!order) notFound();

  const [team, register] = await Promise.all([
    container.repositories.profiles.listByStore(requireStoreId(user)),
    container.repositories.cashRegisters.findOpenByUser(user.id),
  ]);
  const names = new Map(team.map((p) => [p.id, p.fullName]));
  const isOpen = order.status === "open";
  const subtotal = orderSubtotal(order);
  const short = itemsWithoutStock(order);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/owner/orders" className={linkButtonClass}>← Comandas</Link>
      <PageHeader
        title={`Comanda #${order.number}`}
        description={`Vendedor ${names.get(order.sellerId) ?? "—"} · criada em ${when.format(order.createdAt)}`}
      >
        <Badge variant={order.status === "paid" ? "default" : isOpen ? "secondary" : "destructive"} className="rounded-full text-sm">
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </PageHeader>
      <Flash error={error} ok={ok} />

      <ul className={`${listClass} mb-6`}>
        {order.items.map((i) => {
          const missing = i.quantity > i.stock;
          return (
            <li key={i.variantId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{i.productName}</p>
                <p className="text-sm text-muted-foreground">
                  {[i.size, i.color].filter(Boolean).join(" · ") || i.sku} · {i.unitPrice.format()}
                  {isOpen && (
                    <span className={missing ? "font-medium text-destructive" : ""}> · estoque {i.stock}</span>
                  )}
                </p>
              </div>
              {isOpen ? (
                <div className="flex items-center gap-2">
                  <StepForm orderId={order.id} variantId={i.variantId} quantity={i.quantity - 1} label="Diminuir">
                    {i.quantity === 1 ? <Trash2 className="size-4 text-destructive" /> : <Minus className="size-4" />}
                  </StepForm>
                  <span className="w-8 text-center font-semibold tabular-nums">{i.quantity}</span>
                  <StepForm orderId={order.id} variantId={i.variantId} quantity={Math.min(i.quantity + 1, i.stock)} label="Aumentar">
                    <Plus className="size-4" />
                  </StepForm>
                  <span className="w-24 text-right font-semibold tabular-nums">{i.unitPrice.times(i.quantity).format()}</span>
                </div>
              ) : (
                <p className="font-semibold tabular-nums">
                  {i.quantity}× {i.unitPrice.format()}
                </p>
              )}
            </li>
          );
        })}
        {order.items.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Comanda sem itens.</li>}
      </ul>

      {isOpen ? (
        <div className="space-y-6">
          <ReceiveForm
            orderId={order.id}
            subtotalCents={subtotal.cents}
            suggestedDiscountCents={order.suggestedDiscount.cents}
            registerOpen={Boolean(register)}
            blockedReason={
              order.items.length === 0
                ? "A comanda está vazia. Cancele-a ou peça ao vendedor para refazer."
                : short.length > 0
                  ? `Estoque insuficiente para: ${short.map((i) => `${i.productName} ${[i.size, i.color].filter(Boolean).join("/")}`).join(", ")}. Reduza a quantidade acima.`
                  : null
            }
          />

          <form action={cancelOrderAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="returnTo" value={`/owner/orders/${order.id}`} />
            <input name="reason" placeholder="Motivo do cancelamento (opcional)" aria-label="Motivo do cancelamento" className={`${inputClass} min-w-52 flex-1`} />
            <button type="submit" className="inline-flex h-11 items-center rounded-xl border border-destructive/40 px-4 text-sm font-medium text-destructive hover:bg-destructive/10">
              Cancelar comanda
            </button>
          </form>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-5 text-sm shadow-soft">
          <p>
            <strong>{ORDER_STATUS_LABELS[order.status]}</strong>
            {order.closedAt && <> em {when.format(order.closedAt)}</>}
            {order.closedBy && <> por {names.get(order.closedBy) ?? "—"}</>}
          </p>
          {order.cancelReason && <p className="mt-1 text-muted-foreground">Motivo: {order.cancelReason}</p>}
          {order.status === "expired" && (
            <p className="mt-1 text-muted-foreground">Não foi recebida no dia em que foi criada.</p>
          )}
          {order.saleId && (
            <p className="mt-2"><Link href="/owner/sales" className={linkButtonClass}>Ver nas vendas</Link></p>
          )}
        </div>
      )}
    </div>
  );
}
