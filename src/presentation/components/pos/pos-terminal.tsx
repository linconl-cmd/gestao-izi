"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ScanLine, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { PaymentMethod } from "@/core/domain/value-objects/payment-method";
import { registerSaleAction } from "@/presentation/actions/sales";
import { ScannerDialog } from "@/presentation/components/scanner/scanner-dialog";
import type { ScanOutcome } from "@/presentation/components/scanner/barcode-scanner";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/presentation/components/ui/sheet";
import { useCart } from "@/presentation/hooks/use-cart";
import { usePosShortcuts } from "@/presentation/hooks/use-pos-shortcuts";
import { scanFeedback } from "@/presentation/lib/scan-feedback";
import { variantLabel, type PosCatalog, type PosVariant } from "@/presentation/lib/pos-types";
import { cn } from "@/presentation/lib/utils";
import { CartFab } from "./cart-fab";
import { CartPanel } from "./cart-panel";
import { ProductCard, type Flash } from "./product-card";
import { SaleSuccess } from "./sale-success";

const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XGG"];
const sizeRank = (s: string) => {
  const i = SIZE_ORDER.indexOf(s.toUpperCase());
  if (i >= 0) return i;
  const n = Number(s);
  return Number.isFinite(n) ? 100 + n : 1000;
};

const parseMoneyToCents = (text: string) => Math.max(0, Math.round(Number(text.replace(",", ".") || 0) * 100) || 0);

export function PosTerminal({ catalog, cashRegisterId }: { catalog: PosCatalog; cashRegisterId: string }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const noticeId = useRef(0);

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>("pix");
  const [discount, setDiscount] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [notice, setNotice] = useState<ScanOutcome | null>(null);
  const [soldTotal, setSoldTotal] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const index = useMemo(
    () => new Map(catalog.products.flatMap((p) => p.variants.map((v) => [v.variantId, v] as const))),
    [catalog],
  );
  const cart = useCart(index);

  const sizes = useMemo(
    () => [...new Set(catalog.products.flatMap((p) => p.variants.map((v) => v.size).filter((s): s is string => !!s)))]
      .sort((a, b) => sizeRank(a) - sizeRank(b)),
    [catalog],
  );

  const visible = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return catalog.products.flatMap((p) => {
      if (categoryId && p.categoryId !== categoryId) return [];
      const variants = size ? p.variants.filter((v) => v.size === size) : p.variants;
      if (variants.length === 0) return [];
      if (terms.length > 0) {
        const hay = `${p.name} ${p.brand ?? ""} ${p.variants.map((v) => `${v.sku} ${v.barcode ?? ""} ${v.color ?? ""} ${v.size ?? ""}`).join(" ")}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return [];
      }
      return [{ ...p, variants }];
    });
  }, [catalog, query, categoryId, size]);

  const discountCents = Math.min(parseMoneyToCents(discount), cart.subtotalCents);

  // Avisos curtos (somem sozinhos).
  const say = useCallback((kind: ScanOutcome["kind"], text: string) => {
    setNotice({ id: ++noticeId.current, kind, text });
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) searchRef.current?.focus();
  }, []);

  const addVariant = useCallback(
    (v: PosVariant, source: "tap" | "scan") => {
      const result = cart.add(v.variantId);
      if (result === "added") {
        setFlash((f) => ({ variantId: v.variantId, n: (f?.n ?? 0) + 1 }));
        say("success", `${v.productName} ${variantLabel(v)} adicionado`.trim());
        if (source === "scan") scanFeedback("success");
        else navigator.vibrate?.(15);
      } else {
        say("error", `Sem estoque suficiente: ${v.productName} (${v.stock} un.)`);
        scanFeedback("error");
      }
    },
    [cart, say],
  );

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(t);
  }, [flash]);

  const onCode = useCallback(
    (raw: string): boolean => {
      const code = raw.trim().toLowerCase();
      const hit = [...index.values()].find((v) => v.barcode?.toLowerCase() === code || v.sku.toLowerCase() === code);
      if (hit) {
        addVariant(hit, "scan");
        return true;
      }
      say("error", `Código ${raw.trim()} não encontrado`);
      scanFeedback("error");
      return false;
    },
    [index, addVariant, say],
  );

  const finalize = useCallback(() => {
    if (cart.lines.length === 0 || pending) return;
    startTransition(async () => {
      const result = await registerSaleAction({
        cashRegisterId,
        paymentMethod: payment,
        discountCents,
        items: cart.lines.map((l) => ({ variantId: l.variant.variantId, quantity: l.quantity })),
      });
      if (result.ok) {
        cart.clear();
        setDiscount("");
        setQuery("");
        setCartOpen(false);
        setSoldTotal(result.total);
        scanFeedback("success");
      } else {
        say("error", result.error);
        scanFeedback("error");
      }
    });
  }, [cart, pending, cashRegisterId, payment, discountCents, say]);

  useEffect(() => {
    if (!soldTotal) return;
    const t = setTimeout(() => setSoldTotal(null), 2200);
    return () => clearTimeout(t);
  }, [soldTotal]);

  usePosShortcuts(
    {
      focusSearch: () => searchRef.current?.focus(),
      toggleScanner: () => setScanOpen((o) => !o),
      finalize,
    },
    !scanOpen && !cartOpen && !soldTotal,
  );

  const cartProps = {
    lines: cart.lines,
    subtotalCents: cart.subtotalCents,
    discount,
    discountCents,
    payment,
    pending,
    onDiscountChange: setDiscount,
    onPaymentChange: setPayment,
    onQuantity: cart.setQuantity,
    onClear: cart.clear,
    onFinalize: finalize,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
      <section className="min-w-0 space-y-4 pb-24 lg:pb-0">
        <div className="sticky top-14 z-20 -mx-4 space-y-3 bg-background/90 px-4 py-2 backdrop-blur md:top-0 md:-mx-8 md:px-8 lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setQuery("");
                  // Leitor USB digita o código e envia Enter.
                  if (e.key === "Enter" && query.trim()) {
                    e.preventDefault();
                    if (onCode(query)) setQuery("");
                  }
                }}
                placeholder="Buscar produto, SKU ou ler código"
                aria-label="Buscar produto"
                className="h-12 rounded-2xl pr-20 pl-11"
              />
              {query ? (
                <button type="button" aria-label="Limpar busca" onClick={() => setQuery("")}
                  className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted">
                  <X className="size-4" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:block">F2</kbd>
              )}
            </div>
            <Button size="lg" className="h-12 rounded-2xl px-4" onClick={() => setScanOpen(true)} aria-label="Abrir câmera para ler código">
              <ScanLine className="size-5" />
              <span className="hidden sm:inline">Escanear</span>
              <kbd className="hidden rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-medium lg:inline">Espaço</kbd>
            </Button>
          </div>

          {(catalog.categories.length > 0 || sizes.length > 0) && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
              <Chip active={!categoryId && !size} onClick={() => { setCategoryId(null); setSize(null); }}>Tudo</Chip>
              {catalog.categories.map((c) => (
                <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}>{c.name}</Chip>
              ))}
              {sizes.length > 0 && <span className="mx-1 w-px shrink-0 self-stretch bg-border" aria-hidden />}
              {sizes.map((s) => (
                <Chip key={s} active={size === s} onClick={() => setSize(size === s ? null : s)} mono>{s}</Chip>
              ))}
            </div>
          )}
        </div>

        {visible.length === 0 ? (
          <Card className="grid place-items-center rounded-2xl p-10 text-center text-sm text-muted-foreground">
            {catalog.products.length === 0 ? "Nenhum produto ativo cadastrado." : "Nenhum produto encontrado com esses filtros."}
          </Card>
        ) : (
          <motion.ul layout className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <AnimatePresence initial={false}>
              {visible.map((p) => (
                <motion.li key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  <ProductCard product={p} flash={flash} onAdd={(v) => addVariant(v, "tap")} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </section>

      {/* Desktop/tablet landscape: carrinho fixo à direita */}
      <aside className="hidden lg:block">
        <div className="sticky top-8 h-[calc(100dvh-4rem)]">
          <Card className="h-full overflow-hidden rounded-2xl p-0 shadow-soft">
            <CartPanel {...cartProps} showShortcuts />
          </Card>
        </div>
      </aside>

      {/* Mobile: botão flutuante + bottom sheet */}
      <CartFab count={cart.count} subtotalCents={cart.subtotalCents} onClick={() => setCartOpen(true)} />
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="h-[88dvh] gap-0 rounded-t-3xl p-0 lg:hidden">
          <SheetTitle className="sr-only">Carrinho</SheetTitle>
          <SheetDescription className="sr-only">Revise os itens e finalize a venda</SheetDescription>
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden />
          <CartPanel {...cartProps} />
        </SheetContent>
      </Sheet>

      <ScannerDialog open={scanOpen} onOpenChange={setScanOpen} onDetect={onCode} outcome={notice} />
      <SaleSuccess total={soldTotal} onDone={() => setSoldTotal(null)} />

      {/* Aviso flutuante (fora do leitor) */}
      <AnimatePresence>
        {notice && !scanOpen && (
          <motion.p
            key={notice.id}
            role={notice.kind === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            className={cn(
              "fixed top-16 left-1/2 z-[60] max-w-[calc(100%-2rem)] -translate-x-1/2 truncate rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-float md:top-6",
              notice.kind === "success" ? "bg-success" : "bg-destructive",
            )}
          >
            {notice.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chip({ active, mono, onClick, children }: { active: boolean; mono?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
        mono && "min-w-10 px-3 font-semibold",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
