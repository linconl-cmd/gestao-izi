/** DTOs serializáveis do PDV (compartilhados entre servidor e cliente; sem custo). */
export interface PosVariant {
  variantId: string;
  productId: string;
  productName: string;
  size: string | null;
  color: string | null;
  sku: string;
  barcode: string | null;
  priceCents: number;
  stock: number;
}

export interface PosProduct {
  id: string;
  name: string;
  brand: string | null;
  categoryId: string | null;
  variants: PosVariant[];
}

export interface PosCatalog {
  products: PosProduct[];
  categories: { id: string; name: string }[];
}

export function variantLabel(v: Pick<PosVariant, "size" | "color">): string {
  return [v.size, v.color].filter(Boolean).join(" · ");
}

export const brl = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
