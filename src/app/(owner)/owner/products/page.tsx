import Link from "next/link";
import { isLowStock } from "@/core/domain/entities/product";
import { createProductAction } from "@/presentation/actions/catalog";
import { Flash } from "@/presentation/components/layout/app-shell";
import { buttonClass, inputClass } from "@/presentation/components/shared/styles";
import { requireUser } from "@/presentation/lib/require-user";

export default async function OwnerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; q?: string }>;
}) {
  const [{ error, ok, q }, { container }] = await Promise.all([searchParams, requireUser("owner")]);
  const [products, categories] = await Promise.all([
    container.repositories.products.search({ query: q, limit: 100 }),
    container.repositories.categories.list(),
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section>
        <h1 className="mb-4 text-xl font-semibold">Produtos</h1>
        <Flash error={error} ok={ok} />
        <form className="mb-4 flex gap-2">
          <input name="q" defaultValue={q} placeholder="Buscar por nome" className={`${inputClass} flex-1`} />
          <button type="submit" className={buttonClass}>Buscar</button>
        </form>
        {products.length === 0 ? (
          <p className="text-zinc-500">Nenhum produto encontrado.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded border border-zinc-200">
            {products.map((p) => {
              const stock = p.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
              const low = p.variants.some((v) => v.isActive && isLowStock(v));
              return (
                <li key={p.id}>
                  <Link href={`/owner/products/${p.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50">
                    <div>
                      <p className="font-medium">{p.name}{!p.isActive && " (inativo)"}</p>
                      <p className="text-sm text-zinc-500">
                        {p.brand ?? "—"} · {p.variants.length} variante(s)
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{p.basePrice.format()}</p>
                      <p className={low ? "text-red-600" : "text-zinc-500"}>
                        {stock} em estoque{low && " · baixo"}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Novo produto</h2>
        <form action={createProductAction} className="flex flex-col gap-3">
          <input name="name" required placeholder="Nome" className={inputClass} />
          <input name="brand" placeholder="Marca" className={inputClass} />
          <select name="categoryId" className={inputClass} defaultValue="">
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input name="basePrice" required inputMode="decimal" placeholder="Preço (R$)" className={inputClass} />
            <input name="costPrice" inputMode="decimal" placeholder="Custo (R$)" className={inputClass} />
          </div>
          <p className="text-xs text-zinc-500">Primeira variante</p>
          <div className="grid grid-cols-2 gap-2">
            <input name="size" placeholder="Tamanho" className={inputClass} />
            <input name="color" placeholder="Cor" className={inputClass} />
            <input name="sku" required placeholder="SKU" className={inputClass} />
            <input name="barcode" placeholder="Código de barras" className={inputClass} />
            <input name="stockQuantity" type="number" min={0} defaultValue={0} placeholder="Estoque" className={inputClass} />
            <input name="minStock" type="number" min={0} defaultValue={0} placeholder="Estoque mín." className={inputClass} />
          </div>
          <input name="variantPrice" inputMode="decimal" placeholder="Preço da variante (opcional)" className={inputClass} />
          <button type="submit" className={buttonClass}>Criar produto</button>
        </form>
      </section>
    </div>
  );
}
