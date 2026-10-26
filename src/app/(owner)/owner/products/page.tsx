import Link from "next/link";
import { isLowStock } from "@/core/domain/entities/product";
import { generateBarcodesAction } from "@/presentation/actions/catalog";
import { ProductGridForm } from "@/presentation/components/catalog/product-grid-form";
import { Flash } from "@/presentation/components/layout/app-shell";
import { buttonClass, inputClass, linkButtonClass } from "@/presentation/components/shared/styles";
import { requireUser } from "@/presentation/lib/require-user";

export default async function OwnerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; q?: string }>;
}) {
  const [{ error, ok, q }, { container, user }] = await Promise.all([searchParams, requireUser("owner", "manager")]);
  const [products, categories] = await Promise.all([
    container.repositories.products.search({ query: q, limit: 100 }),
    container.repositories.categories.list(),
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Produtos</h1>
        <Flash error={error} ok={ok} />
        <form action={generateBarcodesAction} className="mb-3">
          <button type="submit" className={linkButtonClass}>Gerar códigos de barras que faltam</button>
        </form>
        <form className="mb-4 flex gap-2">
          <input name="q" defaultValue={q} placeholder="Buscar por nome" className={`${inputClass} flex-1`} />
          <button type="submit" className={buttonClass}>Buscar</button>
        </form>
        {products.length === 0 ? (
          <p className="text-muted-foreground">Nenhum produto encontrado.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border bg-card shadow-soft">
            {products.map((p) => {
              const stock = p.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
              const low = p.variants.some((v) => v.isActive && isLowStock(v));
              return (
                <li key={p.id}>
                  <Link href={`/owner/products/${p.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/60">
                    <div>
                      <p className="font-medium">{p.name}{!p.isActive && " (inativo)"}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.brand ?? "—"} · {p.variants.length} variante(s)
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{p.basePrice.format()}</p>
                      <p className={low ? "text-destructive" : "text-muted-foreground"}>
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
        <ProductGridForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} canSeeCost={user.role === "owner"} />
      </section>
    </div>
  );
}
