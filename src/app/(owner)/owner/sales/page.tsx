import { requireStoreId } from "@/core/application/authorization";
import { cancelSaleAction } from "@/presentation/actions/sales";
import { Flash, PageHeader } from "@/presentation/components/layout/app-shell";
import { inputClass } from "@/presentation/components/shared/styles";
import { Badge } from "@/presentation/components/ui/badge";
import { PAYMENT_LABELS } from "@/presentation/lib/labels";
import { requireUser } from "@/presentation/lib/require-user";

const when = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export default async function OwnerSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, { container, user }] = await Promise.all([searchParams, requireUser("owner", "manager")]);
  const [sales, team] = await Promise.all([
    container.repositories.sales.list({ limit: 50 }),
    container.repositories.profiles.listByStore(requireStoreId(user)),
  ]);
  const names = new Map(team.map((p) => [p.id, p.fullName]));

  return (
    <div>
      <PageHeader title="Vendas" description="Cancelamentos exigem motivo e ficam registrados com quem cancelou, data e hora." />
      <Flash error={error} ok={ok} />
      {sales.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma venda registrada.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border bg-card shadow-soft">
          {sales.map((s) => (
            <li key={s.id} className="space-y-3 px-4 py-3">
              <div className="min-w-0 text-sm">
                <p className="font-medium">
                  {s.status === "cancelled" ? (
                    <span className="line-through opacity-60">{s.total.format()}</span>
                  ) : (
                    s.total.format()
                  )}
                  {" · "}
                  {PAYMENT_LABELS[s.paymentMethod]}
                  {s.status === "cancelled" && (
                    <Badge variant="destructive" className="ml-2 rounded-full">cancelada</Badge>
                  )}
                </p>
                <p className="text-muted-foreground">
                  {when.format(s.createdAt)} · vendedor {names.get(s.sellerId) ?? "—"}
                </p>
                <p className="text-muted-foreground">
                  {s.items.map((i) => `${i.quantity}× ${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ""}`).join(", ")}
                </p>
              </div>

              {s.status === "cancelled" && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Cancelada por <strong>{(s.cancelledBy && names.get(s.cancelledBy)) || "usuário removido"}</strong>
                  {s.cancelledAt && <> em {when.format(s.cancelledAt)}</>}
                  {s.cancelReason && <> — motivo: {s.cancelReason}</>}
                </p>
              )}

              {s.status === "completed" && (
                <form action={cancelSaleAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={s.id} />
                  <input
                    name="reason"
                    required
                    minLength={3}
                    maxLength={200}
                    placeholder="Motivo do cancelamento"
                    aria-label="Motivo do cancelamento"
                    className={`${inputClass} min-w-52 flex-1`}
                  />
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center rounded-xl border border-destructive/40 px-4 text-sm font-medium text-destructive transition hover:bg-destructive/10"
                  >
                    Cancelar venda
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
