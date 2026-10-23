"use client";

import { useCallback, useMemo, useState } from "react";
import type { PosVariant } from "@/presentation/lib/pos-types";

export interface CartLine {
  variant: PosVariant;
  quantity: number;
}

export type AddResult = "added" | "max" | "unknown";

/** Carrinho do PDV. `index` resolve variantId -> variante (preço/estoque vêm do catálogo). */
export function useCart(index: ReadonlyMap<string, PosVariant>) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const lines = useMemo<CartLine[]>(
    () =>
      Object.entries(quantities).flatMap(([id, quantity]) => {
        const variant = index.get(id);
        return variant ? [{ variant, quantity }] : [];
      }),
    [quantities, index],
  );

  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotalCents = lines.reduce((sum, l) => sum + l.variant.priceCents * l.quantity, 0);

  const add = useCallback(
    (variantId: string): AddResult => {
      const variant = index.get(variantId);
      if (!variant) return "unknown";
      const current = quantities[variantId] ?? 0;
      if (current + 1 > variant.stock) return "max";
      setQuantities((q) => ({ ...q, [variantId]: (q[variantId] ?? 0) + 1 }));
      return "added";
    },
    [index, quantities],
  );

  const setQuantity = useCallback(
    (variantId: string, quantity: number) => {
      setQuantities((q) => {
        const { [variantId]: _removed, ...rest } = q;
        if (quantity <= 0) return rest;
        const max = index.get(variantId)?.stock ?? quantity;
        return { ...rest, [variantId]: Math.min(quantity, max) };
      });
    },
    [index],
  );

  const clear = useCallback(() => setQuantities({}), []);

  return { lines, count, subtotalCents, add, setQuantity, clear };
}
