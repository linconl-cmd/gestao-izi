import { requireStoreId } from "@/core/application/authorization";
import { cancelSaleAction } from "@/presentation/actions/sales";
import { Flash } from "@/presentation/components/layout/app-shell";
import { linkButtonClass } from "@/presentation/components/shared/styles";
import { requireUser } from "@/presentation/lib/require-user";

export default async function OwnerSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, { container, user }] = await Promise.all([searchParams, requireUser("owner")]);
  const [sales, team] = await Promise.all([
    container.repositories.sales.list({ limit: 50 }),
    container.repositories.profiles.listByStore(requireStoreId(user)),
  ]);
  const names = new Map(team.map((p) => [p.id, p.fullName]));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Vendas</h1>
      <Flash error={error} ok={ok} />
      {sales.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma venda registrada.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border bg-card shadow-soft">
          {sales.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="text-sm">
                <p className="font-medium">
                  {s.total.format()} · {s.paymentMethod}
                  {s.status === "cancelled" && <span className="text-destructive"> · cancelada</span>}
                </p>
                <p className="text-muted-foreground">
                  {s.createdAt.toLocaleString("pt-BR")} · {names.get(s.sellerId) ?? "—"}
                </p>
                <p className="text-muted-foreground">
                  {s.items.map((i) => `${i.quantity}× ${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ""}`).join(", ")}
                </p>
              </div>
              {s.status === "completed" && (
                <form action={cancelSaleAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className={linkButtonClass}>Cancelar</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
