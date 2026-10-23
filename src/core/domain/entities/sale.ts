import type { Money } from "../value-objects/money";
import type { PaymentMethod } from "../value-objects/payment-method";

export type SaleStatus = "completed" | "cancelled";

export interface SaleItem {
  readonly id: string;
  readonly saleId: string;
  readonly variantId: string;
  readonly productName: string;
  readonly variantLabel: string | null;
  readonly sku: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly discount: Money;
  readonly total: Money;
}

export interface Sale {
  readonly id: string;
  readonly storeId: string;
  readonly sellerId: string;
  readonly cashRegisterId: string;
  readonly customerId: string | null;
  readonly paymentMethod: PaymentMethod;
  readonly status: SaleStatus;
  readonly subtotal: Money;
  readonly discount: Money;
  readonly total: Money;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly items: readonly SaleItem[];
}
