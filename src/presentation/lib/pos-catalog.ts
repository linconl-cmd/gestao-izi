import "server-only";
import { effectivePrice } from "@/core/domain/entities/product";
import type { Container } from "@/infra/di/container";
import type { PosCatalog } from "./pos-types";

export async function loadPosCatalog(container: Container): Promise<PosCatalog> {
  const [products, categories] = await Promise.all([
    container.repositories.products.search({ onlyActive: true, limit: 1000 }),
    container.repositories.categories.list(),
  ]);

  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    products: products
      .map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        categoryId: p.categoryId,
        variants: p.variants
          .filter((v) => v.isActive)
          .map((v) => ({
            variantId: v.id,
            productId: p.id,
            productName: p.name,
            size: v.size,
            color: v.color,
            sku: v.sku,
            barcode: v.barcode,
            priceCents: effectivePrice(p, v).cents,
            stock: v.stockQuantity,
          })),
      }))
      .filter((p) => p.variants.length > 0),
  };
}
