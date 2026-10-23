import "server-only";
import { effectivePrice } from "@/core/domain/entities/product";
import type { Container } from "@/infra/di/container";

/** DTO serializável (sem classes) para o terminal; nunca inclui custo. */
export interface PosItem {
  variantId: string;
  productName: string;
  label: string;
  sku: string;
  barcode: string | null;
  priceCents: number;
  stock: number;
}

export async function loadPosCatalog(container: Container): Promise<PosItem[]> {
  const products = await container.repositories.products.search({ onlyActive: true, limit: 1000 });
  return products.flatMap((p) =>
    p.variants
      .filter((v) => v.isActive)
      .map((v) => ({
        variantId: v.id,
        productName: p.name,
        label: [v.size, v.color].filter(Boolean).join(" / "),
        sku: v.sku,
        barcode: v.barcode,
        priceCents: effectivePrice(p, v).cents,
        stock: v.stockQuantity,
      })),
  );
}
