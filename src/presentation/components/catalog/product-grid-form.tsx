"use client";

import { useState } from "react";
import { MAX_GRID_VARIANTS, parseList } from "@/core/domain/services/product-grid";
import { createProductGridAction } from "@/presentation/actions/catalog";
import { buttonClass, inputClass } from "@/presentation/components/shared/styles";

const PRESETS: { label: string; sizes: string }[] = [
  { label: "PP–GG", sizes: "PP, P, M, G, GG" },
  { label: "P–XG", sizes: "P, M, G, GG, XG" },
  { label: "Calça 36–46", sizes: "36, 38, 40, 42, 44, 46" },
  { label: "Infantil 2–12", sizes: "2, 4, 6, 8, 10, 12" },
  { label: "Único", sizes: "Único" },
];

/** Cadastro por grade: informa o modelo uma vez e gera todas as variações (tamanho × cor) com SKU e código de barras. */
export function ProductGridForm({
  categories,
  canSeeCost,
}: {
  categories: { id: string; name: string }[];
  canSeeCost: boolean;
}) {
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");
  const [stock, setStock] = useState(0);

  const nSizes = Math.max(1, parseList(sizes).length);
  const nColors = Math.max(1, parseList(colors).length);
  const total = nSizes * nColors;
  const tooMany = total > MAX_GRID_VARIANTS;

  return (
    <form action={createProductGridAction} className="flex flex-col gap-3">
      <input name="name" required placeholder="Nome (ex.: Camiseta Básica)" className={inputClass} />
      <input name="brand" placeholder="Marca" className={inputClass} />
      <select name="categoryId" className={inputClass} defaultValue="">
        <option value="">Sem categoria</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input name="basePrice" required inputMode="decimal" placeholder="Preço (R$)" className={inputClass} />
        {canSeeCost && <input name="costPrice" inputMode="decimal" placeholder="Custo (R$)" className={inputClass} />}
      </div>

      <fieldset className="space-y-2 rounded-xl border p-3">
        <legend className="px-1 text-xs font-medium text-muted-foreground">Grade</legend>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setSizes(p.sizes)}
              className="rounded-full border px-2.5 py-1 text-xs transition hover:bg-muted"
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          name="sizes"
          value={sizes}
          onChange={(e) => setSizes(e.target.value)}
          placeholder="Tamanhos separados por vírgula"
          className={inputClass}
        />
        <input
          name="colors"
          value={colors}
          onChange={(e) => setColors(e.target.value)}
          placeholder="Cores separadas por vírgula (ex.: Azul, Preto)"
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">Estoque inicial por variação
            <input
              name="stockQuantity"
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(Math.max(0, Number(e.target.value) || 0))}
              className={`${inputClass} mt-1 block w-full`}
            />
          </label>
          <label className="text-xs text-muted-foreground">Estoque mínimo
            <input name="minStock" type="number" min={0} defaultValue={0} className={`${inputClass} mt-1 block w-full`} />
          </label>
        </div>
        <p className={`text-xs ${tooMany ? "text-destructive" : "text-muted-foreground"}`}>
          {tooMany
            ? `${total} variações: o máximo por cadastro é ${MAX_GRID_VARIANTS}.`
            : `${total} variação(ões) · ${total * stock} peça(s) em estoque.`}
        </p>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="autoBarcode" defaultChecked className="size-4 accent-primary" />
        Gerar código de barras (EAN-13) para cada variação
      </label>
      <p className="text-xs text-muted-foreground">O SKU é gerado automaticamente (ex.: CAM-M-AZU).</p>
      <button type="submit" disabled={tooMany} className={`${buttonClass} disabled:opacity-50`}>Criar produto</button>
    </form>
  );
}
