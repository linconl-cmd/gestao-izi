import type { CashRegister } from "../entities/cash-register";
import type { Money } from "../value-objects/money";

export interface CashRegisterRepository {
  findOpenByUser(userId: string): Promise<CashRegister | null>;
  findById(id: string): Promise<CashRegister | null>;
  open(input: { storeId: string; openedBy: string; openingAmount: Money }): Promise<CashRegister>;
  close(id: string, input: { closingAmount: Money; notes?: string | null }): Promise<CashRegister>;
  list(params?: { limit?: number; offset?: number }): Promise<CashRegister[]>;
}
