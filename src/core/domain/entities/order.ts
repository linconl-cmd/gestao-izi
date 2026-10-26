import { Money } from "../value-objects/money";

export type OrderStatus = "open" | "paid" | "cancelled" | "expired";

/** Item da comanda com os dados do catálogo no momento da leitura (preço sempre vigente). */
export interface OrderItem {
  readonly variantId: string;
  readonly quantity: number;
  readonly productName: string;
  readonly size: string | null;
  readonly color: string | null;
  readonly sku: string;
  readonly unitPrice: Money;
  readonly stock: number;
}

/** Pré-venda: o vendedor monta e o caixa (dono/gerente) recebe. */
export interface Order {
  readonly id: string;
  readonly storeId: string;
  readonly number: number;
  readonly sellerId: string;
  readonly status: OrderStatus;
  /** Sugestão do vendedor; quem aplica o desconto é o gerente no recebimento. */
  readonly suggestedDiscount: Money;
  readonly notes: string | null;
  /** Dia (Brasília) em que foi criada, AAAA-MM-DD. Comandas abertas expiram no dia seguinte. */
  readonly businessDate: string;
  readonly saleId: string | null;
  readonly cancelReason: string | null;
  readonly createdAt: Date;
  readonly closedAt: Date | null;
  readonly closedBy: string | null;
  readonly items: readonly OrderItem[];
}

export function orderSubtotal(order: Pick<Order, "items">): Money {
  return order.items.reduce((sum, i) => sum.add(i.unitPrice.times(i.quantity)), Money.zero());
}

/** Itens pedidos acima do estoque atual (o recebimento falharia por estoque insuficiente). */
export function itemsWithoutStock(order: Pick<Order, "items">): OrderItem[] {
  return order.items.filter((i) => i.quantity > i.stock);
}
