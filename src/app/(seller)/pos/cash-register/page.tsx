import Link from "next/link";
import { closeCashRegisterAction, openCashRegisterAction } from "@/presentation/actions/cash-register";
import { Flash } from "@/presentation/components/layout/app-shell";
import { buttonClass, inputClass } from "@/presentation/components/shared/styles";
import { requireUser } from "@/presentation/lib/require-user";

export default async function CashRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, { container, user }] = await Promise.all([
    searchParams,
    requireUser("owner", "manager", "seller"),
  ]);
  const [open, recent] = await Promise.all([
    container.repositories.cashRegisters.findOpenByUser(user.id),
    container.repositories.cashRegisters.list({ limit: 10 }),
  ]);
  const closed = recent.filter((r) => r.status === "closed" && r.openedBy === user.id);

  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Caixa</h1>
      <Flash error={error} ok={ok} />

      {open ? (
        <section className="mb-8">
          <p className="mb-1 text-sm text-muted-foreground">
            Aberto em {open.openedAt.toLocaleString("pt-BR")} com {open.openingAmount.format()}.
          </p>
          <Link href="/pos" className="mb-4 inline-block text-sm underline">Ir para a venda</Link>
          <form action={closeCashRegisterAction} className="flex flex-col gap-3">
            <input type="hidden" name="registerId" value={open.id} />
            <input name="closingAmount" required inputMode="decimal" placeholder="Valor contado em dinheiro (R$)" className={inputClass} />
            <input name="notes" placeholder="Observações (opcional)" className={inputClass} />
            <button type="submit" className={buttonClass}>Fechar caixa</button>
          </form>
        </section>
      ) : (
        <form action={openCashRegisterAction} className="mb-8 flex flex-col gap-3">
          <input name="openingAmount" required inputMode="decimal" defaultValue="0" placeholder="Troco inicial (R$)" className={inputClass} />
          <button type="submit" className={buttonClass}>Abrir caixa</button>
        </form>
      )}

      {closed.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Últimos fechamentos</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border bg-card shadow-soft text-sm">
            {closed.map((r) => (
              <li key={r.id} className="px-3 py-2">
                {r.closedAt?.toLocaleString("pt-BR")} · contado {r.closingAmount?.format() ?? "—"} · esperado{" "}
                {r.expectedAmount?.format() ?? "—"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
