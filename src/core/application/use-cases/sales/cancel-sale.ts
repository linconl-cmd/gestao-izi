import { assertRole } from "../../authorization";
import type { AuthUser } from "../../ports/session-provider";
import { ValidationError } from "@/core/domain/errors/domain-error";
import type { Sale } from "@/core/domain/entities/sale";
import type { SaleRepository } from "@/core/domain/repositories/sale-repository";

export const MIN_CANCEL_REASON = 3;

/** Dono e gerente cancelam; o motivo é obrigatório e quem/quando ficam gravados pelo banco. */
export class CancelSale {
  constructor(private readonly sales: SaleRepository) {}

  async execute(actor: AuthUser, saleId: string, reason: string): Promise<Sale> {
    assertRole(actor, "owner", "manager");
    const trimmed = reason.trim();
    if (trimmed.length < MIN_CANCEL_REASON) {
      throw new ValidationError("Informe o motivo do cancelamento.");
    }
    return this.sales.cancel(saleId, trimmed);
  }
}
