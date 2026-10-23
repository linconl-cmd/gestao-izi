import { PAYMENT_LABELS } from "@/presentation/lib/labels";
import { requireUser } from "@/presentation/lib/require-user";

export default async function PosHistoryPage() {
  const { container, user } = await requireUser("owner", "seller");
  const sales = await container.repositories.sales.list({ sellerId: user.id, limit: 30 });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Minhas vendas</h1>
      {sales.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma venda ainda.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border bg-card shadow-soft">
          {sales.map((s) => (
            <li key={s.id} className="px-4 py-3 text-sm">
              <p className="font-medium">
                {s.total.format()} · {PAYMENT_LABELS[s.paymentMethod]}
                {s.status === "cancelled" && <span className="text-destructive"> · cancelada</span>}
              </p>
              <p className="text-muted-foreground">{s.createdAt.toLocaleString("pt-BR")}</p>
              <p className="text-muted-foreground">
                {s.items.map((i) => `${i.quantity}× ${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ""}`).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
