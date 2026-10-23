import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addVariantAction,
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
  const [{ id }, { error, ok }, { container }] = await Promise.all([params, searchParams, requireUser("owner")]);
  const product = await container.repositories.products.findById(id).catch(() => null);
  if (!product) notFound();
  const cost = await container.repositories.products.getCost(id);

  return (
    <div className="max-w-3xl">
      <Link href="/owner/products" className={linkButtonClass}>← Produtos</Link>
      <h1 className="mb-4 mt-2 text-xl font-semibold">{product.name}</h1>
      <Flash error={error} ok={ok} />

      <form action={updateProductAction} className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        <input type="hidden" name="productId" value={product.id} />
        <input name="name" required defaultValue={product.name} className={`${inputClass} col-span-2`} />
        <input name="brand" defaultValue={product.brand ?? ""} placeholder="Marca" className={inputClass} />
        <input name="basePrice" required inputMode="decimal" defaultValue={product.basePrice.toDecimal().toFixed(2)} className={inputClass} />
        <input name="costPrice" inputMode="decimal" placeholder="Custo (R$)"
          defaultValue={cost ? cost.costPrice.toDecimal().toFixed(2) : ""} className={inputClass} />
        <button type="submit" className={buttonClass}>Salvar</button>
      </form>
      <form action={setProductActiveAction} className="mb-8">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="isActive" value={String(!product.isActive)} />
        <button type="submit" className={linkButtonClass}>
          {product.isActive ? "Desativar produto" : "Reativar produto"}
        </button>
      </form>

      <h2 className="mb-2 text-lg font-semibold">Variantes</h2>
      <ul className="mb-8 divide-y divide-zinc-200 rounded border border-zinc-200">
        {product.variants.map((v) => (
          <li key={v.id} className="px-4 py-3">
            <p className="mb-2 text-sm">
              <strong>{v.sku}</strong> · {[v.size, v.color].filter(Boolean).join(" / ") || "—"}
              {v.barcode && <span className="text-zinc-500"> · {v.barcode}</span>}
            </p>
            <form action={updateVariantAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="variantId" value={v.id} />
              <label className="text-xs text-zinc-500">Estoque
                <input name="stockQuantity" type="number" min={0} defaultValue={v.stockQuantity} className={`${inputClass} block w-24`} />
              </label>
              <label className="text-xs text-zinc-500">Mínimo
                <input name="minStock" type="number" min={0} defaultValue={v.minStock} className={`${inputClass} block w-24`} />
              </label>
              <label className="text-xs text-zinc-500">Preço (vazio = base)
                <input name="variantPrice" inputMode="decimal" defaultValue={v.price ? v.price.toDecimal().toFixed(2) : ""} className={`${inputClass} block w-32`} />
              </label>
              <label className="text-xs text-zinc-500">Situação
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
        <input name="sku" required placeholder="SKU" className={inputClass} />
        <input name="barcode" placeholder="Código de barras" className={inputClass} />
        <input name="stockQuantity" type="number" min={0} defaultValue={0} className={inputClass} />
        <input name="minStock" type="number" min={0} defaultValue={0} className={inputClass} />
        <input name="variantPrice" inputMode="decimal" placeholder="Preço (opcional)" className={inputClass} />
        <button type="submit" className={buttonClass}>Adicionar</button>
      </form>
    </div>
  );
}
