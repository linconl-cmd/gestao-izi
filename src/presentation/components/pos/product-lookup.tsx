"use client";

import { ScanLine, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { ScannerDialog } from "@/presentation/components/scanner/scanner-dialog";
import type { ScanOutcome } from "@/presentation/components/scanner/barcode-scanner";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { brl, variantLabel, type PosCatalog } from "@/presentation/lib/pos-types";
import { scanFeedback } from "@/presentation/lib/scan-feedback";

/** Consulta de preço/estoque (somente leitura). Um código lido filtra direto pelo item. */
export function ProductLookup({ catalog }: { catalog: PosCatalog }) {
  const [query, setQuery] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);

  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return catalog.products.slice(0, 30);
    return catalog.products.filter((p) => {
      const hay = `${p.name} ${p.brand ?? ""} ${p.variants.map((v) => `${v.sku} ${v.barcode ?? ""} ${v.color ?? ""} ${v.size ?? ""}`).join(" ")}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [catalog, query]);

  const onCode = useCallback(
    (raw: string) => {
      const code = raw.trim().toLowerCase();
      const hit = catalog.products.flatMap((p) => p.variants).find((v) => v.barcode?.toLowerCase() === code || v.sku.toLowerCase() === code);
      if (hit) {
        scanFeedback("success");
        setQuery(hit.sku);
        setOutcome({ id: Date.now(), kind: "success", text: `${hit.productName} ${variantLabel(hit)}`.trim() });
        setScanOpen(false);
      } else {
        scanFeedback("error");
        setOutcome({ id: Date.now(), kind: "error", text: `Código ${raw.trim()} não encontrado` });
      }
    },
    [catalog],
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome, SKU ou código" className="h-12 rounded-2xl pl-11" aria-label="Buscar produto" />
        </div>
        <Button size="lg" className="h-12 rounded-2xl" onClick={() => setScanOpen(true)} aria-label="Escanear">
          <ScanLine className="size-5" />
        </Button>
      </div>

      {results.length === 0 ? (
        <Card className="rounded-2xl p-8 text-center text-sm text-muted-foreground">Nada encontrado.</Card>
      ) : (
        <ul className="space-y-3">
          {results.map((p) => (
            <li key={p.id}>
              <Card className="gap-3 rounded-2xl p-4 shadow-soft">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium">{p.name}</h3>
                  <span className="text-xs text-muted-foreground">{p.brand}</span>
                </div>
                <ul className="divide-y">
                  {p.variants.map((v) => (
                    <li key={v.variantId} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span>
                        <strong className="font-semibold">{variantLabel(v) || "Único"}</strong>
                        <span className="ml-2 text-xs text-muted-foreground">{v.sku}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="font-semibold tabular-nums">{brl(v.priceCents)}</span>
                        <Badge variant={v.stock <= 0 ? "destructive" : "secondary"} className="rounded-full tabular-nums">
                          {v.stock <= 0 ? "Esgotado" : `${v.stock} un.`}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ScannerDialog open={scanOpen} onOpenChange={setScanOpen} onDetect={onCode} outcome={outcome} />
    </div>
  );
}
