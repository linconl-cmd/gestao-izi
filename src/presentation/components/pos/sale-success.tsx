"use client";

import { AnimatePresence, motion } from "framer-motion";

/** Confirmação de venda: check desenhado + total. Toque ou tempo fecham. */
export function SaleSuccess({ total, onDone }: { total: string | null; onDone: () => void }) {
  return (
    <AnimatePresence>
      {total && (
        <motion.div
          role="status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDone}
          className="fixed inset-0 z-[70] grid cursor-pointer place-items-center bg-background/85 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.85, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <span className="grid size-24 place-items-center rounded-full bg-success text-white shadow-float">
              <svg viewBox="0 0 24 24" className="size-12" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ delay: 0.15, duration: 0.35, ease: "easeOut" }} />
              </svg>
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Venda registrada</p>
              <p className="text-4xl font-semibold tracking-tight tabular-nums">{total}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
