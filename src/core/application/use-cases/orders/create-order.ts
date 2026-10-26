import { assertRole } from "../../authorization";
import type { AuthUser } from "../../ports/session-provider";
import { ValidationError } from "@/core/domain/errors/domain-error";
import type { Order } from "@/core/domain/entities/order";
import type { CreateOrderInput, OrderRepository } from "@/core/domain/repositories/order-repository";

export const MAX_QUANTITY = 999;

/** Pré-venda: o vendedor monta a comanda e sugere desconto; o gerente aplica no recebimento. */
export class CreateOrder {
  constructor(private readonly orders: OrderRepository) {}

  async execute(actor: AuthUser, input: CreateOrderInput): Promise<Order> {
    assertRole(actor, "owner", "manager", "seller");
    if (input.items.length === 0) throw new ValidationError("A comanda precisa de ao menos um item.");
    if (input.suggestedDiscount?.isNegative()) throw new ValidationError("O desconto não pode ser negativo.");

    const merged = new Map<string, number>();
    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > MAX_QUANTITY) {
        throw new ValidationError("Quantidade inválida.");
      }
      merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity);
    }

    return this.orders.create({
      ...input,
      items: [...merged].map(([variantId, quantity]) => ({ variantId, quantity })),
    });
  }
}
