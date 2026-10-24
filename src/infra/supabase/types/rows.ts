// Linhas como o PostgREST as devolve. Substituível por `supabase gen types typescript`
// quando o projeto Supabase existir; mappers.ts é o único consumidor.

import type { PaymentMethod } from "@/core/domain/value-objects/payment-method";
import type { UserRole } from "@/core/domain/value-objects/user-role";

export interface StoreRow {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  store_id: string | null;
  role: UserRole;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export interface CategoryRow {
  id: string;
  store_id: string;
  parent_id: string | null;
  name: string;
}

export interface VariantRow {
  id: string;
  store_id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  sku: string;
  barcode: string | null;
  price: number | null;
  stock_quantity: number;
  min_stock: number;
  is_active: boolean;
}

export interface ProductRow {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  base_price: number;
  image_url: string | null;
  is_active: boolean;
  product_variants?: VariantRow[];
}

export interface ProductCostRow {
  product_id: string;
  cost_price: number;
}

export interface CustomerRow {
  id: string;
  store_id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export interface CashRegisterRow {
  id: string;
  store_id: string;
  opened_by: string;
  closed_by: string | null;
  status: "open" | "closed";
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface SaleItemRow {
  id: string;
  sale_id: string;
  variant_id: string;
  product_name: string;
  variant_label: string | null;
  sku: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

export interface SaleRow {
  id: string;
  store_id: string;
  seller_id: string;
  cash_register_id: string;
  customer_id: string | null;
  payment_method: PaymentMethod;
  status: "completed" | "cancelled";
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  sale_items?: SaleItemRow[];
}
