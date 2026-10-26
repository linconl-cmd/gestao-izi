import type { CashRegister } from "@/core/domain/entities/cash-register";
import type { Category } from "@/core/domain/entities/category";
import type { Customer } from "@/core/domain/entities/customer";
import type { Notification } from "@/core/domain/entities/notification";
import type { Order, OrderItem } from "@/core/domain/entities/order";
import type { Product, ProductCost, ProductVariant } from "@/core/domain/entities/product";
import type { Profile } from "@/core/domain/entities/profile";
import type { Sale, SaleItem } from "@/core/domain/entities/sale";
import type { Store } from "@/core/domain/entities/store";
import { Money } from "@/core/domain/value-objects/money";
import type {
  CashRegisterRow,
  CategoryRow,
  CustomerRow,
  NotificationRow,
  OrderItemRow,
  OrderRow,
  ProductCostRow,
  ProductRow,
  ProfileRow,
  SaleItemRow,
  SaleRow,
  StoreRow,
  VariantRow,
} from "../types/rows";

export const toStore = (r: StoreRow): Store => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  document: r.document,
  email: r.email,
  phone: r.phone,
  address: r.address,
  isActive: r.is_active,
  createdAt: new Date(r.created_at),
});

export const toProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  storeId: r.store_id,
  role: r.role,
  fullName: r.full_name,
  email: r.email,
  avatarUrl: r.avatar_url,
  isActive: r.is_active,
});

export const toCategory = (r: CategoryRow): Category => ({
  id: r.id,
  storeId: r.store_id,
  parentId: r.parent_id,
  name: r.name,
});

export const toVariant = (r: VariantRow): ProductVariant => ({
  id: r.id,
  storeId: r.store_id,
  productId: r.product_id,
  size: r.size,
  color: r.color,
  sku: r.sku,
  barcode: r.barcode,
  price: r.price === null ? null : Money.fromDecimal(r.price),
  stockQuantity: r.stock_quantity,
  minStock: r.min_stock,
  isActive: r.is_active,
});

export const toProduct = (r: ProductRow, variants?: VariantRow[]): Product => ({
  id: r.id,
  storeId: r.store_id,
  categoryId: r.category_id,
  name: r.name,
  description: r.description,
  brand: r.brand,
  basePrice: Money.fromDecimal(r.base_price),
  imageUrl: r.image_url,
  isActive: r.is_active,
  variants: (variants ?? r.product_variants ?? []).map(toVariant),
});

export const toProductCost = (r: ProductCostRow): ProductCost => ({
  productId: r.product_id,
  costPrice: Money.fromDecimal(r.cost_price),
});

export const toCustomer = (r: CustomerRow): Customer => ({
  id: r.id,
  storeId: r.store_id,
  name: r.name,
  document: r.document,
  email: r.email,
  phone: r.phone,
  notes: r.notes,
});

export const toCashRegister = (r: CashRegisterRow): CashRegister => ({
  id: r.id,
  storeId: r.store_id,
  openedBy: r.opened_by,
  closedBy: r.closed_by,
  status: r.status,
  openingAmount: Money.fromDecimal(r.opening_amount),
  closingAmount: r.closing_amount === null ? null : Money.fromDecimal(r.closing_amount),
  expectedAmount: r.expected_amount === null ? null : Money.fromDecimal(r.expected_amount),
  notes: r.notes,
  openedAt: new Date(r.opened_at),
  closedAt: r.closed_at === null ? null : new Date(r.closed_at),
});

export const toSaleItem = (r: SaleItemRow): SaleItem => ({
  id: r.id,
  saleId: r.sale_id,
  variantId: r.variant_id,
  productName: r.product_name,
  variantLabel: r.variant_label,
  sku: r.sku,
  quantity: r.quantity,
  unitPrice: Money.fromDecimal(r.unit_price),
  discount: Money.fromDecimal(r.discount),
  total: Money.fromDecimal(r.total),
});

export const toSale = (r: SaleRow): Sale => ({
  id: r.id,
  storeId: r.store_id,
  sellerId: r.seller_id,
  receivedBy: r.received_by,
  cashRegisterId: r.cash_register_id,
  customerId: r.customer_id,
  paymentMethod: r.payment_method,
  status: r.status,
  subtotal: Money.fromDecimal(r.subtotal),
  discount: Money.fromDecimal(r.discount),
  total: Money.fromDecimal(r.total),
  notes: r.notes,
  createdAt: new Date(r.created_at),
  cancelledAt: r.cancelled_at === null ? null : new Date(r.cancelled_at),
  cancelledBy: r.cancelled_by,
  cancelReason: r.cancel_reason,
  items: (r.sale_items ?? []).map(toSaleItem),
});

export const toOrderItem = (r: OrderItemRow): OrderItem | null => {
  const v = r.product_variants;
  if (!v) return null;
  const base = v.products?.base_price ?? 0;
  return {
    variantId: r.variant_id,
    quantity: r.quantity,
    productName: v.products?.name ?? "Produto",
    size: v.size,
    color: v.color,
    sku: v.sku,
    unitPrice: Money.fromDecimal(v.price ?? base),
    stock: v.stock_quantity,
  };
};

export const toOrder = (r: OrderRow): Order => ({
  id: r.id,
  storeId: r.store_id,
  number: r.number,
  sellerId: r.seller_id,
  status: r.status,
  suggestedDiscount: Money.fromDecimal(r.suggested_discount),
  notes: r.notes,
  businessDate: r.business_date,
  saleId: r.sale_id,
  cancelReason: r.cancel_reason,
  createdAt: new Date(r.created_at),
  closedAt: r.closed_at === null ? null : new Date(r.closed_at),
  closedBy: r.closed_by,
  items: (r.order_items ?? []).flatMap((i) => toOrderItem(i) ?? []),
});

export const toNotification = (r: NotificationRow): Notification => ({
  id: r.id,
  storeId: r.store_id,
  kind: r.kind,
  title: r.title,
  body: r.body,
  createdAt: new Date(r.created_at),
  readAt: r.read_at === null ? null : new Date(r.read_at),
});
