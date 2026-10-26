import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addVariantAction,
  generateBarcodesAction,
  setProductActiveAction,
  updateProductAction,
  updateVariantAction,
} from "@/presentation/actions/catalog";
import { Flash } from "@/presentation/components/layout/app-shell";
import { buttonClass, inputClass, linkButtonClass } from "@/presentation/components/shared/styles";
import { requireUser } from "@/presentation/lib/require-user";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ id }, { error, ok }, { container, user }] = await Promise.all([params, searchParams, requireUser("owner", "manager")]);
  const product = await container.repositories.products.findById(id).catch(() => null);
  if (!product) notFound();
  // Custo e margem são exclusivos do dono (RLS em product_costs).
  const canSeeCost = user.role === "owner";
  const cost = canSeeCost ? await container.repositories.products.getCost(id) : null;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <Link href="/owner/products" className={linkButtonClass}>← Produtos</Link>
        <Link href={`/owner/labels?product=${product.id}`} className={linkButtonClass}>Imprimir etiquetas</Link>
      </div>
      <h1 className="mb-6 mt-2 text-2xl font-semibold tracking-tight">{product.name}</h1>
      <Flash error={error} ok={ok} />

      <form action={updateProductAction} className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        <input type="hidden" name="productId" value={product.id} />
        <input name="name" required defaultValue={product.name} className={`${inputClass} col-span-2`} />
        <input name="brand" defaultValue={product.brand ?? ""} placeholder="Marca" className={inputClass} />
        <input name="basePrice" required inputMode="decimal" defaultValue={product.basePrice.toDecimal().toFixed(2)} className={inputClass} />
        {canSeeCost && (
          <input name="costPrice" inputMode="decimal" placeholder="Custo (R$)"
            defaultValue={cost ? cost.costPrice.toDecimal().toFixed(2) : ""} className={inputClass} />
        )}
        <button type="submit" className={buttonClass}>Salvar</button>
      </form>
      <form action={setProductActiveAction} className="mb-8">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="isActive" value={String(!product.isActive)} />
        <button type="submit" className={linkButtonClass}>
          {product.isActive ? "Desativar produto" : "Reativar produto"}
        </button>
      </form>

      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Variantes</h2>
        {product.variants.some((v) => !v.barcode) && (
          <form action={generateBarcodesAction}>
            <input type="hidden" name="productId" value={product.id} />
            <button type="submit" className={linkButtonClass}>Gerar códigos de barras que faltam</button>
          </form>
        )}
      </div>
      <ul className="mb-8 divide-y divide-border overflow-hidden rounded-2xl border bg-card shadow-soft">
        {product.variants.map((v) => (
          <li key={v.id} className="px-4 py-3">
            <p className="mb-2 text-sm">
              <strong>{v.sku}</strong> · {[v.size, v.color].filter(Boolean).join(" / ") || "—"}
              {v.barcode && <span className="text-muted-foreground"> · {v.barcode}</span>}
            </p>
            <form action={updateVariantAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="variantId" value={v.id} />
              <label className="text-xs text-muted-foreground">Estoque
                <input name="stockQuantity" type="number" min={0} defaultValue={v.stockQuantity} className={`${inputClass} block w-24`} />
              </label>
              <label className="text-xs text-muted-foreground">Mínimo
                <input name="minStock" type="number" min={0} defaultValue={v.minStock} className={`${inputClass} block w-24`} />
              </label>
              <label className="text-xs text-muted-foreground">Preço (vazio = base)
                <input name="variantPrice" inputMode="decimal" defaultValue={v.price ? v.price.toDecimal().toFixed(2) : ""} className={`${inputClass} block w-32`} />
              </label>
              <label className="text-xs text-muted-foreground">Situação
                <select name="isActive" defaultValue={String(v.isActive)} className={`${inputClass} block`}>
                  <option value="true">Ativa</option>
                  <option value="false">Inativa</option>
                </select>
              </label>
              <button type="submit" className={buttonClass}>Salvar</button>
            </form>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 text-lg font-semibold">Nova variante</h2>
      <form action={addVariantAction} className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <input type="hidden" name="productId" value={product.id} />
        <input name="size" placeholder="Tamanho" className={inputClass} />
        <input name="color" placeholder="Cor" className={inputClass} />
        <input name="sku" placeholder="SKU (vazio = automático)" className={inputClass} />
        <input name="barcode" placeholder="Código de barras (vazio = gerar)" className={inputClass} />
        <input name="stockQuantity" type="number" min={0} defaultValue={0} className={inputClass} />
        <input name="minStock" type="number" min={0} defaultValue={0} className={inputClass} />
        <input name="variantPrice" inputMode="decimal" placeholder="Preço (opcional)" className={inputClass} />
        <button type="submit" className={buttonClass}>Adicionar</button>
      </form>
    </div>
  );
}
