import type { Sale, SaleStatus } from "../entities/sale";
import type { Money } from "../value-objects/money";
import type { PaymentMethod } from "../value-objects/payment-method";

export interface CreateSaleItemInput {
  variantId: string;
  quantity: number;
  discount?: Money;
}

export interface CreateSaleInput {
  cashRegisterId: string;
  paymentMethod: PaymentMethod;
  items: CreateSaleItemInput[];
  customerId?: string | null;
  discount?: Money;
  notes?: string | null;
}

export interface SaleQuery {
  from?: Date;
  to?: Date;
  sellerId?: string;
  status?: SaleStatus;
  limit?: number;
  offset?: number;
}

export interface SaleSummary {
  /** Vendas concluídas (canceladas ficam de fora). */
  count: number;
  total: Money;
}

export interface SaleRepository {
  summarize(query?: Pick<SaleQuery, "from" | "to" | "sellerId">): Promise<SaleSummary>;
  /** Atômico (RPC create_sale): preço vem do catálogo e o estoque é baixado no banco. */
  create(input: CreateSaleInput): Promise<Sale>;
  findById(id: string): Promise<Sale | null>;
  list(query?: SaleQuery): Promise<Sale[]>;
  /** Somente owner (RLS). Estorna o estoque no banco. */
  cancel(id: string): Promise<Sale>;
}
