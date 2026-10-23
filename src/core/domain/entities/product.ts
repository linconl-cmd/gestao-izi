import type { Money } from "../value-objects/money";

export interface ProductVariant {
  readonly id: string;
  readonly storeId: string;
  readonly productId: string;
  readonly size: string | null;
  readonly color: string | null;
  readonly sku: string;
  readonly barcode: string | null;
  /** Null = usa o preço base do produto. */
  readonly price: Money | null;
  readonly stockQuantity: number;
  readonly minStock: number;
  readonly isActive: boolean;
}

export interface Product {
  readonly id: string;
  readonly storeId: string;
  readonly categoryId: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly brand: string | null;
  readonly basePrice: Money;
  readonly imageUrl: string | null;
  readonly isActive: boolean;
  readonly variants: readonly ProductVariant[];
}

/** Custo é restrito ao owner (tabela product_costs). */
export interface ProductCost {
  readonly productId: string;
  readonly costPrice: Money;
}

export function effectivePrice(product: Pick<Product, "basePrice">, variant: ProductVariant): Money {
  return variant.price ?? product.basePrice;
}

export function isLowStock(variant: ProductVariant): boolean {
  return variant.stockQuantity <= variant.minStock;
}
