import { assertRole, requireStoreId } from "../../authorization";
import type { AuthUser } from "../../ports/session-provider";
import { ConflictError, ValidationError } from "@/core/domain/errors/domain-error";
import type { CashRegister } from "@/core/domain/entities/cash-register";
import type { CashRegisterRepository } from "@/core/domain/repositories/cash-register-repository";
import type { Money } from "@/core/domain/value-objects/money";

export class OpenCashRegister {
  constructor(private readonly registers: CashRegisterRepository) {}

  async execute(actor: AuthUser, openingAmount: Money): Promise<CashRegister> {
    assertRole(actor, "owner", "manager");
    if (openingAmount.isNegative()) throw new ValidationError("Opening amount cannot be negative");
    if (await this.registers.findOpenByUser(actor.id)) {
      throw new ConflictError("There is already an open cash register");
    }
    return this.registers.open({ storeId: requireStoreId(actor), openedBy: actor.id, openingAmount });
  }
}
