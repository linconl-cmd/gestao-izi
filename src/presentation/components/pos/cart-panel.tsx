"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Banknote, CreditCard, Ellipsis, Gift, Minus, Plus, QrCode, ShoppingBag, Trash2, type LucideIcon } from "lucide-react";
import { PAYMENT_METHODS, type PaymentMethod } from "@/core/domain/value-objects/payment-method";
import type { CartLine } from "@/presentation/hooks/use-cart";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { PAYMENT_LABELS } from "@/presentation/lib/labels";
import { brl, variantLabel } from "@/presentation/lib/pos-types";
import { cn } from "@/presentation/lib/utils";

const PAYMENT_ICONS: Record<PaymentMethod, LucideIcon> = {
  cash: Banknote,
  credit_card: CreditCard,
  debit_card: CreditCard,
  pix: QrCode,
  store_credit: Gift,
  other: Ellipsis,
};

export interface CartPanelProps {
  /** "order" = pré-venda do vendedor (sugere desconto, envia ao caixa); "sale" = recebimento direto. */
  mode?: "sale" | "order";
  lines: CartLine[];
  subtotalCents: number;
  discount: string;
  discountCents: number;
  payment: PaymentMethod;
  pending: boolean;
  /** Mostra a dica de atalho (desktop). */
  showShortcuts?: boolean;
  onDiscountChange: (value: string) => void;
  onPaymentChange: (method: PaymentMethod) => void;
  onQuantity: (variantId: string, quantity: number) => void;
  onClear: () => void;
  onFinalize: () => void;
}

export function CartPanel(p: CartPanelProps) {
  const isOrder = p.mode === "order";
  const total = p.subtotalCents - p.discountCents;
  const count = p.lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ShoppingBag className="size-5 text-primary" />
          Carrinho
          {count > 0 && (
            <motion.span key={count} initial={{ scale: 1.4 }} animate={{ scale: 1 }}
              className="grid min-w-6 place-items-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
              {count}
            </motion.span>
          )}
        </h2>
        {p.lines.length > 0 && (
          <Button variant="ghost" size="sm" onClick={p.onClear} className="text-muted-foreground">
            <Trash2 className="size-4" /> Limpar
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3">
        {p.lines.length === 0 ? (
          <div className="grid h-full min-h-40 place-items-center px-6 text-center text-sm text-muted-foreground">
            <div>
              <ShoppingBag className="mx-auto mb-3 size-10 opacity-30" />
              Bipe uma etiqueta ou toque no tamanho do produto para adicionar.
            </div>
          </div>
        ) : (
          <ul className="space-y-1 pb-2">
            <AnimatePresence initial={false} mode="popLayout">
              {p.lines.map(({ variant: v, quantity }) => (
                <motion.li
                  key={v.variantId}
                  layout
                  initial={{ opacity: 0, x: 28, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -28, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{v.productName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {variantLabel(v) || v.sku} · {brl(v.priceCents)}
                    </p>
                  </div>
                  <div className="flex items-center rounded-xl border">
                    <button type="button" aria-label="Diminuir" onClick={() => p.onQuantity(v.variantId, quantity - 1)}
                      className="grid size-11 place-items-center rounded-l-xl transition-colors hover:bg-muted active:bg-accent-soft">
                      {quantity === 1 ? <Trash2 className="size-4 text-destructive" /> : <Minus className="size-4" />}
                    </button>
                    <span className="w-7 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                    <button type="button" aria-label="Aumentar" disabled={quantity >= v.stock}
                      onClick={() => p.onQuantity(v.variantId, quantity + 1)}
                      className="grid size-11 place-items-center rounded-r-xl transition-colors hover:bg-muted active:bg-accent-soft disabled:opacity-30">
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <p className="w-20 text-right text-sm font-semibold tabular-nums">{brl(v.priceCents * quantity)}</p>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <div className="space-y-4 border-t px-5 pt-4 pb-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {!isOrder && (
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-muted-foreground">Pagamento</legend>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((m) => {
              const Icon = PAYMENT_ICONS[m];
              const active = p.payment === m;
              return (
                <button key={m} type="button" aria-pressed={active} onClick={() => p.onPaymentChange(m)}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 text-[11px] font-medium transition-colors",
                    active ? "border-primary bg-accent-soft text-accent-soft-foreground" : "text-muted-foreground hover:bg-muted",
                  )}>
                  <Icon className="size-4" />
                  {PAYMENT_LABELS[m]}
                </button>
              );
            })}
          </div>
        </fieldset>
        )}

        <div className="flex items-center gap-3">
          <label htmlFor="pos-discount" className="text-sm text-muted-foreground">{isOrder ? "Sugerir desconto" : "Desconto"}</label>
          <Input id="pos-discount" inputMode="decimal" placeholder="R$ 0,00" value={p.discount}
            onChange={(e) => p.onDiscountChange(e.target.value)} className="text-right tabular-nums" />
        </div>

        {isOrder && (
          <p className="-mt-2 text-xs text-muted-foreground">
            É só uma sugestão: o gerente aplica (ou não) o desconto na hora de receber.
          </p>
        )}

        <dl className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <dt>Subtotal</dt><dd className="tabular-nums">{brl(p.subtotalCents)}</dd>
          </div>
          {p.discountCents > 0 && (
            <div className="flex justify-between text-success">
              <dt>{isOrder ? "Desconto sugerido" : "Desconto"}</dt><dd className="tabular-nums">− {brl(p.discountCents)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-1">
            <dt className="text-base font-medium">Total</dt>
            <motion.dd key={total} initial={{ scale: 1.06 }} animate={{ scale: 1 }} className="text-3xl font-semibold tracking-tight tabular-nums">
              {brl(total)}
            </motion.dd>
          </div>
        </dl>

        <Button size="lg" className="w-full" disabled={p.lines.length === 0 || p.pending} onClick={p.onFinalize}>
          {p.pending ? (isOrder ? "Enviando…" : "Registrando…") : isOrder ? "Enviar ao caixa" : "Finalizar venda"}
          {p.showShortcuts && !p.pending && (
            <kbd className="ml-1 hidden rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-medium lg:inline">Enter</kbd>
          )}
        </Button>
      </div>
    </div>
  );
}
