"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/presentation/components/ui/dialog";
import { BarcodeScanner, type ScanOutcome } from "./barcode-scanner";

/** Tela cheia no celular; cartão central no desktop/tablet. */
export function ScannerDialog({
  open,
  onOpenChange,
  onDetect,
  outcome,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetect: (code: string) => void;
  outcome: ScanOutcome | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="inset-0 top-0 left-0 h-dvh max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-0 p-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[34rem] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
      >
        <DialogTitle className="sr-only">Leitor de código</DialogTitle>
        <DialogDescription className="sr-only">Use a câmera para ler QR Code ou código de barras</DialogDescription>
        {open && (
          <BarcodeScanner
            className="h-full"
            onDetect={onDetect}
            onClose={() => onOpenChange(false)}
            outcome={outcome}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
