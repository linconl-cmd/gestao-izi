import { assertRole } from "../../authorization";
import type { AuthUser } from "../../ports/session-provider";
import { ValidationError } from "@/core/domain/errors/domain-error";
import type { OrderRepository } from "@/core/domain/repositories/order-repository";
import { MAX_QUANTITY } from "./create-order";

/** Ajusta a quantidade de um item (0 remove) enquanto a comanda está aberta. */
export class SetOrderItem {
  constructor(private readonly orders: OrderRepository) {}

  async execute(actor: AuthUser, orderId: string, variantId: string, quantity: number): Promise<void> {
    assertRole(actor, "owner", "manager", "seller");
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY) {
      throw new ValidationError("Quantidade inválida.");
    }
    await this.orders.setItemQuantity(orderId, variantId, quantity);
  }
}
