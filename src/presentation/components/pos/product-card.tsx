"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { Card } from "@/presentation/components/ui/card";
import { brl, type PosProduct, type PosVariant } from "@/presentation/lib/pos-types";
import { cn } from "@/presentation/lib/utils";

export interface Flash {
  variantId: string;
  n: number;
}

function hueOf(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function priceLabel(variants: PosVariant[]): string {
  const prices = variants.map((v) => v.priceCents);
  const min = Math.min(...prices);
  return min === Math.max(...prices) ? brl(min) : `a partir de ${brl(min)}`;
}

export function ProductCard({
  product,
  flash,
  onAdd,
}: {
  product: PosProduct;
  flash: Flash | null;
  onAdd: (variant: PosVariant) => void;
}) {
  const hue = hueOf(product.name);
  return (
    <Card className="gap-3 rounded-2xl p-4 shadow-soft transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-xl text-sm font-semibold"
          style={{ background: `oklch(0.94 0.04 ${hue})`, color: `oklch(0.4 0.12 ${hue})` }}
        >
          {initials(product.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium leading-tight">{product.name}</h3>
          <p className="truncate text-xs text-muted-foreground">{product.brand ?? "Sem marca"}</p>
        </div>
        <p className="shrink-0 text-right text-sm font-semibold tabular-nums">{priceLabel(product.variants)}</p>
      </div>

      <ul className="flex flex-wrap gap-2">
        {product.variants.map((v) => {
          const out = v.stock <= 0;
          const low = !out && v.stock <= 2;
          const flashing = flash?.variantId === v.variantId;
          return (
            <li key={v.variantId}>
              <motion.button
                type="button"
                disabled={out}
                whileTap={{ scale: 0.92 }}
                onClick={() => onAdd(v)}
                aria-label={`Adicionar ${v.productName} ${v.size ?? ""} ${v.color ?? ""}, ${brl(v.priceCents)}, ${v.stock} em estoque`}
                className={cn(
                  "relative flex min-h-12 min-w-12 flex-col items-center justify-center rounded-xl border px-3 py-1.5 text-center transition-colors",
                  "hover:border-primary/60 hover:bg-accent-soft focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                  out && "cursor-not-allowed opacity-40",
                  flashing && "border-primary bg-accent-soft",
                )}
              >
                <span className={cn("text-base font-semibold leading-none", out && "line-through")}>
                  {v.size ?? v.color ?? "Único"}
                </span>
                <span className="mt-1 text-[10px] leading-none text-muted-foreground">
                  {v.size && v.color ? `${v.color} · ` : ""}
                  {out ? "esgotado" : `${v.stock} un.`}
                </span>
                {low && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-warning" title="Estoque baixo" />}

                <AnimatePresence>
                  {flashing && (
                    <motion.span
                      key={flash.n}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow"
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
