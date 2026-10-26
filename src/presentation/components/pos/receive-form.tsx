"use client";

import { Banknote, CreditCard, Ellipsis, Gift, QrCode, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PAYMENT_METHODS, type PaymentMethod } from "@/core/domain/value-objects/payment-method";
import { payOrderAction } from "@/presentation/actions/orders";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { PAYMENT_LABELS } from "@/presentation/lib/labels";
import { brl } from "@/presentation/lib/pos-types";
import { cn } from "@/presentation/lib/utils";

const ICONS: Record<PaymentMethod, LucideIcon> = {
  cash: Banknote,
  credit_card: CreditCard,
  debit_card: CreditCard,
  pix: QrCode,
  store_credit: Gift,
  other: Ellipsis,
};

const toCents = (text: string) => Math.max(0, Math.round(Number(text.replace(",", ".") || 0) * 100) || 0);

/** Recebimento: o gerente aplica o desconto (vem preenchido com a sugestão do vendedor) e escolhe o pagamento. */
export function ReceiveForm({
  orderId,
  subtotalCents,
  suggestedDiscountCents,
  blockedReason,
  registerOpen,
}: {
  orderId: string;
  subtotalCents: number;
  suggestedDiscountCents: number;
  /** Ex.: estoque insuficiente. Bloqueia o botão. */
  blockedReason: string | null;
  registerOpen: boolean;
}) {
  const [payment, setPayment] = useState<PaymentMethod>("pix");
  const [discount, setDiscount] = useState(suggestedDiscountCents ? (suggestedDiscountCents / 100).toFixed(2).replace(".", ",") : "");

  const discountCents = Math.min(toCents(discount), subtotalCents);
  const total = subtotalCents - discountCents;
  const canSubmit = registerOpen && !blockedReason;

  return (
    <form action={payOrderAction} className="space-y-5 rounded-2xl border bg-card p-5 shadow-soft">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="paymentMethod" value={payment} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Forma de pagamento</legend>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((m) => {
            const Icon = ICONS[m];
            const active = payment === m;
            return (
              <button key={m} type="button" aria-pressed={active} onClick={() => setPayment(m)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-xs font-medium transition-colors",
                  active ? "border-primary bg-accent-soft text-accent-soft-foreground" : "text-muted-foreground hover:bg-muted",
                )}>
                <Icon className="size-5" />
                {PAYMENT_LABELS[m]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="receive-discount" className="mb-1 block text-sm font-medium">Desconto (R$)</label>
        <Input id="receive-discount" name="discount" inputMode="decimal" placeholder="0,00" value={discount}
          onChange={(e) => setDiscount(e.target.value)} className="text-right tabular-nums" />
        {suggestedDiscountCents > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            O vendedor sugeriu {brl(suggestedDiscountCents)}. Altere ou apague para não conceder.
          </p>
        )}
      </div>

      <dl className="space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground"><dt>Subtotal</dt><dd className="tabular-nums">{brl(subtotalCents)}</dd></div>
        {discountCents > 0 && (
          <div className="flex justify-between text-success"><dt>Desconto</dt><dd className="tabular-nums">− {brl(discountCents)}</dd></div>
        )}
        <div className="flex items-baseline justify-between pt-1">
          <dt className="text-base font-medium">Total a receber</dt>
          <dd className="text-3xl font-semibold tracking-tight tabular-nums">{brl(total)}</dd>
        </div>
      </dl>

      {!registerOpen && (
        <p role="alert" className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          Você precisa abrir o seu caixa para receber.{" "}
          <Link href="/pos/cash-register" className="font-medium underline underline-offset-4">Abrir caixa</Link>
        </p>
      )}
      {blockedReason && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{blockedReason}</p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
        Confirmar recebimento
      </Button>
    </form>
  );
}
