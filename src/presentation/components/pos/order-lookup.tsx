"use client";

import { ScanLine, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { lookupOrderAction } from "@/presentation/actions/orders";
import type { ScanOutcome } from "@/presentation/components/scanner/barcode-scanner";
import { ScannerDialog } from "@/presentation/components/scanner/scanner-dialog";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { scanFeedback } from "@/presentation/lib/scan-feedback";

/** Abre a comanda pelo número (#12) ou lendo o QR que o vendedor mostra. */
export function OrderLookup() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = useCallback(
    (code: string, fromScan: boolean) => {
      startTransition(async () => {
        const result = await lookupOrderAction(code);
        if (result.ok) {
          if (fromScan) scanFeedback("success");
          setScanOpen(false);
          router.push(`/owner/orders/${result.id}`);
        } else {
          scanFeedback("error");
          setError(result.error);
          setOutcome({ id: Date.now(), kind: "error", text: result.error });
        }
      });
    },
    [router],
  );

  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (value.trim()) open(value, false);
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="numeric"
            placeholder="Número da comanda (ex.: 12) ou leia o QR"
            aria-label="Número da comanda"
            className="h-12 rounded-2xl pl-11"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 rounded-2xl" disabled={pending || !value.trim()}>
          Abrir
        </Button>
        <Button type="button" size="lg" variant="outline" className="h-12 rounded-2xl" onClick={() => { setError(null); setScanOpen(true); }} aria-label="Ler QR da comanda">
          <ScanLine className="size-5" />
        </Button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}

      <ScannerDialog open={scanOpen} onOpenChange={setScanOpen} onDetect={(code) => open(code, true)} outcome={outcome} />
    </div>
  );
}
