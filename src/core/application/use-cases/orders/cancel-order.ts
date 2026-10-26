import { assertRole } from "../../authorization";
import type { AuthUser } from "../../ports/session-provider";
import type { OrderRepository } from "@/core/domain/repositories/order-repository";

/** Vendedor cancela só a própria (o banco confere); dono/gerente cancelam qualquer comanda aberta. */
export class CancelOrder {
  constructor(private readonly orders: OrderRepository) {}

  async execute(actor: AuthUser, orderId: string, reason?: string | null): Promise<void> {
    assertRole(actor, "owner", "manager", "seller");
    await this.orders.cancel(orderId, reason?.trim() || null);
  }
}
