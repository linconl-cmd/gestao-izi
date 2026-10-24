import { AlertTriangle, CalendarDays, Receipt, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { isLowStock } from "@/core/domain/entities/product";
import { Money } from "@/core/domain/value-objects/money";
import { PageHeader } from "@/presentation/components/layout/app-shell";
import { SellerFilter } from "@/presentation/components/dashboard/seller-filter";
import { Badge } from "@/presentation/components/ui/badge";
import { Card } from "@/presentation/components/ui/card";
import { PAYMENT_LABELS } from "@/presentation/lib/labels";
import { requireUser } from "@/presentation/lib/require-user";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
});

export default async function OwnerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ seller?: string }>;
}) {
  const [{ seller }, { container, user }] = await Promise.all([searchParams, requireUser("owner", "manager")]);
  const data = await container.useCases.getOwnerDashboard.execute(user, { sellerId: seller || undefined });

  const names = new Map(data.sellers.map((p) => [p.id, p.fullName]));
  const ticket = (s: { count: number; total: Money }) => (s.count === 0 ? Money.zero() : s.total.times(1 / s.count));
  const criticalVariants = data.lowStock.reduce((n, p) => n + p.variants.length, 0);

  return (
    <div>
      <PageHeader title="Painel" description="Resumo das vendas e do estoque da sua loja." />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Metric icon={<TrendingUp className="size-5" />} label="Faturamento hoje" value={data.today.total.format()}
          hint={`${data.today.count} venda${data.today.count === 1 ? "" : "s"} · ticket ${ticket(data.today).format()}`} />
        <Metric icon={<CalendarDays className="size-5" />} label="Faturamento do mês" value={data.month.total.format()}
          hint={`ticket médio ${ticket(data.month).format()}`} />
        <Metric icon={<Receipt className="size-5" />} label="Vendas no mês" value={String(data.month.count)}
          hint={`${data.today.count} hoje`} />
        <Metric icon={<AlertTriangle className="size-5" />} label="Estoque crítico" value={String(criticalVariants)}
          hint={criticalVariants === 0 ? "tudo em dia" : "variantes no mínimo ou abaixo"} tone={criticalVariants > 0 ? "warning" : "default"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Últimas vendas</h2>
            <SellerFilter sellers={data.sellers.map((s) => ({ id: s.id, name: s.fullName }))} value={seller ?? ""} />
          </div>

          {data.recentSales.length === 0 ? (
            <Card className="rounded-2xl p-8 text-center text-sm text-muted-foreground">Nenhuma venda encontrada.</Card>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
              <table className="w-full text-sm">
                <thead className="hidden bg-muted/50 text-left text-xs text-muted-foreground md:table-header-group">
                  <tr>
                    <th className="px-4 py-3 font-medium">Quando</th>
                    <th className="px-4 py-3 font-medium">Vendedor</th>
                    <th className="px-4 py-3 font-medium">Itens</th>
                    <th className="px-4 py-3 font-medium">Pagamento</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.recentSales.map((s) => {
                    const qty = s.items.reduce((n, i) => n + i.quantity, 0);
                    return (
                      <tr key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 px-4 py-3 md:table-row md:p-0">
                        <td className="text-muted-foreground md:px-4 md:py-3">{dateTime.format(s.createdAt)}</td>
                        <td className="font-medium md:px-4 md:py-3">{names.get(s.sellerId) ?? "—"}</td>
                        <td className="text-muted-foreground md:px-4 md:py-3">{qty} {qty === 1 ? "item" : "itens"}</td>
                        <td className="md:px-4 md:py-3">{PAYMENT_LABELS[s.paymentMethod]}</td>
                        <td className="text-right font-semibold tabular-nums md:px-4 md:py-3">
                          {s.status === "cancelled" ? (
                            <span className="inline-flex items-center gap-2">
                              <Badge variant="destructive" className="rounded-full">cancelada</Badge>
                              <span className="line-through opacity-60">{s.total.format()}</span>
                            </span>
                          ) : (
                            s.total.format()
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Link href="/owner/sales" className="mt-3 inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Ver todas as vendas
          </Link>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Estoque crítico</h2>
          {data.lowStock.length === 0 ? (
            <Card className="rounded-2xl p-6 text-center text-sm text-muted-foreground">Nenhuma variante abaixo do mínimo.</Card>
          ) : (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-soft">
              {data.lowStock.slice(0, 10).map((p) => (
                <li key={p.id}>
                  <Link href={`/owner/products/${p.id}`} className="block px-4 py-3 hover:bg-muted/60">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      {p.variants.filter(isLowStock).map((v) => (
                        <Badge key={v.id} variant={v.stockQuantity === 0 ? "destructive" : "secondary"} className="rounded-full tabular-nums">
                          {[v.size, v.color].filter(Boolean).join(" ") || v.sku}: {v.stockQuantity}
                        </Badge>
                      ))}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({
  icon, label, value, hint, tone = "default",
}: { icon: ReactNode; label: string; value: string; hint: string; tone?: "default" | "warning" }) {
  return (
    <Card className="gap-2 rounded-2xl p-4 shadow-soft sm:p-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {label}
        <span className={tone === "warning" ? "text-warning" : "text-primary"}>{icon}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}
