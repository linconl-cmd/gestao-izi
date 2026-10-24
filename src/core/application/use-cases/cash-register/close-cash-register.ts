import { assertRole } from "../../authorization";
import type { AuthUser } from "../../ports/session-provider";
import { ValidationError } from "@/core/domain/errors/domain-error";
import type { CashRegister } from "@/core/domain/entities/cash-register";
import type { CashRegisterRepository } from "@/core/domain/repositories/cash-register-repository";
import type { Money } from "@/core/domain/value-objects/money";

export class CloseCashRegister {
  constructor(private readonly registers: CashRegisterRepository) {}

  async execute(
    actor: AuthUser,
    registerId: string,
    input: { closingAmount: Money; notes?: string | null },
  ): Promise<CashRegister> {
    assertRole(actor, "owner", "manager", "seller");
    if (input.closingAmount.isNegative()) throw new ValidationError("Closing amount cannot be negative");
    return this.registers.close(registerId, input);
  }
}
