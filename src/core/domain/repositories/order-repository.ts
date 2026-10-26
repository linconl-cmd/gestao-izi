import type { Order, OrderStatus } from "../entities/order";
import type { Money } from "../value-objects/money";
import type { PaymentMethod } from "../value-objects/payment-method";

export interface CreateOrderInput {
  items: { variantId: string; quantity: number }[];
  suggestedDiscount?: Money;
  notes?: string | null;
}

export interface PayOrderInput {
  orderId: string;
  cashRegisterId: string;
  paymentMethod: PaymentMethod;
  /** Nulo/ausente = usa o desconto sugerido pelo vendedor. */
  discount?: Money | null;
}

export interface OrderQuery {
  status?: OrderStatus;
  sellerId?: string;
  from?: Date;
  limit?: number;
}

export interface OrderRepository {
  create(input: CreateOrderInput): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByNumber(number: number): Promise<Order | null>;
  list(query?: OrderQuery): Promise<Order[]>;
  countOpen(): Promise<number>;
  /** quantity <= 0 remove o item. Só em comanda aberta. */
  setItemQuantity(orderId: string, variantId: string, quantity: number): Promise<void>;
  cancel(id: string, reason?: string | null): Promise<void>;
  /** Cria a venda no nome do vendedor, no caixa de quem recebe. Devolve o id da venda. */
  pay(input: PayOrderInput): Promise<string>;
  /** Expira comandas abertas de dias anteriores. Devolve quantas expiraram. */
  expireStale(): Promise<number>;
}
