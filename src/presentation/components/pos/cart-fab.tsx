"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, ShoppingBag } from "lucide-react";
import { brl } from "@/presentation/lib/pos-types";

/** Botão flutuante do carrinho (mobile/tablet portrait): contagem + subtotal, abre o bottom sheet. */
export function CartFab({ count, subtotalCents, onClick }: { count: number; subtotalCents: number; onClick: () => void }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          type="button"
          onClick={onClick}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex h-14 max-w-md items-center gap-3 rounded-2xl bg-primary px-4 text-primary-foreground shadow-float lg:hidden"
          aria-label={`Abrir carrinho: ${count} itens, ${brl(subtotalCents)}`}
        >
          <span className="relative grid size-9 place-items-center rounded-xl bg-primary-foreground/15">
            <ShoppingBag className="size-5" />
            <motion.span
              key={count}
              initial={{ scale: 1.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-background px-1 text-[11px] font-bold text-foreground"
            >
              {count}
            </motion.span>
          </span>
          <span className="flex-1 text-left text-sm font-medium">Ver carrinho</span>
          <span className="text-base font-semibold tabular-nums">{brl(subtotalCents)}</span>
          <ChevronUp className="size-5 opacity-80" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
