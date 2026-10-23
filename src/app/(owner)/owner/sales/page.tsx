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
      <h1 className="mb-4 text-xl font-semibold">Vendas</h1>
      <Flash error={error} ok={ok} />
      {sales.length === 0 ? (
        <p className="text-zinc-500">Nenhuma venda registrada.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded border border-zinc-200">
          {sales.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="text-sm">
                <p className="font-medium">
                  {s.total.format()} · {s.paymentMethod}
                  {s.status === "cancelled" && <span className="text-red-600"> · cancelada</span>}
                </p>
                <p className="text-zinc-500">
                  {s.createdAt.toLocaleString("pt-BR")} · {names.get(s.sellerId) ?? "—"}
                </p>
                <p className="text-zinc-500">
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
