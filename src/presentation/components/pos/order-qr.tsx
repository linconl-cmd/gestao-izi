"use client";

import { QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { orderQrValue } from "./order-success";

/** Reabre o QR de uma comanda em andamento (caso o cliente demore a chegar ao caixa). */
export function OrderQr({ id, number }: { id: string; number: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium hover:bg-muted"
      >
        <QrCode className="size-4" /> {open ? "Ocultar QR" : "Mostrar QR"}
      </button>
      {open && (
        <div className="mt-3 inline-block rounded-2xl bg-white p-3 shadow-soft">
          <QRCodeSVG value={orderQrValue(id)} size={176} level="M" marginSize={0} title={`Comanda ${number}`} />
        </div>
      )}
    </div>
  );
}
