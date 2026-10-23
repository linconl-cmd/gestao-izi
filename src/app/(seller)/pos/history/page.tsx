import { PAYMENT_LABELS } from "@/presentation/lib/labels";
import { requireUser } from "@/presentation/lib/require-user";

export default async function PosHistoryPage() {
  const { container, user } = await requireUser("owner", "seller");
  const sales = await container.repositories.sales.list({ sellerId: user.id, limit: 30 });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Minhas vendas</h1>
      {sales.length === 0 ? (
        <p className="text-zinc-500">Nenhuma venda ainda.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded border border-zinc-200">
          {sales.map((s) => (
            <li key={s.id} className="px-4 py-3 text-sm">
              <p className="font-medium">
                {s.total.format()} · {PAYMENT_LABELS[s.paymentMethod]}
                {s.status === "cancelled" && <span className="text-red-600"> · cancelada</span>}
              </p>
              <p className="text-zinc-500">{s.createdAt.toLocaleString("pt-BR")}</p>
              <p className="text-zinc-500">
                {s.items.map((i) => `${i.quantity}× ${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ""}`).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
