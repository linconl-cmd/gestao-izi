import type { Money } from "../value-objects/money";

export type CashRegisterStatus = "open" | "closed";

export interface CashRegister {
  readonly id: string;
  readonly storeId: string;
  readonly openedBy: string;
  readonly closedBy: string | null;
  readonly status: CashRegisterStatus;
  readonly openingAmount: Money;
  readonly closingAmount: Money | null;
  /** Abertura + vendas em dinheiro; calculado pelo banco no fechamento. */
  readonly expectedAmount: Money | null;
  readonly notes: string | null;
  readonly openedAt: Date;
  readonly closedAt: Date | null;
}
