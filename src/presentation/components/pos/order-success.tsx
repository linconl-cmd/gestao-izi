"use client";

import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/presentation/components/ui/button";

/** Conteúdo do QR da comanda; o caixa lê com a câmera (ou digita o número). */
export const orderQrValue = (id: string) => `izi:order:${id}`;

/** Confirmação da pré-venda: número grande + QR para o caixa. Fecha só por toque (o QR precisa ser lido). */
export function OrderSuccess({
  order,
  onDone,
}: {
  order: { id: string; number: number } | null;
  onDone: () => void;
}) {
  return (
    <AnimatePresence>
      {order && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Comanda ${order.number} enviada ao caixa`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-background/95 p-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="flex w-full max-w-sm flex-col items-center gap-5 text-center"
          >
            <p className="text-sm font-medium text-success">Comanda enviada ao caixa</p>
            <p className="text-6xl font-semibold tracking-tight tabular-nums">#{order.number}</p>
            <div className="rounded-3xl bg-white p-4 shadow-float">
              <QRCodeSVG value={orderQrValue(order.id)} size={200} level="M" marginSize={0} />
            </div>
            <p className="text-sm text-muted-foreground">
              Mostre este QR ao caixa ou informe o número. O estoque só baixa quando o pagamento for recebido.
            </p>
            <Button size="lg" className="w-full" onClick={onDone}>
              Nova comanda
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
