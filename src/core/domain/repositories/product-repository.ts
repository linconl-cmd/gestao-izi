import type { Product, ProductCost, ProductVariant } from "../entities/product";
import type { Barcode } from "../value-objects/barcode";
import type { Money } from "../value-objects/money";

export interface NewVariantInput {
  size?: string | null;
  color?: string | null;
  sku: string;
  barcode?: string | null;
  price?: Money | null;
  stockQuantity?: number;
  minStock?: number;
}

export interface NewProductInput {
  storeId: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  categoryId?: string | null;
  basePrice: Money;
  imageUrl?: string | null;
  costPrice?: Money | null;
  variants: NewVariantInput[];
}

export interface ProductPatch {
  name?: string;
  description?: string | null;
  brand?: string | null;
  categoryId?: string | null;
  basePrice?: Money;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface VariantPatch {
  size?: string | null;
  color?: string | null;
  sku?: string;
  barcode?: string | null;
  price?: Money | null;
  stockQuantity?: number;
  minStock?: number;
  isActive?: boolean;
}

export interface ProductSearchParams {
  query?: string;
  categoryId?: string;
  onlyActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  search(params?: ProductSearchParams): Promise<Product[]>;
  /** Retorna o produto contendo apenas a variante lida (leitura de QR/código de barras). */
  findByBarcode(barcode: Barcode): Promise<Product | null>;
  listLowStock(): Promise<Product[]>;
  create(input: NewProductInput): Promise<Product>;
  update(id: string, patch: ProductPatch): Promise<void>;
  addVariant(storeId: string, productId: string, input: NewVariantInput): Promise<ProductVariant>;
  updateVariant(id: string, patch: VariantPatch): Promise<ProductVariant>;
  /** Somente owner/master (RLS). */
  getCost(productId: string): Promise<ProductCost | null>;
  setCost(storeId: string, productId: string, cost: Money): Promise<void>;
}
