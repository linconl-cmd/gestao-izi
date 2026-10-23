"use client";

import { useMemo, useState, useTransition } from "react";
import { registerSaleAction } from "@/presentation/actions/sales";
import { BarcodeScanner } from "@/presentation/components/scanner/barcode-scanner";
import { buttonClass, inputClass } from "@/presentation/components/shared/styles";
import { PAYMENT_LABELS } from "@/presentation/lib/labels";
import type { PosItem } from "@/presentation/lib/pos-catalog";
import { PAYMENT_METHODS, type PaymentMethod } from "@/core/domain/value-objects/payment-method";

const brl = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

type Cart = Record<string, number>; // variantId -> quantidade

export function PosTerminal({ catalog, cashRegisterId }: { catalog: PosItem[]; cashRegisterId: string }) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [payment, setPayment] = useState<PaymentMethod>("pix");
  const [discount, setDiscount] = useState("");
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(catalog.map((i) => [i.variantId, i])), [catalog]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter((i) => `${i.productName} ${i.label} ${i.sku} ${i.barcode ?? ""}`.toLowerCase().includes(q))
      .slice(0, 12);
  }, [catalog, query]);

  const lines = Object.entries(cart).flatMap(([id, quantity]) => {
    const item = byId.get(id);
    return item ? [{ item, quantity }] : [];
  });
  const subtotal = lines.reduce((sum, l) => sum + l.item.priceCents * l.quantity, 0);
  const discountCents = Math.min(Math.round(Number(discount.replace(",", ".") || 0) * 100) || 0, subtotal);
  const total = subtotal - discountCents;

  function add(variantId: string) {
    const item = byId.get(variantId);
    if (!item) return;
    setMessage(null);
    setCart((c) => {
      const next = (c[variantId] ?? 0) + 1;
      if (next > item.stock) {
        setMessage({ kind: "error", text: `Estoque insuficiente para ${item.productName} (${item.stock}).` });
        return c;
      }
      return { ...c, [variantId]: next };
    });
  }

  function setQty(variantId: string, quantity: number) {
    setCart((c) => {
      const { [variantId]: _removed, ...rest } = c;
      if (quantity <= 0) return rest;
      const max = byId.get(variantId)?.stock ?? quantity;
      return { ...rest, [variantId]: Math.min(quantity, max) };
    });
  }

  function onCode(raw: string) {
    const code = raw.trim().toLowerCase();
    const hit = catalog.find((i) => i.barcode?.toLowerCase() === code || i.sku.toLowerCase() === code);
    if (hit) add(hit.variantId);
    else setMessage({ kind: "error", text: `Código ${raw} não encontrado.` });
  }

  function finish() {
    setMessage(null);
    startTransition(async () => {
      const result = await registerSaleAction({
        cashRegisterId,
        paymentMethod: payment,
        discountCents,
        items: lines.map((l) => ({ variantId: l.item.variantId, quantity: l.quantity })),
      });
      if (result.ok) {
        setCart({});
        setDiscount("");
        setQuery("");
        setMessage({ kind: "ok", text: `Venda registrada: ${result.total}` });
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Leitor USB digita o código e envia Enter.
              if (e.key === "Enter" && query.trim()) {
                e.preventDefault();
                onCode(query);
                setQuery("");
              }
            }}
            autoFocus
            placeholder="Buscar produto, SKU ou ler código"
            className={`${inputClass} flex-1`}
          />
          <button type="button" onClick={() => setScanning((s) => !s)} className={buttonClass}>
            Câmera
          </button>
        </div>
        {scanning && <BarcodeScanner onDetect={onCode} onClose={() => setScanning(false)} />}
        <ul className="divide-y divide-zinc-200 rounded border border-zinc-200">
          {results.map((i) => (
            <li key={i.variantId}>
              <button
                type="button"
                disabled={i.stock <= 0}
                onClick={() => add(i.variantId)}
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-zinc-50 disabled:opacity-40"
              >
                <span>
                  {i.productName}
                  <span className="block text-xs text-zinc-500">{[i.label, i.sku].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="text-right text-sm">
                  {brl(i.priceCents)}
                  <span className="block text-xs text-zinc-500">{i.stock} un.</span>
                </span>
              </button>
            </li>
          ))}
          {query.trim() && results.length === 0 && <li className="px-3 py-2 text-sm text-zinc-500">Nada encontrado.</li>}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Carrinho</h2>
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"}
            className={`rounded px-3 py-2 text-sm ${message.kind === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
            {message.text}
          </p>
        )}
        {lines.length === 0 ? (
          <p className="text-sm text-zinc-500">Carrinho vazio.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded border border-zinc-200">
            {lines.map(({ item, quantity }) => (
              <li key={item.variantId} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-sm">
                  {item.productName}
                  <span className="block text-xs text-zinc-500">{[item.label, item.sku].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => setQty(item.variantId, quantity - 1)} className="px-2" aria-label="Diminuir">−</button>
                  <span className="w-6 text-center">{quantity}</span>
                  <button type="button" onClick={() => setQty(item.variantId, quantity + 1)} className="px-2" aria-label="Aumentar">+</button>
                  <span className="w-24 text-right text-sm">{brl(item.priceCents * quantity)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-2 gap-2">
          <select value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod)} className={inputClass}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>
            ))}
          </select>
          <input value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal"
            placeholder="Desconto (R$)" className={inputClass} />
        </div>

        <p className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{brl(total)}</span>
        </p>
        <button type="button" disabled={lines.length === 0 || pending} onClick={finish}
          className={`${buttonClass} disabled:opacity-40`}>
          {pending ? "Registrando…" : "Finalizar venda"}
        </button>
      </section>
    </div>
  );
}
