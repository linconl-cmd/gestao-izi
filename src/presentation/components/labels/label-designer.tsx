"use client";

import { Minus, Plus, Printer, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { LABEL_PRESETS, labelsPerPage, type LabelLayout } from "@/presentation/lib/label-presets";
import { brl, type PosCatalog, variantLabel } from "@/presentation/lib/pos-types";
import { cn } from "@/presentation/lib/utils";
import { codeOf, estimateModuleMm, type LabelOptions } from "./label-cell";
import { LabelSheet, type LabelSlot } from "./label-sheet";

const MAX_LABELS = 2000;

const LAYOUT_FIELDS: { key: keyof LabelLayout; label: string }[] = [
  { key: "widthMm", label: "Largura (mm)" },
  { key: "heightMm", label: "Altura (mm)" },
  { key: "columns", label: "Colunas" },
  { key: "rows", label: "Linhas" },
  { key: "marginTopMm", label: "Margem sup." },
  { key: "marginLeftMm", label: "Margem esq." },
  { key: "gapXMm", label: "Espaço horiz." },
  { key: "gapYMm", label: "Espaço vert." },
];

export function LabelDesigner({
  catalog,
  initial,
}: {
  catalog: PosCatalog;
  /** variantId -> quantidade (ex.: vindo de /owner/labels?product=ID). */
  initial: Record<string, number>;
}) {
  const [presetId, setPresetId] = useState(LABEL_PRESETS[0]!.id);
  const [layout, setLayout] = useState<LabelLayout>(LABEL_PRESETS[0]!.layout);
  const [options, setOptions] = useState<LabelOptions>({ showName: true, showSku: true, showPrice: true, code: "barcode", showCodeText: true });
  const [qty, setQty] = useState<Record<string, number>>(initial);
  const [skip, setSkip] = useState(0);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1.6);
  const [advanced, setAdvanced] = useState(false);

  const preset = LABEL_PRESETS.find((p) => p.id === presetId)!;
  const perPage = labelsPerPage(layout, preset.kind);

  const index = useMemo(
    () => new Map(catalog.products.flatMap((p) => p.variants.map((v) => [v.variantId, v] as const))),
    [catalog],
  );

  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    return catalog.products
      .filter((p) => {
        const hay = `${p.name} ${p.brand ?? ""} ${p.variants.map((v) => `${v.sku} ${v.barcode ?? ""} ${v.color ?? ""} ${v.size ?? ""}`).join(" ")}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      })
      .slice(0, 8);
  }, [catalog, query]);

  const selected = Object.entries(qty).flatMap(([id, n]) => {
    const v = index.get(id);
    return v ? [{ v, n }] : [];
  });
  const total = selected.reduce((s, x) => s + x.n, 0);

  const slots = useMemo<LabelSlot[]>(() => {
    const out: LabelSlot[] = preset.kind === "sheet" ? Array.from({ length: Math.min(skip, perPage - 1) }, () => null) : [];
    for (const { v, n } of selected) for (let i = 0; i < n; i++) out.push(v);
    return out;
  }, [selected, skip, preset.kind, perPage]);

  const pages = Math.ceil(slots.length / perPage);

  // Pior caso entre as etiquetas escolhidas: o código mais longo gera as barras mais finas.
  const thinnestBarMm = options.code === "barcode" && selected.length > 0
    ? Math.min(...selected.map(({ v }) => estimateModuleMm(codeOf(v), layout.widthMm, layout.heightMm)))
    : null;
  const barcodeTooSmall = thinnestBarMm !== null && thinnestBarMm < 0.17;

  function choosePreset(id: string) {
    const p = LABEL_PRESETS.find((x) => x.id === id)!;
    setPresetId(id);
    setLayout(p.layout);
    setSkip(0);
    setZoom(p.kind === "thermal" ? 1.6 : 0.6);
  }

  function setLayoutField(key: keyof LabelLayout, raw: string) {
    const n = Math.max(0, Number(raw.replace(",", ".")) || 0);
    setLayout((l) => {
      const next = { ...l, [key]: n };
      // Em térmica a página acompanha a etiqueta.
      if (preset.kind === "thermal") {
        next.pageWidthMm = next.widthMm;
        next.pageHeightMm = next.heightMm;
      }
      return next;
    });
  }

  const add = (id: string, n = 1) => setQty((q) => ({ ...q, [id]: Math.min(MAX_LABELS, (q[id] ?? 0) + n) }));
  const setN = (id: string, n: number) =>
    setQty((q) => {
      const { [id]: _removed, ...rest } = q;
      return n <= 0 ? rest : { ...rest, [id]: Math.min(MAX_LABELS, n) };
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[24rem_minmax(0,1fr)] print:block">
      <div className="space-y-5 print:hidden">
        {/* 1. Produtos */}
        <Card className="gap-3 rounded-2xl p-4 shadow-soft">
          <h2 className="font-semibold">1 · Produtos</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome, SKU ou código" className="pl-11" aria-label="Buscar produto" />
          </div>
          {results.length > 0 && (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {results.map((p) => (
                <li key={p.id} className="rounded-xl border p-2">
                  <p className="mb-1.5 truncate text-sm font-medium">{p.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.variants.map((v) => (
                      <button key={v.variantId} type="button" onClick={() => add(v.variantId)}
                        className="min-h-10 rounded-lg border px-3 text-sm font-medium transition-colors hover:border-primary hover:bg-accent-soft">
                        {variantLabel(v) || "Único"}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {selected.length > 0 && (
            <>
              <ul className="divide-y rounded-xl border">
                {selected.map(({ v, n }) => (
                  <li key={v.variantId} className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{v.productName}</p>
                      <p className="truncate text-xs text-muted-foreground">{variantLabel(v) || v.sku} · {brl(v.priceCents)}</p>
                    </div>
                    <div className="flex items-center rounded-xl border">
                      <button type="button" aria-label="Diminuir" onClick={() => setN(v.variantId, n - 1)} className="grid size-10 place-items-center rounded-l-xl hover:bg-muted">
                        <Minus className="size-4" />
                      </button>
                      <input
                        inputMode="numeric"
                        aria-label={`Quantidade de etiquetas de ${v.productName}`}
                        value={n}
                        onChange={(e) => setN(v.variantId, Math.floor(Number(e.target.value) || 0))}
                        className="h-10 w-12 bg-transparent text-center text-sm font-semibold tabular-nums outline-none"
                      />
                      <button type="button" aria-label="Aumentar" onClick={() => add(v.variantId)} className="grid size-10 place-items-center rounded-r-xl hover:bg-muted">
                        <Plus className="size-4" />
                      </button>
                    </div>
                    <button type="button" aria-label="Remover" onClick={() => setN(v.variantId, 0)} className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted">
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setQty(Object.fromEntries(selected.map(({ v }) => [v.variantId, Math.max(1, v.stock)])))}>
                  Qtd = estoque
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setQty({})}>Limpar</Button>
              </div>
            </>
          )}
        </Card>

        {/* 2. Papel */}
        <Card className="gap-3 rounded-2xl p-4 shadow-soft">
          <h2 className="font-semibold">2 · Papel</h2>
          <ul className="grid gap-2">
            {LABEL_PRESETS.map((p) => (
              <li key={p.id}>
                <button type="button" aria-pressed={p.id === presetId} onClick={() => choosePreset(p.id)}
                  className={cn("w-full rounded-xl border px-3 py-2 text-left transition-colors", p.id === presetId ? "border-primary bg-accent-soft" : "hover:bg-muted")}>
                  <span className="block text-sm font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{p.hint}</span>
                </button>
              </li>
            ))}
          </ul>
          {preset.kind === "sheet" && (
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                Pular posições
                <span className="block text-xs text-muted-foreground">Para reaproveitar folha já usada</span>
              </span>
              <Input inputMode="numeric" value={skip} onChange={(e) => setSkip(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="w-20 text-center" />
            </label>
          )}
          <button type="button" onClick={() => setAdvanced((a) => !a)} className="self-start text-sm text-muted-foreground underline underline-offset-4">
            {advanced ? "Ocultar medidas" : "Ajustar medidas"}
          </button>
          {advanced && (
            <div className="grid grid-cols-2 gap-2">
              {LAYOUT_FIELDS.filter((f) => preset.kind === "sheet" || f.key === "widthMm" || f.key === "heightMm").map((f) => (
                <label key={f.key} className="text-xs text-muted-foreground">
                  {f.label}
                  <Input inputMode="decimal" value={layout[f.key]} onChange={(e) => setLayoutField(f.key, e.target.value)} className="mt-1 h-10 text-foreground" />
                </label>
              ))}
            </div>
          )}
        </Card>

        {/* 3. Conteúdo */}
        <Card className="gap-3 rounded-2xl p-4 shadow-soft">
          <h2 className="font-semibold">3 · Conteúdo</h2>
          <Toggle label="Nome do produto" checked={options.showName} onChange={(v) => setOptions((o) => ({ ...o, showName: v }))} />
          <Toggle label="SKU (texto)" checked={options.showSku} onChange={(v) => setOptions((o) => ({ ...o, showSku: v }))} />
          <Toggle label="Preço" checked={options.showPrice} onChange={(v) => setOptions((o) => ({ ...o, showPrice: v }))} />
          <div className="grid grid-cols-3 gap-2">
            {([["barcode", "Barras"], ["qr", "QR Code"], ["none", "Sem código"]] as const).map(([value, text]) => (
              <button key={value} type="button" aria-pressed={options.code === value} onClick={() => setOptions((o) => ({ ...o, code: value }))}
                className={cn("min-h-11 rounded-xl border px-2 text-sm font-medium transition-colors", options.code === value ? "border-primary bg-accent-soft" : "hover:bg-muted")}>
                {text}
              </button>
            ))}
          </div>
          {options.code === "barcode" && (
            <Toggle label="Número sob as barras" checked={options.showCodeText} onChange={(v) => setOptions((o) => ({ ...o, showCodeText: v }))} />
          )}
        </Card>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="sticky top-14 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 bg-background/90 px-4 py-2 backdrop-blur md:top-0 md:-mx-8 md:px-8 lg:static lg:mx-0 lg:bg-transparent lg:p-0 print:hidden">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="secondary" className="rounded-full tabular-nums">{total} etiqueta{total === 1 ? "" : "s"}</Badge>
            {pages > 0 && <span className="text-muted-foreground">{pages} {preset.kind === "thermal" ? "etiqueta(s) no rolo" : `folha${pages === 1 ? "" : "s"}`}</span>}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Zoom
              <input type="range" min={0.3} max={2} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-24 accent-primary" />
            </label>
            <Button size="lg" disabled={slots.length === 0} onClick={() => window.print()}>
              <Printer className="size-5" /> Imprimir
            </Button>
          </div>
        </div>

        {slots.length === 0 ? (
          <Card className="grid place-items-center rounded-2xl p-12 text-center text-sm text-muted-foreground print:hidden">
            Busque um produto e toque no tamanho para adicionar etiquetas. A prévia aparece aqui.
          </Card>
        ) : (
          <>
            <p className="rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground print:hidden">
              No diálogo de impressão escolha <strong>escala 100%</strong> e <strong>margens: nenhuma</strong>
              {preset.kind === "thermal" ? `, e defina o papel como ${layout.widthMm} × ${layout.heightMm} mm no driver da impressora.` : "."}
              {" "}Imprima primeiro uma folha de teste em papel comum e confira o alinhamento.
            </p>
            {barcodeTooSmall && (
              <p role="alert" className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs">
                <strong>Código de barras apertado para {layout.widthMm} × {layout.heightMm} mm</strong> (barras de ~{thinnestBarMm!.toFixed(2)} mm): leitores podem falhar.
                Use <strong>QR Code</strong>, uma etiqueta maior ou um código de barras mais curto.
              </p>
            )}
            <div className="overflow-auto rounded-2xl bg-muted/50 p-4 print:overflow-visible print:bg-transparent print:p-0">
              <LabelSheet slots={slots} layout={layout} kind={preset.kind} options={options} zoom={zoom} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 text-sm">
      {label}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-primary" />
    </label>
  );
}
