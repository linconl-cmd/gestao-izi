import { assertRole } from "../../authorization";
import type { AuthUser } from "../../ports/session-provider";
import type { Sale } from "@/core/domain/entities/sale";
import type { SaleRepository } from "@/core/domain/repositories/sale-repository";

export class CancelSale {
  constructor(private readonly sales: SaleRepository) {}

  async execute(actor: AuthUser, saleId: string): Promise<Sale> {
    assertRole(actor, "owner");
    return this.sales.cancel(saleId);
  }
}
